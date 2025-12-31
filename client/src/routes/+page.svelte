<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fetchEvents } from '$lib/config/api';

	let minimapElement;
	let minimap;
	let events = [];
	let loading = false;
	let userLocation = null;

	async function fetchAllEvents() {
		loading = true;
		try {
			const result = await fetchEvents({ limit: 100 });
			if (result.success) {
				const rawEvents = result.data || [];
				events = rawEvents.filter(
					(event) =>
						event &&
						event.$id &&
						event.title &&
						event.startdate &&
						event.enddate &&
						event.location &&
						event.location.latitude &&
						event.location.longitude
				);
			} else {
				throw new Error(result.error || 'Failed to fetch events');
			}
		} catch (error) {
			console.error('Error fetching events:', error);
		} finally {
			loading = false;
		}
	}

	function calculateDistance(lat1, lng1, lat2, lng2) {
		const R = 3959; // Earth's radius in miles
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLng = ((lng2 - lng1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	function getUserLocation() {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error('Geolocation is not supported'));
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					userLocation = {
						lat: position.coords.latitude,
						lng: position.coords.longitude
					};
					resolve(userLocation);
				},
				(error) => {
					console.warn('Could not get user location:', error);
					// Fallback to Los Angeles
					resolve({ lat: 34.0522, lng: -118.2437 });
				},
				{
					timeout: 5000,
					enableHighAccuracy: true
				}
			);
		});
	}

	async function initializeMinimap() {
		if (!browser || !window.L || !minimapElement) return;

		try {
			// Get user location first
			const location = await getUserLocation();

			minimap = window.L.map(minimapElement, {
				center: [location.lat, location.lng],
				zoom: userLocation ? 10 : 7, // Zoom closer if we have user location
				zoomControl: true,
				attributionControl: false,
				dragging: true,
				touchZoom: true,
				doubleClickZoom: true,
				scrollWheelZoom: true,
				boxZoom: true,
				keyboard: true
			});

			window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
				maxZoom: 19
			}).addTo(minimap);

			// Add event markers
			const eventIcon = window.L.icon({
				iconUrl: '/pinRed.png',
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34]
			});

			events.forEach((event) => {
				if (event.location && event.location.latitude && event.location.longitude) {
					const marker = window.L.marker([event.location.latitude, event.location.longitude], {
						icon: eventIcon
					}).addTo(minimap);

					const startDate = new Date(event.startdate).toLocaleDateString();
					marker.bindPopup(`
						<div class="popup-content">
							<h4>${event.title}</h4>
							<p>${event.type}</p>
							<p>${startDate}</p>
						</div>
					`);
				}
			});
		} catch (error) {
			console.error('Error initializing minimap:', error);
		}
	}

	onMount(async () => {
		if (!browser) return;

		// Wait for Leaflet to load
		let attempts = 0;
		const maxAttempts = 50;
		while (attempts < maxAttempts && (!window.L || !window.L.map)) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			attempts++;
		}

		if (window.L && window.L.map) {
			// Get user location first, then fetch events and initialize map
			try {
				await getUserLocation();
			} catch (error) {
				console.warn('Could not get user location, using default');
			}
			await fetchAllEvents();
			setTimeout(() => initializeMinimap(), 100);
		}
	});
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""
	/>
	<script
		src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
		integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
		crossorigin=""
	></script>
</svelte:head>

