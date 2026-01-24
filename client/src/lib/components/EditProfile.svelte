<script lang="ts">
	import { authStore, updateProfile } from '$lib/auth/store';
	import { onMount } from 'svelte';

	let {
		onClose,
		onSave
	}: {
		onClose: () => void;
		onSave: (updatedUser: Record<string, unknown>) => void;
	} = $props();

	let username = $state('');
	let email = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let hasChanges = $state(false);

	onMount(() => {
		if ($authStore.user) {
			username = $authStore.user.username || '';
			email = $authStore.user.email || '';
		}
	});

	// Track changes
	$effect(() => {
		if ($authStore.user) {
			hasChanges =
				username !== ($authStore.user.username || '') || email !== ($authStore.user.email || '');
		}
	});

	function validateForm(): boolean {
		error = '';

		if (!username.trim()) {
			error = 'Username is required';
			return false;
		}

		if (username.trim().length < 3) {
			error = 'Username must be at least 3 characters';
			return false;
		}

		if (!email.trim()) {
			error = 'Email is required';
			return false;
		}

		if (!/\S+@\S+\.\S+/.test(email)) {
			error = 'Please enter a valid email address';
			return false;
		}

		return true;
	}

	async function saveProfile() {
		if (!validateForm()) return;
		if (!$authStore.user) return;

		isLoading = true;
		error = '';

		try {
			// Only update fields that have changed
			const usernameChanged = username !== ($authStore.user.username || '');
			const emailChanged = email !== ($authStore.user.email || '');

			await updateProfile(
				usernameChanged ? username.trim() : undefined,
				emailChanged ? email.trim() : undefined
			);

			onSave({ username, email });
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update profile';
			console.error('Profile update error:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function resetForm() {
		if ($authStore.user) {
			username = $authStore.user.username || '';
			email = $authStore.user.email || '';
		}
		error = '';
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="modal-backdrop"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	aria-labelledby="edit-profile-title"
>
	<div class="modal-content">
		<div class="modal-header">
			<h2 id="edit-profile-title">Edit Profile</h2>
			<button class="close-button" onclick={onClose} aria-label="Close modal">
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
				saveProfile();
			}}
			class="profile-form"
		>
			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			<div class="form-group">
				<label for="username">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					placeholder="Enter your username"
					required
					disabled={isLoading}
					minlength="3"
					maxlength="30"
				/>
				<small class="help-text">Your username will be displayed on events you create.</small>
			</div>

			<div class="form-group">
				<label for="email">Email Address</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="Enter your email"
					required
					disabled={isLoading}
				/>
				<small class="help-text">
					Your email address for notifications and account recovery.
				</small>
			</div>

			<div class="form-actions">
				<button
					type="button"
					class="btn-secondary"
					onclick={resetForm}
					disabled={isLoading || !hasChanges}
				>
					Reset
				</button>
				<button type="button" class="btn-secondary" onclick={onClose} disabled={isLoading}>
					Cancel
				</button>
				<button type="submit" class="btn-primary" disabled={isLoading || !hasChanges}>
					{#if isLoading}
						<span class="spinner"></span>
						Updating...
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
		padding: 1rem;
	}

	.modal-content {
		background: rgba(0, 0, 0, 0.9);
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-family: 'eurostile', sans-serif;
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--color-capa-orange);
	}

	.close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem;
		color: rgba(255, 255, 255, 0.7);
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--color-capa-white);
	}

	.profile-form {
		padding: 1.5rem;
	}

	.error-message {
		background-color: rgba(220, 53, 69, 0.2);
		color: #ff6b6b;
		border: 1px solid rgba(220, 53, 69, 0.5);
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		text-align: center;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: var(--color-capa-white);
		font-size: 0.875rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-capa-white);
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s ease;
		font-family: inherit;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-capa-orange);
		box-shadow: 0 0 0 3px rgba(223, 70, 20, 0.2);
	}

	.form-group input:disabled {
		background-color: rgba(255, 255, 255, 0.05);
		opacity: 0.6;
		cursor: not-allowed;
	}

	.help-text {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
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
		background: var(--color-capa-red);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-capa-orange);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.btn-primary:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #e5e7eb;
		transform: translateY(-1px);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
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
		.modal-backdrop {
			padding: 0.5rem;
		}

		.modal-header {
			padding: 1rem;
		}

		.profile-form {
			padding: 1rem;
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
