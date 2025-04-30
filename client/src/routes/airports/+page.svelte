<script>
	import { onMount } from 'svelte';
	import airports from '$lib/data/airports-california.json';
	let mapElement;
	let searchTerm = '';
	let map;
	let markers = [];

	// Filter airports based on the search term
	$: filteredAirports = Object.entries(airports).filter(([code, airport]) => {
		if (airport.state !== 'California') return false;

		if (!searchTerm) return true;

		const searchLower = searchTerm.toLowerCase();
		return (
			airport.name.toLowerCase().includes(searchLower) ||
			airport.icao.toLowerCase().includes(searchLower) ||
			airport.city.toLowerCase().includes(searchLower)
		);
	});

	// Update map markers when filter changes
	$: if (map && markers.length > 0) {
		updateMapMarkers(filteredAirports);
	}

	function updateMapMarkers(airportEntries) {
		// Clear existing markers
		markers.forEach((marker) => map.removeLayer(marker));
		markers = [];

		airportEntries.forEach(([code, airport]) => {
			if (airport.lat && airport.lon) {
				const marker = L.marker([airport.lat, airport.lon]).addTo(map);
				marker.bindPopup(`
					<div class="popup-content">
						<h3>${airport.name}</h3>
						<p>${airport.city}, ${airport.state}</p>
						<a href="/airports/${airport.icao}" class="popup-link">View details</a>
					</div>
				`);
				markers.push(marker);
			}
		});
	}

	onMount(() => {
		if (typeof L !== 'undefined') {
			map = L.map(mapElement, {}).setView([37.7749, -122.4194], 7); // Centered on California

			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution:
					'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
			}).addTo(map);

			// Initialize markers
			filteredAirports.forEach(([code, airport]) => {
				if (airport.lat && airport.lon) {
					const marker = L.marker([airport.lat, airport.lon]).addTo(map);
					marker.bindPopup(`
						<div class="popup-content">
							<h3>${airport.name}</h3>
							<p>${airport.city}, ${airport.state}</p>
							<a href="/airports/${airport.icao}" class="popup-link">View details</a>
						</div>
					`);
					markers.push(marker);
				}
			});
		}
	});
</script>

<div class="content-container">
	<div class="container">
		<div class="map-container">
			<div bind:this={mapElement} class="map"></div>
		</div>

		<div class="airport-list">
			<div class="header-search">
				<h2>Airport Directory</h2>
				<div class="search-container">
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search airports by name, code or city"
						class="search-input"
					/>
					{#if searchTerm}
						<button class="clear-button" on:click={() => (searchTerm = '')}>×</button>
					{/if}
				</div>
			</div>

			<div class="results-count">
				Showing {filteredAirports.length} airports
				{#if searchTerm}
					matching "{searchTerm}"
				{/if}
			</div>

			<ul>
				{#each filteredAirports as [code, airport]}
					<li>
						<a href="/airports/{airport.icao}">
							<span class="airport-name">{airport.name}</span>
							<span class="airport-details">
								<span class="airport-code">{airport.icao}</span>
								<span class="airport-city">{airport.city}</span>
							</span>
						</a>
					</li>
				{:else}
					<li class="no-results">No airports found matching your search</li>
				{/each}
			</ul>
		</div>
		<h1>Airport not listed? Contact us</h1>
	</div>
</div>

<style>
	.content-container {
		padding-top: 70px; /* Adjust based on your navbar height */
		min-height: 100vh;
		background-color: #f5f5f7;
	}

	.container {
		padding: 0 2rem 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.map-container {
		height: 500px;
		width: 100%;
		margin-bottom: 2rem;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		position: relative;
		z-index: 1; /* Ensure map is below navbar */
	}

	.map {
		height: 100%;
		width: 100%;
		background-color: #f0f0f0;
	}

	.airport-list {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.header-search {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.airport-list h2 {
		margin: 0;
		color: #3e4163;
	}

	.search-container {
		position: relative;
		flex-grow: 1;
		max-width: 400px;
	}

	.search-input {
		width: 100%;
		padding: 8px 30px 8px 12px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 16px;
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #3e4163;
	}

	.clear-button {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		font-size: 18px;
		color: #999;
		cursor: pointer;
		padding: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.clear-button:hover {
		color: #333;
	}

	.results-count {
		margin-bottom: 1rem;
		color: #666;
		font-size: 0.9rem;
	}

	.airport-list ul {
		list-style-type: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	.airport-list li a {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		background-color: #f8f9fa;
		border-radius: 6px;
		text-decoration: none;
		color: #333;
		border-left: 6px solid #3e4163;
		transition: all 0.2s ease;
	}

	.airport-list li a:hover {
		background-color: #e9ecef;
		transform: translateY(-2px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.airport-name {
		font-weight: bold;
		margin-bottom: 0.25rem;
	}

	.airport-details {
		display: flex;
		justify-content: space-between;
	}

	.airport-code {
		color: #666;
		font-size: 0.9rem;
		font-weight: bold;
	}

	.airport-city {
		color: #666;
		font-size: 0.9rem;
	}

	.no-results {
		grid-column: 1 / -1;
		padding: 2rem;
		text-align: center;
		color: #666;
		background-color: #f8f9fa;
		border-radius: 6px;
	}

	:global(.popup-content) {
		padding: 5px;
		text-align: center;
	}

	:global(.popup-content h3) {
		margin: 0 0 5px 0;
		font-size: 16px;
	}

	:global(.popup-link) {
		display: inline-block;
		margin-top: 8px;
		padding: 3px 8px;
		color: white;
		text-decoration: none;
		border-radius: 3px;
		font-size: 12px;
		border: 2px solid #3e4163;
	}

	:global(.popup-link:hover) {
		background: #eee;
	}

	/* Fix z-index issues with map controls */
	:global(.leaflet-bottom),
	:global(.leaflet-top) {
		z-index: 900 !important; /* Lower than navbar's z-index */
	}

	:global(.leaflet-control-attribution),
	:global(.leaflet-control-zoom) {
		z-index: 900 !important;
	}
</style>
