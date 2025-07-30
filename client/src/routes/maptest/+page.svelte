<script>
	import { onMount } from 'svelte';

	let mapElement;
	let map;
	let status = 'Initializing...';

	onMount(async () => {
		// Ensure we're in the browser
		if (typeof window === 'undefined') {
			status = 'ERROR: Running on server side';
			return;
		}

		try {
			status = 'Waiting for Leaflet...';

			// Wait for Leaflet to be available
			let attempts = 0;
			while (typeof L === 'undefined' && attempts < 50) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				attempts++;
			}

			if (typeof L === 'undefined') {
				status = 'ERROR: Leaflet not loaded';
				return;
			}

			status = 'Leaflet loaded, waiting for DOM...';

			// Wait for element to be ready
			await new Promise((resolve) => setTimeout(resolve, 100));

			if (!mapElement) {
				status = 'ERROR: Map element not found';
				return;
			}

			status = 'Creating map...';

			// Create the map
			map = L.map(mapElement).setView([37.7749, -122.4194], 10);

			// Add tile layer
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			}).addTo(map);

			// Add a simple marker
			L.marker([37.7749, -122.4194]).addTo(map).bindPopup('Test marker in San Francisco');

			status = 'Map created successfully!';
		} catch (error) {
			status = `ERROR: ${error.message}`;
			console.error('Map creation error:', error);
		}
	});
</script>

<div class="container">
	<h1>Map Test Page</h1>
	<p>Status: <strong>{status}</strong></p>

	<div class="map-wrapper">
		<div bind:this={mapElement} class="map-container">
			{#if !map}
				<div class="loading">
					{status}
				</div>
			{/if}
		</div>
	</div>

	<div class="debug-info">
		<h3>Debug Info:</h3>
		<ul>
			<li>Window: {typeof window !== 'undefined' ? 'Available' : 'Not available'}</li>
			<li>Leaflet: {typeof L !== 'undefined' ? 'Loaded' : 'Not loaded'}</li>
			<li>Map Element: {mapElement ? 'Bound' : 'Not bound'}</li>
			<li>Map Object: {map ? 'Created' : 'Not created'}</li>
		</ul>
	</div>
</div>

<style>
	.container {
		padding: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.map-wrapper {
		margin: 2rem 0;
		border: 2px solid #ccc;
		border-radius: 8px;
		overflow: hidden;
	}

	.map-container {
		height: 400px;
		width: 100%;
		background-color: #f0f0f0;
		position: relative;
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		color: #666;
		font-size: 1.1rem;
	}

	.debug-info {
		margin-top: 2rem;
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 6px;
	}

	.debug-info ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.debug-info li {
		margin: 0.25rem 0;
	}
</style>