<div class="main">
	<!-- <div class="spacer" style="height:70px; width: 100%;"></div> -->
	<div class="home">
		<div class="title"><img src="capa-logo.png" /></div>
		<div class="subtitle">California Aviation Photography Alliance</div>
		<img class="homeImg" src="homescreen-dabyt.jpg" alt="Home screen image" />
		<div class="infocard">Photo by @Barlius</div>
	</div>
	<div class="content-section">
		<div class="featured-wiki">
			<div class="wiki-box">
				<a
					class="wiki-link"
					href="https://wiki.capacommunity.net/guides/airport-photography"
					target="_blank"
					rel="noopener noreferrer"
				>
					Read More
				</a>
				<div class="wiki-content">
					<div class="wiki-header">
						<div class="wiki-text-content">
							<h2>Featured Wiki Article</h2>
							<p class="wiki-subtitle">Airport Photography Guide</p>
						</div>
					</div>
					<div class="wiki-image">
						<img src="homescreen-dabyt.jpg" alt="Featured article image" />
					</div>
				</div>
			</div>
		</div>
		<div class="nearby-events">
			<div class="events-box">
				<div class="events-header">
					<h2>Events Map</h2>
					<a class="view-all-link" href="/map">View Full Map</a>
				</div>
				<div class="minimap-container">
					<div bind:this={minimapElement} class="minimap"></div>
					{#if loading}
						<div class="minimap-loading">Loading events...</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.content-section {
		position: absolute;
		top: 470px;
		width: 100%;
		height: calc(100vh - 490px);
		display: flex;
		gap: 20px;
		padding: 20px;
		box-sizing: border-box;
	}
	.featured-wiki {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}
	.nearby-events {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}
	.wiki-box {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		width: 100%;
		height: 100%;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(10px);
		padding: 30px;
		box-sizing: border-box;
		position: relative;
		z-index: 100;
	}
	.wiki-content {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 20px;
	}
	.wiki-header {
		display: flex;
		justify-content: flex-start;
		align-items: flex-start;
		gap: 20px;
		margin-bottom: 20px;
	}
	.wiki-text-content {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.wiki-content h2 {
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-size: 2em;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}
	.wiki-subtitle {
		color: var(--color-capa-orange);
		font-family: 'eurostile', sans-serif;
		font-size: 1.1em;
		margin: 0;
		font-style: italic;
	}
	.wiki-link {
		position: absolute;
		top: 20px;
		right: 20px;
		background-color: var(--color-capa-orange);
		color: var(--color-capa-white);
		padding: 12px 24px;
		border-radius: 25px;
		text-decoration: none;
		font-family: 'eurostile', sans-serif;
		font-size: 1.1em;
		transition: background-color 0.3s ease;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
		white-space: nowrap;
		z-index: 101;
		cursor: pointer;
		display: inline-block;
	}
	.wiki-link:hover {
		background-color: var(--color-capa-red);
	}
	.wiki-image {
		flex: 1;
		border-radius: 15px;
		overflow: hidden;
		min-height: 200px;
		margin-top: 10px;
	}
	.wiki-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 15px;
	}
	.events-box {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		width: 100%;
		height: 100%;
		padding: 30px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(10px);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		position: relative;
		z-index: 100;
	}
	.events-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.events-header h2 {
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-size: 1.8em;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}
	.view-all-link {
		color: var(--color-capa-orange);
		text-decoration: none;
		font-family: 'eurostile', sans-serif;
		font-size: 1em;
		transition: color 0.3s ease;
	}
	.view-all-link:hover {
		color: var(--color-capa-red);
	}
	.minimap-container {
		position: relative;
		width: 100%;
		flex: 1;
		border-radius: 15px;
		overflow: hidden;
	}
	.minimap {
		width: 100%;
		height: 100%;
		border-radius: 15px;
	}
	.minimap-loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		background: rgba(0, 0, 0, 0.8);
		padding: 10px 20px;
		border-radius: 5px;
	}

	.main {
		height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
	}
	.about {
		height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.home {
		position: absolute;
		top: 70px;
		text-align: center;
		width: 100%;
	}

	.title {
		width: 100%;
		font-size: 5em;
		z-index: 1;
		position: absolute;
		top: 200px;
		left: 50%;
		transform: translate(-50%, -50%);
		backdrop-filter: blur(10);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}
	.subtitle {
		width: 100%;
		font-size: 3em;
		z-index: 1;
		position: absolute;
		top: 300px;
		left: 50%;
		transform: translate(-50%, -50%);
		backdrop-filter: blur(10);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	/* @media (max-width: 1000px) {
		.title {
			font-size: 3em;
		}
		.subtitle {
			font-size: 1.5em;
		}

	} */

	@media (max-width: 700px) {
		.title {
			font-size: 3em;
		}
		.subtitle {
			font-size: 1.5em;
		}
		.content-section {
			flex-direction: column;
			height: auto;
			gap: 10px;
			top: 420px;
		}
		.wiki-box {
			padding: 20px;
		}
		.wiki-header {
			flex-direction: column;
			align-items: flex-start;
			margin-bottom: 10px;
		}
		.wiki-link {
			position: relative;
			top: 0;
			right: 0;
			margin-top: 10px;
			margin-bottom: 10px;
		}
		.wiki-content h2 {
			font-size: 1.5em;
		}
		.wiki-subtitle {
			font-size: 0.9em;
		}
		.wiki-image {
			min-height: 150px;
		}
		.events-box {
			padding: 20px;
		}
		.events-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
		}
		.events-header h2 {
			font-size: 1.5em;
		}
		.minimap-container {
			min-height: 250px;
			height: 250px;
		}
		.events-box {
			height: auto;
			min-height: 300px;
		}
	}

	.homeImg {
		width: 100%;
		height: 400px;
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		opacity: 30%;
	}
	.infocard {
		position: absolute;
		top: 340px;
		right: 10px;
		color: white;
		font-size: 1.2em;
		z-index: 2;
		border-radius: 25px;
		padding: 10px;
		background: rgba(0, 0, 0, 0.1);
	}
</style>
