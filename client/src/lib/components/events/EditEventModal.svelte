<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { authStore, getAccessToken, login } from '$lib/auth/store';
	import type { User } from '@auth0/auth0-spa-js';
	import { buildApiUrl } from '$lib/config/api';

	export let isOpen = false;
	export let eventData = null;
	export let latitude = null;
	export let longitude = null;

	const dispatch = createEventDispatcher();

	let formData = {
		startdate: '',
		enddate: '',
		type: '',
		title: '',
		description: ''
	};

	let isSubmitting = false;
	let isDeleting = false;
	let showDeleteConfirm = false;
	let errors: string[] = [];
	let isRetrying = false;
	let showAuthError = false;

	const eventTypes = ['Planespotting', 'Airshow', 'Other'];

	async function populateForm() {
		if (eventData) {
			formData = {
				startdate: eventData.startdate ? eventData.startdate.slice(0, 16) : '',
				enddate: eventData.enddate ? eventData.enddate.slice(0, 16) : '',
				type: eventData.type || '',
				title: eventData.title || '',
				description: eventData.description || ''
			};
			await tick(); // Ensure DOM updates with the new form data
		}
	}

	$: if (eventData && isOpen) {
		populateForm();
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
		if (!user) {
			errors = ['You must be logged in to edit events'];
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

			const updatedEvent = {
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

			const response = await fetch(buildApiUrl(`/api/simple-events/${eventData._id}`), {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(updatedEvent)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to update event');
			}

			dispatch('eventUpdated', result.data);
			closeModal();
		} catch (error) {
			console.error('Error updating event:', error);

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
				errors = ['Failed to update event. Please try again.'];
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!eventData || !eventData._id) {
			errors = ['No event selected for deletion'];
			return;
		}

		const user = $authStore.user as User;
		if (!user) {
			errors = ['You must be logged in to delete events'];
			return;
		}

		isDeleting = true;
		showAuthError = false;

		try {
			const token = await getAccessToken();
			if (!token) {
				showAuthError = true;
				errors = ['Authentication session expired. Please log in again.'];
				return;
			}

			const response = await fetch(buildApiUrl(`/api/simple-events/${eventData._id}`), {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete event');
			}

			dispatch('eventDeleted', eventData._id);
			closeModal();
		} catch (error) {
			console.error('Error deleting event:', error);

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
				errors = ['Failed to delete event. Please try again.'];
			}
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}

	function confirmDelete() {
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
	}

	function closeModal() {
		isOpen = false;
		showDeleteConfirm = false;
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
				<h2 id="modal-title">Edit Event</h2>
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

				{#if showDeleteConfirm}
					<div class="delete-confirmation">
						<h4>Confirm Deletion</h4>
						<p>Are you sure you want to delete this event? This action cannot be undone.</p>
						<div class="delete-actions">
							<button
								type="button"
								class="btn-secondary"
								onclick={cancelDelete}
								disabled={isDeleting}
							>
								Cancel
							</button>
							<button type="button" class="btn-danger" onclick={handleDelete} disabled={isDeleting}>
								{#if isDeleting}
									<span class="spinner"></span>
									Deleting...
								{:else}
									Delete Event
								{/if}
							</button>
						</div>
					</div>
				{:else}
					<div class="form-actions">
						<button
							type="button"
							class="btn-secondary"
							onclick={closeModal}
							disabled={isSubmitting}
						>
							Cancel
						</button>
						<div class="action-buttons">
							<button
								type="button"
								class="btn-danger-outline"
								onclick={confirmDelete}
								disabled={isSubmitting}
							>
								Delete Event
							</button>
							<button type="submit" class="btn-primary" disabled={isSubmitting}>
								{#if isSubmitting}
									<span class="spinner"></span>
									Saving...
								{:else}
									Save Changes
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 35px;
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
	.btn-secondary,
	.btn-danger,
	.btn-danger-outline {
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

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-danger:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.btn-danger-outline {
		background: transparent;
		color: #dc2626;
		border: 1px solid #dc2626;
	}

	.btn-danger-outline:hover:not(:disabled) {
		background: #dc2626;
		color: white;
	}

	.btn-danger-outline:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.delete-confirmation {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		padding: 1.5rem;
		margin-top: 1rem;
	}

	.delete-confirmation h4 {
		margin: 0 0 0.5rem 0;
		color: #dc2626;
		font-size: 1rem;
		font-weight: 600;
	}

	.delete-confirmation p {
		margin: 0 0 1rem 0;
		color: #7f1d1d;
		font-size: 0.875rem;
	}

	.delete-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
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

		.action-buttons {
			flex-direction: column;
			width: 100%;
		}

		.btn-primary,
		.btn-secondary,
		.btn-danger,
		.btn-danger-outline {
			width: 100%;
			justify-content: center;
		}

		.delete-actions {
			flex-direction: column;
		}
	}
</style>
