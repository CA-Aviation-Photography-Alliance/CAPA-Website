<script lang="ts">
	import {
		authStore,
		updateProfile,
		updateProfilePicture,
		removeProfilePicture,
		updateProfileExtras
	} from '$lib/auth/store';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { userProfileService } from '$lib/services/userProfileService';

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
	let currentPicture = $state<string | null>(null);
	let avatarPreview = $state<string | null>(null);
	let avatarError = $state('');
	let isAvatarLoading = $state(false);
	let avatarInput: HTMLInputElement | null = null;
	const displayedAvatar = $derived(avatarPreview || currentPicture);
	const BIO_MAX = 500;

	let bio = $state('');
	let initialBio = '';
	let profileDetailsError = $state('');

	function hasProfileDetailsChanged(): boolean {
		return bio.trim() !== (initialBio || '').trim();
	}

	function refreshHasChanges() {
		if ($authStore.user) {
			hasChanges =
				username !== ($authStore.user.username || '') ||
				email !== ($authStore.user.email || '') ||
				hasProfileDetailsChanged();
		}
	}

	async function loadProfileDetails() {
		if (!$authStore.user) return;
		try {
			const profile = await userProfileService.getProfile(
				$authStore.user.$id || $authStore.user.userId
			);
			bio = profile?.bio || '';
			initialBio = bio;
			refreshHasChanges();
		} catch (error) {
			console.warn('Failed to load profile details', error);
		}
	}

	onMount(() => {
		if ($authStore.user) {
			username = $authStore.user.username || '';
			email = $authStore.user.email || '';
			currentPicture = $authStore.user.picture || null;
		}
		loadProfileDetails();
	});

	// Track changes
	$effect(() => {
		if ($authStore.user) {
			refreshHasChanges();
		}
	});

	$effect(() => {
		currentPicture = $authStore.user?.picture || null;
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
		if (!$authStore.user) return;

		const usernameChanged = username !== ($authStore.user.username || '');
		const emailChanged = email !== ($authStore.user.email || '');
		const profileDetailsChanged = hasProfileDetailsChanged();

		if (!usernameChanged && !emailChanged && !profileDetailsChanged) {
			return;
		}

		if ((usernameChanged || emailChanged) && !validateForm()) {
			return;
		}

		isLoading = true;
		error = '';
		profileDetailsError = '';

		try {
			if (usernameChanged || emailChanged) {
				await updateProfile(
					usernameChanged ? username.trim() : undefined,
					emailChanged ? email.trim() : undefined
				);
			}

			if (profileDetailsChanged) {
				await updateProfileExtras({
					bio
				});

				initialBio = bio.trim();
			}

			onSave({ username, email, bio });
			onClose();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update profile';
			if (profileDetailsChanged && !usernameChanged && !emailChanged) {
				profileDetailsError = message;
			} else {
				error = message;
			}
			console.error('Profile update error:', err);
		} finally {
			isLoading = false;
			refreshHasChanges();
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
		bio = initialBio;
		profileDetailsError = '';
		refreshHasChanges();
	}

	function getUserInitials(): string {
		const source = $authStore.user?.username || $authStore.user?.email || '';
		if (!source) return '?';
		return source.slice(0, 2).toUpperCase();
	}

	function triggerAvatarSelect() {
		if (!isAvatarLoading) {
			avatarInput?.click();
		}
	}

	async function handleAvatarChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		avatarError = '';

		if (!file.type.startsWith('image/')) {
			avatarError = 'Please choose an image file.';
			target.value = '';
			return;
		}

		isAvatarLoading = true;

		const previewUrl = browser ? URL.createObjectURL(file) : null;
		avatarPreview = previewUrl;

		try {
			const updatedUser = await updateProfilePicture(file);
			currentPicture = updatedUser.picture || null;
		} catch (err) {
			avatarError = err instanceof Error ? err.message : 'Failed to update profile picture';
		} finally {
			if (browser && previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			avatarPreview = null;
			isAvatarLoading = false;
			target.value = '';
		}
	}

	async function handleAvatarRemove() {
		if (!currentPicture || isAvatarLoading) return;
		avatarError = '';
		isAvatarLoading = true;

		try {
			const updatedUser = await removeProfilePicture();
			currentPicture = updatedUser.picture || null;
		} catch (err) {
			avatarError = err instanceof Error ? err.message : 'Failed to remove profile picture';
		} finally {
			isAvatarLoading = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

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
			<div class="avatar-section">
				<div class="avatar-preview" aria-busy={isAvatarLoading}>
					{#if displayedAvatar}
						<img src={displayedAvatar} alt="Profile picture preview" />
					{:else}
						<div class="avatar-placeholder">
							{getUserInitials()}
						</div>
					{/if}
					{#if isAvatarLoading}
						<div class="avatar-overlay">
							<span class="spinner"></span>
						</div>
					{/if}
				</div>
				<div class="avatar-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={triggerAvatarSelect}
						disabled={isAvatarLoading}
					>
						{currentPicture ? 'Change Photo' : 'Add Photo'}
					</button>
					<button
						type="button"
						class="btn-tertiary"
						onclick={handleAvatarRemove}
						disabled={!currentPicture || isAvatarLoading}
					>
						Remove
					</button>
				</div>
				{#if avatarError}
					<p class="avatar-error">
						{avatarError}
					</p>
				{/if}
				<input
					class="sr-only"
					type="file"
					accept="image/png,image/jpeg,image/gif,image/webp"
					bind:this={avatarInput}
					onchange={handleAvatarChange}
				/>
			</div>

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

			<div class="form-group">
				<label for="bio">Bio</label>
				<textarea
					id="bio"
					rows="4"
					maxlength={BIO_MAX}
					bind:value={bio}
					placeholder="Tell the community a bit about yourself"
					oninput={() => refreshHasChanges()}
				></textarea>
				<div class="helper-row">
					<small class="help-text">
						add masked links with
						<span class="code-inline">[label](https://example.com)</span>
					</small>
					<small class="char-count">{bio.length}/{BIO_MAX}</small>
				</div>
			</div>

			{#if profileDetailsError}
				<div class="error-message">
					{profileDetailsError}
				</div>
			{/if}

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

	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.avatar-preview {
		position: relative;
		width: 120px;
		height: 120px;
		border-radius: 50%;
		overflow: hidden;
		border: 3px solid rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
	}

	.avatar-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		color: var(--color-capa-white);
	}

	.avatar-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.btn-tertiary {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.btn-tertiary:hover:not(:disabled) {
		color: var(--color-capa-white);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.btn-tertiary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.avatar-error {
		color: #ff6b6b;
		font-size: 0.85rem;
		margin: 0;
		text-align: center;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
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

	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-capa-white);
		border-radius: 6px;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		min-height: 120px;
		box-sizing: border-box;
	}

	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
		box-shadow: 0 0 0 3px rgba(223, 70, 20, 0.2);
	}

	.help-text {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.code-inline {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-capa-white);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
	}

	.helper-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.char-count {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
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
