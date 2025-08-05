<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { authStore, getAccessToken, login } from '$lib/auth/store';
	import type { User } from '@auth0/auth0-spa-js';

	export let isOpen = false;
	export let formData;
	export let latitude;
	export let longitude;

	const dispatch = createEventDispatcher();

	let isSubmitting = false;
	let errors: string[] = [];
	let isRetrying = false;
	let showAuthError = false;

	// Event types
	const eventTypes = [
		'Flight Training',
		'Group Flight',
		'ATC Session',
		'Fly-in',
		'Competition',
		'Meeting',
		'Social Event',
		'Other'
	];

	async function retryWithFreshAuth() {
		isRetrying = true;
		showAuthError = false;

		try {
			await login();
		} catch (error) {
			console.error('Retry authentication failed:', error);
			errors = ['Unable to refresh authentication. Please try again.'];
		} finally {
			isRetrying = false;
		}
	}

	function formatDateTimeLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function validateForm(): boolean {
		errors = [];

		if (!formData.title.trim()) {
			errors.push('Title is required');
		}

		if (!formData.type) {
			errors.push('Event type is required');
		}

		if (!formData.description.trim()) {
			errors.push('Description is required');
		}

		if (!formData.startdate) {
			errors.push('Start date is required');
		}

		if (!formData.enddate) {
			errors.push('End date is required');
		}

		if (formData.startdate && formData.enddate) {
			if (new Date(formData.startdate) >= new Date(formData.enddate)) {
				errors.push('End date must be after start date');
			}
		}

		return errors.length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		const user = $authStore.user as User;
		// console.log('Auth0 user:', user);

		if (!user || !user.email || !(user.name || user.nickname)) {
			errors = [
				'Your Auth0 profile is missing a name or email. Please update your profile and try again.'
			];
			isSubmitting = false;
			return;
		}

		isSubmitting = true;
		showAuthError = false;

		try {
			const token = await getAccessToken();
			if (!token) {
				showAuthError = true;
				errors = ['Authentication session expired. Please log in again.'];
				return;
			}

			const eventData = {
				startdate: new Date(formData.startdate).toISOString(),
				enddate: new Date(formData.enddate).toISOString(),
				type: formData.type,
				title: formData.title,
				description: formData.description,
				...(latitude &&
					longitude && {
						location: {
							latitude,
							longitude
						}
					})
			};

			// console.log('ACCESS TOKEN:', token);

			const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
			const response = await fetch(`${apiUrl}/api/simple-events`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(eventData)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create event');
			}

			dispatch('eventCreated', result.data);
			closeModal();
		} catch (error) {
			console.error('Error creating event:', error);

			if (error instanceof Error) {
				if (error.message.includes('authentication') || error.message.includes('token')) {
					showAuthError = true;
					errors = ['Authentication error. Please try logging in again.'];
				} else if (error.message.includes('network') || error.message.includes('fetch')) {
					errors = ['Network error. Please check your connection and try again.'];
				} else {
					errors = [error.message];
				}
			} else {
				errors = ['Failed to create event. Please try again.'];
			}
		} finally {
			isSubmitting = false;
		}
	}

	function closeModal() {
		isOpen = false;
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function handleOutsideClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div
		class="modal-overlay"
		onclick={handleOutsideClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div class="modal-content">
			<div class="modal-header">
				<h2 id="modal-title">Create New Event</h2>
				<button class="close-button" onclick={closeModal} aria-label="Close modal">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M18 6L6 18M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="event-form"
			>
				{#if errors.length > 0}
					<div class="error-list" class:auth-error={showAuthError}>
						{#each errors as error}
							<div class="error-item">{error}</div>
						{/each}
						{#if showAuthError}
							<div class="auth-error-actions">
								<button
									type="button"
									class="btn-retry"
									onclick={retryWithFreshAuth}
									disabled={isRetrying}
								>
									{#if isRetrying}
										<span class="spinner-small"></span>
										Refreshing...
									{:else}
										Try Again
									{/if}
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<div class="form-group">
					<label for="title">Event Title *</label>
					<input
						id="title"
						type="text"
						bind:value={formData.title}
						placeholder="Enter event title"
						maxlength="200"
						required
					/>
				</div>

				<div class="form-group">
					<label for="type">Event Type *</label>
					<select id="type" bind:value={formData.type} required>
						<option value="">Select event type</option>
						{#each eventTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="startdate">Start Date & Time *</label>
						<input id="startdate" type="datetime-local" bind:value={formData.startdate} required />
					</div>

					<div class="form-group">
						<label for="enddate">End Date & Time *</label>
						<input id="enddate" type="datetime-local" bind:value={formData.enddate} required />
					</div>
				</div>

				<div class="form-group">
					<label for="description">Description *</label>
					<textarea
						id="description"
						bind:value={formData.description}
						placeholder="Describe your event..."
						maxlength="2000"
						rows="4"
						required
					></textarea>
					<div class="char-count">{formData.description.length}/2000</div>
				</div>

				<div class="location-section-main">
					{#if !latitude || !longitude}
						<div class="location-picker-section">
							<h4>Event Location</h4>
							<p>Choose where this event will appear on the map:</p>
							<button
								type="button"
								class="btn-location-picker"
								onclick={() => {
									closeModal();
									dispatch('pickLocation');
								}}
							>
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
								Pick Location on Map
							</button>
						</div>
					{/if}
				</div>

				{#if latitude && longitude}
					<div class="location-display">
						<h4>Event Location</h4>
						<p>Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
						<p class="location-note">This event will appear on the map at the selected location.</p>
						<button
							type="button"
							class="btn-edit-location"
							onclick={() => {
								closeModal();
								dispatch('pickLocation');
							}}
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
							Change Location
						</button>
					</div>
				{:else}
					<div class="location-prompt">
						<h4>Event Location</h4>
						<p>
							Close this dialog and click "Pick Location on Map" to select where this event will
							appear on the map.
						</p>
					</div>
				{/if}

				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={closeModal} disabled={isSubmitting}>
						Cancel
					</button>
					<button type="submit" class="btn-primary" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="spinner"></span>
							Creating...
						{:else}
							Create Event
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: white;
		border-radius: 8px;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.modal-header {
		padding: 1.5rem 1.5rem 1rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		position: relative;
	}

	.modal-header h2 {
		margin: 0;
		color: #3e4163;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		margin: -0.25rem -0.25rem 0 0;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		color: #374151;
		background: #f3f4f6;
	}

	.event-form {
		padding: 1.5rem;
	}

	.error-list {
		margin-bottom: 1rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
	}

	.error-item {
		color: #dc2626;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.error-item:last-child {
		margin-bottom: 0;
	}

	.auth-error {
		background: #fef2f2;
		border-color: #fca5a5;
	}

	.auth-error-actions {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #fca5a5;
	}

	.btn-retry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.8125rem;
	}

	.btn-retry:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-retry:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner-small {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.location-display,
	.location-prompt {
		margin-bottom: 1.5rem;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
	}

	.location-display {
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.location-prompt {
		background: #fffbeb;
		border-color: #fed7aa;
	}

	.location-display h4,
	.location-prompt h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.location-display p,
	.location-prompt p {
		margin: 0.25rem 0;
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.location-note {
		font-style: italic;
	}

	.location-section-main {
		margin-bottom: 1.5rem;
	}

	.location-picker-section {
		padding: 1rem;
		background: #f8fafc;
		border: 2px dashed #cbd5e1;
		border-radius: 6px;
		text-align: center;
	}

	.location-picker-section h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.location-picker-section p {
		margin: 0 0 1rem 0;
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.btn-location-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #10b981;
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
		margin: 0 auto;
	}

	.btn-location-picker:hover {
		background: #059669;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.btn-edit-location {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #6b7280;
		color: white;
		border: none;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.8125rem;
		margin-top: 0.75rem;
	}

	.btn-edit-location:hover {
		background: #4b5563;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s ease;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #bc3011;
		box-shadow: 0 0 0 3px rgba(188, 48, 17, 0.1);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.char-count {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
		text-align: right;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-primary {
		background: #bc3011;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #a02b0f;
	}

	.btn-primary:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.modal-overlay {
			padding: 0.5rem;
		}

		.modal-header {
			padding: 1rem 1rem 0.75rem;
		}

		.event-form {
			padding: 1rem;
		}

		.form-row {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.form-actions {
			flex-direction: column;
		}

		.btn-primary,
		.btn-secondary {
			width: 100%;
			justify-content: center;
		}
	}
</style>
