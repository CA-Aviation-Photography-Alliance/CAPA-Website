<script>
	import { onMount } from 'svelte';

	export let data;
	const { airport } = data;

	let mapElement;

	onMount(() => {
		if (typeof L !== 'undefined') {
			const map = L.map(mapElement).setView([airport.lat, airport.lon], 13);

			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution:
					'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
			}).addTo(map);

			const marker = L.marker([airport.lat, airport.lon]).addTo(map);
			marker.bindPopup(`<b>${airport.name}</b><br>${airport.code}/${airport.icao}`).openPopup();
		}
	});
</script>

<div class="content-container">
	<div class="airport-detail">
		<h1>{airport.name} ({airport.icao})</h1>

		<div class="airport-info">
			<p><strong>FAA Code:</strong> {airport.code || 'N/A'}</p>
			<p><strong>ICAO:</strong> {airport.icao}</p>
			<p><strong>Location:</strong> {airport.city}, {airport.state}</p>
		</div>

		<div class="map-container">
			<div bind:this={mapElement} class="map"></div>
		</div>

		<a href="/airports" class="back-link">Back to all airports</a>
	</div>
</div>

<style>
	.content-container {
		padding-top: 70px; /* Adjust based on your navbar height */
		min-height: 100vh;
	}

	.airport-detail {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	h1 {
		color: #333;
		margin-bottom: 1.5rem;
	}

	.airport-info {
		margin-bottom: 2rem;
	}

	.map-container {
		height: 500px;
		width: 100%;
		margin-bottom: 2rem;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.map {
		height: 100%;
		width: 100%;
		background-color: #f0f0f0;
	}

	.back-link {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background-color: #3e4163;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		font-weight: bold;
		transition: background-color 0.2s;
	}

	.back-link:hover {
		background-color: #2d304a;
	}
</style>
