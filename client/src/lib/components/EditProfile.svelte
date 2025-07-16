<script lang="ts">
	import { authStore, refreshUser } from '$lib/auth/store';
	import { onMount } from 'svelte';

	let {
		onClose,
		onSave
	}: {
		onClose: () => void;
		onSave: (updatedUser: Record<string, unknown>) => void;
	} = $props();

	let nickname = $state('');
	let name = $state('');
	let isLoading = $state(false);

	onMount(() => {
		if ($authStore.user) {
			nickname = $authStore.user.nickname || '';
			name = $authStore.user.name || '';
		}
	});

	async function saveProfile() {
		if (!$authStore.user) return;

		isLoading = true;

		try {
			// Update user profile via our API
			const updateResponse = await fetch(`/api/auth/update-profile`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId: $authStore.user.sub,
					nickname: nickname.trim(),
					name: name.trim()
				})
			});

			if (!updateResponse.ok) {
				const errorData = await updateResponse.json();
				if (errorData.setup_required) {
					alert(
						'Profile editing is not configured yet. Please see AUTH0_SETUP.md for setup instructions.'
					);
				} else {
					alert(`Error: ${errorData.error || 'Failed to update profile'}`);
				}
				return;
			}

			const updatedUser = await updateResponse.json();
			console.log('API Response:', updatedUser);
			console.log('Current user before update:', $authStore.user);

			// Wait for Auth0 servers to propagate the changes
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Refresh user data from Auth0 to get the latest changes
			try {
				await refreshUser();
			} catch (refreshError) {
				console.warn('Failed to refresh user data, trying full reinitialization:', refreshError);
				// If refresh fails, try complete reinitialization
				try {
					const { initAuth0 } = await import('$lib/auth/store');
					await initAuth0();
				} catch (initError) {
					console.warn('Full reinitialization failed:', initError);
					// Final fallback to local update
					authStore.update((state) => ({
						...state,
						user: {
							...state.user,
							nickname: updatedUser.nickname,
							name: updatedUser.name,
							updated_at: updatedUser.updated_at
						}
					}));
				}
			}

			console.log('Final user after refresh:', $authStore.user);
			alert('Profile updated successfully!');
			onSave(updatedUser);
			onClose();
		} catch (err) {
			alert(
				`Error: ${err instanceof Error ? err.message : 'An error occurred while updating your profile'}`
			);
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
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="modal-backdrop"
	onclick={handleBackdropClick}
	role="dialog"
	onkeydown={handleKeydown}
	tabindex="-1"
>
	<div class="modal-content" role="dialog" aria-labelledby="edit-profile-title">
		<div class="modal-header">
			<h2 id="edit-profile-title">Edit Profile</h2>
			<button class="close-btn" onclick={onClose} aria-label="Close dialog">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		</div>

		<form
			class="modal-body"
			onsubmit={(e) => {
				e.preventDefault();
				saveProfile();
			}}
		>
			<div class="form-group">
				<label for="name">Display Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="Your display name"
					disabled={isLoading}
					maxlength="50"
				/>
				<small class="help-text">This is how your name appears to others</small>
			</div>

			<div class="form-group">
				<label for="nickname">Username</label>
				<input
					id="nickname"
					type="text"
					bind:value={nickname}
					placeholder="Your username"
					disabled={isLoading}
					maxlength="30"
				/>
				<small class="help-text">Only letters, numbers, underscores, and hyphens allowed</small>
			</div>

			<div class="modal-actions">
				<button type="button" class="btn btn-secondary" onclick={onClose} disabled={isLoading}>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary" disabled={isLoading || !nickname.trim()}>
					{#if isLoading}
						Saving...
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
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow: auto;
		color: white;
		font-family: 'eurostile', sans-serif;
		position: relative;
		z-index: 10000;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: bold;
		color: white;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: white;
		background: rgba(255, 255, 255, 0.1);
	}

	.modal-body {
		padding: 2rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
		color: white;
		font-size: 0.875rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		color: white;
		font-family: 'eurostile', sans-serif;
		font-size: 1rem;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-capa-orange);
		background: rgba(255, 255, 255, 0.1);
		box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.2);
	}

	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.help-text {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		border: 1px solid transparent;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.btn-primary {
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		color: white;
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3);
	}

	@media (max-width: 600px) {
		.modal-content {
			margin: 0;
			border-radius: 8px;
		}

		.modal-header {
			padding: 1rem 1.5rem 0.75rem;
		}

		.modal-body {
			padding: 1.5rem;
		}

		.modal-actions {
			flex-direction: column-reverse;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
