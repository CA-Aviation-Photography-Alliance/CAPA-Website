<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { authStore, login } from '$lib/auth/store';
	import CreateEventModal from '$lib/components/events/CreateEventModal.svelte';
	import EditEventModal from '$lib/components/events/EditEventModal.svelte';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import { fetchEvents, fetchAirports } from '$lib/config/api';

	let mapElement: HTMLDivElement;
	let searchTerm = '';
	let map: any;
	let markers: array = [];
	let eventMarkers: array = [];
	let customIcon: any;
	let eventIcon: any;
	let airports: any = [];
	let events: any = [];
	let loading = true;
	let eventsLoading = false;
	let mapInitialized = false;

	// Modal states
	let showCreateModal = false;
	let showEditModal = false;
	let selectedEvent: any = null;

	// --- Begin: Event creation form state managed in parent ---
	let createEventFormData = {
		startdate: '',
		enddate: '',
		type: '',
		title: '',
		description: ''
	};
	let createEventLat = null;
	let createEventLng = null;
	// --- End: Event creation form state managed in parent ---

	let editEventLatLng: { lat: number; lng: number } | null = null;
	let isLocationPickerMode = false;
	let isEditingLocation = false;
	let showAuthExpiredNotification = false;

	// Event filter
	let showEvents = true;
	let eventFilter = 'active'; // 'active', 'upcoming', 'live'

	// Filter airports based on the search term
	$: filteredAirports = airports.filter((airport) => {
		if (airport.state !== 'California') return false;

		if (!searchTerm) return true;

		const searchLower = searchTerm.toLowerCase();
		return (
			airport.name.toLowerCase().includes(searchLower) ||
			airport.icao.toLowerCase().includes(searchLower) ||
			airport.city.toLowerCase().includes(searchLower)
		);
	});

	// Filter events based on selected filter
	$: filteredEvents = events.filter((event) => {
		const now = new Date();
		const startDate = new Date(event.startdate);
		const endDate = new Date(event.enddate);

		// Never show past events (events that have ended)
		if (endDate < now) {
			return false;
		}

		if (eventFilter === 'upcoming') {
			return startDate > now;
		} else if (eventFilter === 'live') {
			return startDate <= now && now <= endDate;
		}
		// 'active' shows both upcoming and live events (but no past events)
		return true;
	});

	async function fetchAirportsData() {
		loading = true;
		try {
			const result = await fetchAirports();
			if (result.success) {
				airports = result.data || [];
			} else {
				throw new Error(result.error || 'Failed to fetch airports');
			}
		} catch (error) {
			console.error('Error fetching airports:', error);
		} finally {
			loading = false;
		}
	}

	async function fetchEventsData() {
		loading = true;
		try {
			const result = await fetchEvents({ limit: 100 });
			if (result.success) {
				// Filter out events with incomplete data
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

	// Update map markers when filter changes
	$: if (mapInitialized && map && browser) {
		updateMapMarkers(filteredAirports);
	}

	// Update event markers when filter changes
	$: if (mapInitialized && map && browser && showEvents) {
		updateEventMarkers(filteredEvents);
	} else if (mapInitialized && map && browser && !showEvents) {
		clearEventMarkers();
	}

	function updateMapMarkers(airportList) {
		if (!map || !browser || !window.L) return;

		// Clear existing markers
		markers.forEach((marker) => map.removeLayer(marker));
		markers = [];

		airportList.forEach((airport) => {
			if (airport.lat && airport.lon) {
				const marker = window.L.marker([parseFloat(airport.lat), parseFloat(airport.lon)], {
					icon: customIcon
				}).addTo(map);
				marker.bindPopup(`
					<div class="popup-content">
						<h3>${airport.name}</h3>
						<p>${airport.city}, ${airport.state}</p>
						<a href="https://wiki.capacommunity.net/airports/${airport.icao}" class="popup-link view-btn" target="_blank" rel="noopener noreferrer">View details</a>
					</div>
				`);
				markers.push(marker);
			}
		});
	}

	function updateEventMarkers(eventList) {
		if (!map || !browser || !window.L) return;

		// Clear existing event markers
		clearEventMarkers();

		eventList.forEach((event, index) => {
			let lat, lng;
			if (event.location && event.location.latitude && event.location.longitude) {
				lat = event.location.latitude;
				lng = event.location.longitude;
			} else {
				// fallback: use a default location or skip
				lat = 34.0522; // Los Angeles as fallback
				lng = -118.2437;
			}

			const marker = window.L.marker([lat, lng], {
				icon: eventIcon
			}).addTo(map);

			const startDate = new Date(event.startdate).toLocaleDateString();
			const startTime = new Date(event.startdate).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit'
			});

			const creatorUsername =
				typeof event.creator === 'string'
					? event.creator
					: event.creator.nickname || event.creator.name || event.creator.email || 'Unknown';
			const creatorUserId = typeof event.creator === 'string' ? null : event.creator.userId;
			console.log('Event creator debug:', {
				eventId: event.$id,
				eventTitle: event.title,
				creator: event.creator,
				creatorUserId: creatorUserId,
				currentUser: $authStore.user,
				currentUserId: $authStore.user?.$id,
				canEdit: $authStore.user && creatorUserId && $authStore.user.$id === creatorUserId
			});

			marker.bindPopup(`
				<div class="popup-content event-popup">
					<h3>${event.title}</h3>
					<p class="event-type">${event.type}</p>
					<p class="event-date">${startDate} at ${startTime}</p>
					<p class="event-description">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
					<p class="event-creator">By ${creatorUsername}</p>
					<a href="/events/${event.$id}" class="popup-link view-btn" target="_blank" rel="noopener noreferrer">View Details</a>
					${
						$authStore.user && creatorUserId && $authStore.user.$id === creatorUserId
							? `<button onclick="editEvent('${event.$id}')" class="popup-link edit-event-btn">Edit Event</button>`
							: ''
					}
				</div>
			`);
			eventMarkers.push(marker);
		});
	}

	function clearEventMarkers() {
		eventMarkers.forEach((marker) => map.removeLayer(marker));
		eventMarkers = [];
	}

	function handleMapClick(e) {
		if (isLocationPickerMode) {
			if (isEditingLocation) {
				editEventLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
				isEditingLocation = false;
				showEditModal = true;
			} else {
				createEventLat = e.latlng.lat;
				createEventLng = e.latlng.lng;
				showCreateModal = true;
			}
			isLocationPickerMode = false;
		}
	}

	function handleEventCreated(event) {
		events = [...events, event.detail];
		fetchEventsData(); // Refresh events list
		createEventFormData = {
			startdate: '',
			enddate: '',
			type: '',
			title: '',
			description: ''
		};
		createEventLat = null;
		createEventLng = null;
		isLocationPickerMode = false;
		showCreateModal = false;
	}

	function handleEventUpdated(event) {
		const updatedEvent = event.detail;
		events = events.map((e) => (e._id === updatedEvent._id ? updatedEvent : e));
	}

	function handleEventDeleted(event) {
		const deletedEventId = event.detail;
		events = events.filter((e) => e._id !== deletedEventId);
	}

	function handleEditEvent(event) {
		selectedEvent = event.detail;
		// Initialize location data from the existing event if it exists
		if (
			event.detail.location &&
			event.detail.location.latitude &&
			event.detail.location.longitude
		) {
			editEventLatLng = {
				lat: event.detail.location.latitude,
				lng: event.detail.location.longitude
			};
		} else {
			editEventLatLng = null;
		}
		showEditModal = true;
	}

	function handlePickLocation() {
		showCreateModal = false;
		isLocationPickerMode = true;
	}

	function handleEditPickLocation() {
		startEditLocationPicker();
	}

	function startLocationPicker() {
		isLocationPickerMode = true;
		isEditingLocation = false;
		createEventLatLng = null;
	}

	function startEditLocationPicker() {
		isLocationPickerMode = true;
		isEditingLocation = true;
		editEventLatLng = null;
	}

	function cancelLocationPicker() {
		isLocationPickerMode = false;
		isEditingLocation = false;
		createEventLatLng = null;
		editEventLatLng = null;
	}

	// Watch for auth errors
	$: if ($authStore.error && $authStore.error.includes('expired')) {
		showAuthExpiredNotification = true;
	}

	function dismissAuthNotification() {
		showAuthExpiredNotification = false;
	}

	function handleRelogin() {
		showAuthExpiredNotification = false;
		login();
	}

	// Global function for popup buttons (client-side only)
	$: if (browser && typeof window !== 'undefined') {
		window.editEvent = function (eventId) {
			console.log('editEvent called with ID:', eventId);
			const event = events.find((e) => e.$id === eventId);
			console.log('Found event:', event);
			if (event) {
				selectedEvent = event;
				showEditModal = true;
				console.log('Opening edit modal for event:', event.title);
			} else {
				console.error('Event not found for ID:', eventId);
			}
		};
	}

	onMount(async () => {
		if (!browser) return;

		loading = true;
		// console.log('Starting map initialization...');
		// console.log('Map element at start:', mapElement);

		try {
			// Fetch data first
			await Promise.all([fetchAirportsData(), fetchEventsData()]);

			// Wait for DOM to be ready and element to be bound
			await new Promise((resolve) => setTimeout(resolve, 500));
			// console.log('Map element after DOM wait:', mapElement);

			// Wait for Leaflet to be available
			await waitForLeaflet();

			// Initialize map
			await initializeMap();
		} catch (error) {
			console.error('Error during initialization:', error);
			// Set a flag to show error state
			mapInitialized = false;
		} finally {
			loading = false;
		}
	});

	async function waitForLeaflet() {
		let attempts = 0;
		const maxAttempts = 50;

		while (attempts < maxAttempts) {
			if (typeof window !== 'undefined' && window.L && window.L.map) {
				// console.log('Leaflet is ready!');
				return true;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
			attempts++;
		}

		throw new Error('Leaflet failed to load after ' + maxAttempts + ' attempts');
	}

	async function initializeMap() {
		// console.log('initializeMap called, mapElement:', mapElement);

		// Wait for map element to be bound
		let elementAttempts = 0;
		while (!mapElement && elementAttempts < 30) {
			// console.log(`Waiting for map element, attempt ${elementAttempts + 1}`);
			await new Promise((resolve) => setTimeout(resolve, 200));
			elementAttempts++;
		}

		if (!mapElement) {
			console.error('Map element still not found after', elementAttempts, 'attempts');
			throw new Error('Map element not found after waiting');
		}

		// console.log('Map element found:', mapElement);
		// console.log('Element dimensions:', {
		// 	width: mapElement.offsetWidth,
		// 	height: mapElement.offsetHeight,
		// 	clientWidth: mapElement.clientWidth,
		// 	clientHeight: mapElement.clientHeight
		// });

		// Wait for element to have dimensions
		let dimensionAttempts = 0;
		while ((!mapElement.offsetWidth || !mapElement.offsetHeight) && dimensionAttempts < 20) {
			// console.log(`Waiting for dimensions, attempt ${dimensionAttempts + 1}`);
			await new Promise((resolve) => setTimeout(resolve, 100));
			dimensionAttempts++;
		}

		if (!mapElement.offsetWidth || !mapElement.offsetHeight) {
			console.error('Map element has no dimensions after waiting');
			throw new Error('Map element has no dimensions');
		}

		// console.log('Creating map with final dimensions:', {
		// width: mapElement.offsetWidth,
		// height: mapElement.offsetHeight
		//});

		// Create map
		map = window.L.map(mapElement).setView([37.7749, -122.4194], 7);

		// Add tile layer
		window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; OpenStreetMap, &copy; CARTO'
		}).addTo(map);

		// Create icons
		customIcon = window.L.icon({
			iconUrl: '/pinRed.png',
			iconSize: [25, 33],
			iconAnchor: [12.5, 33],
			popupAnchor: [0, -33]
		});

		eventIcon = window.L.icon({
			iconUrl: '/pinYellow.png',
			iconSize: [25, 33],
			iconAnchor: [12.5, 33],
			popupAnchor: [0, -33]
		});

		// Add event handlers
		map.on('click', handleMapClick);

		// Add markers
		updateMapMarkers(filteredAirports);
		if (showEvents) updateEventMarkers(filteredEvents);

		mapInitialized = true;
		// console.log('Map created successfully');
	}
