<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	const API_URL = import.meta.env.VITE_API_URL;

	let eventId: string = '';
	let event: any = null;
	let loading = true;
	let error = '';
	let mapElement;
	let map;

	// Extract event ID from the URL
	$: eventId = get(page).params.id;

	async function fetchEvent() {
		loading = true;
		error = '';
		try {
			const res = await fetch(`${API_URL}/api/simple-events/${eventId}`);
			if (!res.ok) throw new Error('Failed to fetch event');
			event = await res.json();
			// console.log('Fetched event:', event);
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await fetchEvent();
		await showMap();
	});

	async function showMap() {
		if (
			event &&
			event.data &&
			event.data.location &&
			event.data.location.latitude &&
			event.data.location.longitude &&
			mapElement
		) {
			const L = await import('leaflet');
			await import('leaflet/dist/leaflet.css');
			if (map) {
				map.remove();
			}
			map = L.map(mapElement).setView(
				[event.data.location.latitude, event.data.location.longitude],
				13
			);
			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			}).addTo(map);
			const customIcon = L.icon({
				iconUrl: '/pinYellow.png',
				iconSize: [25, 33],
				iconAnchor: [12.5, 33],
				popupAnchor: [0, -33]
			});
			L.marker([event.data.location.latitude, event.data.location.longitude], { icon: customIcon })
				.addTo(map)
				.openPopup();
		}
	}
</script>

<div class="event-details-container">
	{#if loading}
		<p>Loading event details...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if event && event.data}
		<h1>{event.data.title}</h1>
		<p>by: {event.data.creator?.nickname || 'Unknown'}</p>
		<p>{event.data.type}</p>
		<p>
			<strong>Start Date:</strong>
			{event.data.startdate ? new Date(event.data.startdate).toLocaleString() : 'N/A'}
		</p>
		<p>
			<strong>End Date:</strong>
			{event.data.enddate ? new Date(event.data.enddate).toLocaleString() : 'N/A'}
		</p>
		{#if event.data.location && event.data.location.latitude && event.data.location.longitude}
			<div bind:this={mapElement} class="event-map" style="height: 300px; margin: 1rem 0;"></div>
		{:else}
			<p><strong>Location:</strong> N/A</p>
		{/if}
		<p>{event.data.description || 'No description provided.'}</p>
	{:else}
		<p>Event not found.</p>
	{/if}
</div>

<style>
	.event-details-container {
		position: absolute;
		top: 35px;
		width: 100%;
		margin: 2rem auto;
		padding: 2rem;
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}
	h1 {
		margin-bottom: 1rem;
		font-size: 2rem;
		color: #333;
	}
	p {
		margin: 0.5rem 0;
		font-size: 1.1rem;
	}
	.event-map {
		width: 100%;
		height: 300px;
		border-radius: 8px;
		overflow: hidden;
	}
	.error {
		color: red;
		font-weight: bold;
	}
</style>