</script>

<div class="content-container">
	<div class="container">
		{#if showAuthExpiredNotification}
			<div class="auth-notification">
				<div class="auth-notification-content">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
					<span>Your session has expired. Please log in again to create or edit events.</span>
					<div class="auth-notification-actions">
						<button class="btn-notification-login" onclick={handleRelogin}>Log In</button>
						<button class="btn-notification-dismiss" onclick={dismissAuthNotification}
							>Dismiss</button
						>
					</div>
				</div>
			</div>
		{/if}

		{#if loading}
			<div class="loading-container">
				<p>Loading map data...</p>
			</div>
		{/if}

		<div class="map-container">
			<div class="map-controls">
				<!-- <div class="view-toggles">
					<label class="toggle-switch">
						<input type="checkbox" bind:checked={showEvents} />
						<span class="slider"></span>
						<span class="toggle-label">Show Events</span>
					</label>
					{#if showEvents}
						<select bind:value={eventFilter} class="filter-select">
							<option value="active">Active Events</option>
							<option value="upcoming">Upcoming</option>
							<option value="live">Live Now</option>
						</select>
					{/if}
				</div> -->
				{#if isLocationPickerMode}
					<div class="location-picker-hint">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
							<circle cx="12" cy="10" r="3"></circle>
						</svg>
						{#if isEditingLocation}
							Click on the map to change event location
						{:else}
							Click on the map to select event location
						{/if}
						<button onclick={cancelLocationPicker} class="cancel-location-btn">Cancel</button>
					</div>
				{/if}
			</div>
			<div bind:this={mapElement} id="map-container" class="map">
				{#if loading}
					<div class="map-loading">
						<p>Loading map...</p>
					</div>
				{/if}
				{#if !loading && !mapInitialized}
					<div class="map-loading">
						<p>Map failed to load</p>
						<button onclick={() => window.location.reload()}>Reload Page</button>
					</div>
				{/if}
			</div>
		</div>

		{#if !loading}
			<div class="content-grid">
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
								<button class="clear-button" onclick={() => (searchTerm = '')}>×</button>
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
						{#each filteredAirports as airport}
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
					<p class="contact-note">Airport not listed? Contact us</p>
				</div>

				{#if showEvents}
					<div class="events-list">
						<div class="events-header">
							<h2>Events</h2>
							{#if $authStore.isAuthenticated}
								<div class="create-event-controls">
									<button class="btn-primary" onclick={() => (showCreateModal = true)}>
										Create Event
									</button>
								</div>
							{/if}
						</div>

						{#if eventsLoading}
							<div class="loading-events">
								<p>Loading events...</p>
							</div>
						{:else if filteredEvents.length > 0}
							<div class="events-grid">
								{#each filteredEvents as event}
									{#if event && event.creator}
										<EventCard
											{event}
											compact={true}
											showEditButton={$authStore.user &&
												typeof event.creator === 'object' &&
												$authStore.user.$id === event.creator.userId}
											on:edit={handleEditEvent}
										/>
									{:else}
										<div class="event-card-error">
											<p>Event data incomplete</p>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<div class="no-events">
								<p>No events found</p>
								{#if $authStore.isAuthenticated}
									<button class="btn-secondary" onclick={() => (showCreateModal = true)}>
										Create the first event
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
<CreateEventModal
	bind:isOpen={showCreateModal}
	bind:formData={createEventFormData}
	bind:latitude={createEventLat}
	bind:longitude={createEventLng}
	on:eventCreated={handleEventCreated}
	on:pickLocation={handlePickLocation}
	on:close={() => {
		createEventLat = null;
		createEventLng = null;
		isLocationPickerMode = false;
	}}
/>

<EditEventModal
	bind:isOpen={showEditModal}
	eventData={selectedEvent}
	latitude={editEventLatLng?.lat}
	longitude={editEventLatLng?.lng}
	on:eventUpdated={handleEventUpdated}
	on:eventDeleted={handleEventDeleted}
	on:pickLocation={handleEditPickLocation}
	on:close={() => {
		selectedEvent = null;
		editEventLatLng = null;
		isEditingLocation = false;
	}}
/>

<style>
	.content-container {
		padding-top: 70px; /* Adjust based on your navbar height */
		min-height: 100vh;
		background-color: #f5f5f7;
	}

	.container {
		padding: 0 2rem 2rem;
		max-width: 1400px;
		margin: 0 auto;
		margin-top: 30px;
	}

	.map-container {
		height: 500px;
		width: 100%;
		margin-bottom: 2rem;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		position: relative;
		z-index: 1;
	}

	.map-controls {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		z-index: 1000;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.view-toggles {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: white;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.toggle-switch {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.toggle-switch input[type='checkbox'] {
		position: relative;
		width: 40px;
		height: 20px;
		appearance: none;
		background: #d1d5db;
		border-radius: 10px;
		outline: none;
		transition: background 0.2s;
	}

	.toggle-switch input[type='checkbox']:checked {
		background: #10b981;
	}

	.toggle-switch input[type='checkbox']::before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 8px;
		background: white;
		transition: transform 0.2s;
	}

	.toggle-switch input[type='checkbox']:checked::before {
		transform: translateX(20px);
	}

	.filter-select {
		padding: 0.375rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}

	.location-picker-hint {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(16, 185, 129, 0.9);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.cancel-location-btn {
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		margin-left: auto;
	}

	.cancel-location-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.map {
		height: 100%;
		width: 100%;
		background-color: #f0f0f0;
		min-height: 500px;
		position: relative;
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

	.airport-list h2,
	.events-header h2 {
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
		border-color: #bc3011;
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
		border-left: 6px solid #bc3011;
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

	.contact-note {
		margin-top: 1rem;
		font-weight: 500;
		color: #3e4163;
		text-align: center;
	}

	.events-list {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.events-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.create-event-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
		font-size: 0.875rem;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-primary {
		background: #bc3011;
		color: white;
	}

	.btn-primary:hover {
		background: #a02b0f;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.events-grid {
		display: grid;
		gap: 1rem;
	}

	.loading-events,
	.no-events {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	.no-events button {
		margin-top: 1rem;
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

	:global(.event-popup) {
		min-width: 200px;
	}

	:global(.event-popup .event-type) {
		font-weight: 500;
		color: #bc3011;
		margin: 4px 0;
	}

	:global(.event-popup .event-date) {
		font-size: 11px;
		color: #666;
		margin: 4px 0;
	}

	:global(.event-popup .event-description) {
		font-size: 11px;
		margin: 8px 0;
		line-height: 1.4;
	}

	:global(.event-popup .event-creator) {
		font-size: 10px;
		color: #888;
		margin: 4px 0;
	}

	:global(.edit-event-btn) {
		background: #bc3011 !important;
		color: white !important;
		border: none !important;
		cursor: pointer;
		font-size: 11px;
	}
	:global(.view-btn) {
		background: #bc3011 !important;
		color: white !important;
		border: none !important;
		cursor: pointer;
		font-size: 11px;
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

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 400px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.loading-container p {
		font-size: 1.2rem;
		color: #666;
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.map-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.view-toggles {
			justify-content: center;
		}
	}

	@media (max-width: 640px) {
		.container {
			padding: 0 1rem 1rem;
		}

		.map-container {
			height: 400px;
		}

		.view-toggles {
			flex-direction: column;
			gap: 0.5rem;
		}

		.events-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.create-event-controls {
			flex-direction: column;
		}
	}

	.event-card-error {
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.auth-notification {
		position: fixed;
		top: 80px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1001;
		width: 90%;
		max-width: 500px;
	}

	.auth-notification-content {
		background: #fef2f2;
		border: 1px solid #fca5a5;
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #dc2626;
	}

	.auth-notification-content svg {
		flex-shrink: 0;
	}

	.auth-notification-actions {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}

	.btn-notification-login,
	.btn-notification-dismiss {
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-notification-login {
		background: #dc2626;
		color: white;
		border: none;
	}

	.btn-notification-login:hover {
		background: #b91c1c;
	}

	.btn-notification-dismiss {
		background: white;
		color: #dc2626;
		border: 1px solid #fca5a5;
	}

	.btn-notification-dismiss:hover {
		background: #fef2f2;
	}

	.map-loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		color: #666;
		font-size: 1.1rem;
	}
</style>
