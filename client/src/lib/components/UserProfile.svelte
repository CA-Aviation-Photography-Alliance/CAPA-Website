<script lang="ts">
	import { authStore, logout } from '$lib/auth/store';
	import EditProfile from './EditProfile.svelte';

	let {
		showFullProfile = true,
		size = 'normal'
	}: {
		showFullProfile?: boolean;
		size?: 'small' | 'normal' | 'large';
	} = $props();

	let showEditModal = $state(false);

	async function handleLogout() {
		try {
			await logout();
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}

	function getInitials(username: string | undefined): string {
		if (!username) return '?';
		// For usernames, just take first 2 characters
		return username.slice(0, 2).toUpperCase();
	}

	function openEditModal() {
		// console.log('Opening edit modal...');
		showEditModal = true;
	}

	function closeEditModal() {
		// console.log('Closing edit modal...');
		showEditModal = false;
	}

	function handleProfileSaved(updatedUser: Record<string, unknown>) {
		// The auth store is already updated in the EditProfile component
		// console.log('Profile updated:', updatedUser);
	}
</script>

{#if $authStore.isAuthenticated && $authStore.user}
	<div class="user-profile {size}">
		{#if showFullProfile}
			<!-- Full profile view -->
			<div class="profile-card">
				<div class="avatar-section">
					{#if $authStore.user.picture}
						<img src={$authStore.user.picture} alt="Profile" class="avatar-image" />
					{:else}
						<div class="avatar-placeholder">
							{getInitials($authStore.user.username || $authStore.user.email)}
						</div>
					{/if}
				</div>

				<div class="user-info">
					<h3 class="user-name">
						{$authStore.user.username || 'User'}
					</h3>
					<p class="user-email">
						{$authStore.user.email}
					</p>
					{#if $authStore.user.nickname && $authStore.user.nickname !== $authStore.user.username}
						<p class="user-nickname">
							@{$authStore.user.nickname}
						</p>
					{/if}
				</div>

				<div class="profile-actions">
					<button class="edit-btn" onclick={openEditModal}> Edit Profile </button>
					<button class="logout-btn" onclick={handleLogout}> Sign Out </button>
				</div>
			</div>
		{:else}
			<!-- Compact profile view -->
			<div class="profile-compact">
				{#if $authStore.user.picture}
					<img src={$authStore.user.picture} alt="Profile" class="avatar-image-compact" />
				{:else}
					<div class="avatar-placeholder-compact">
						{getInitials($authStore.user.username || $authStore.user.email)}
					</div>
				{/if}

				<div class="user-info-compact">
					<span class="user-name-compact">
						{$authStore.user.username || $authStore.user.email?.split('@')[0] || 'User'}
					</span>
				</div>

				<button
					class="edit-btn-compact"
					onclick={openEditModal}
					title="Edit Profile"
					aria-label="Edit Profile"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
						<path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
				</button>

				<button
					class="logout-btn-compact"
					onclick={handleLogout}
					title="Sign Out"
					aria-label="Sign Out"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<polyline points="16,17 21,12 16,7" />
						<line x1="21" y1="12" x2="9" y2="12" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
{/if}

<!-- Edit Profile Modal - positioned outside to appear over everything -->
{#if showEditModal}
	<EditProfile onClose={closeEditModal} onSave={handleProfileSaved} />
{/if}

<style>
	.user-profile {
		color: white;
		font-family: 'eurostile', sans-serif;
	}

	/* Full profile card */
	.profile-card {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		max-width: 300px;
	}

	.avatar-section {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.avatar-image {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		border: 3px solid rgba(255, 255, 255, 0.3);
	}

	.avatar-placeholder {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		color: white;
		border: 3px solid rgba(255, 255, 255, 0.3);
	}

	.user-info {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.user-name {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: bold;
		color: white;
	}

	.user-email {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		word-break: break-word;
	}

	.user-nickname {
		margin: 0;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
	}

	.profile-actions {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.edit-btn {
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		border: none;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
	}

	.edit-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3);
	}

	.logout-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
	}

	.logout-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	/* Compact profile */
	.profile-compact {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.avatar-image-compact {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid rgba(255, 255, 255, 0.3);
	}

	.avatar-placeholder-compact {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: bold;
		color: white;
		border: 2px solid rgba(255, 255, 255, 0.3);
	}

	.user-info-compact {
		flex: 1;
		min-width: 0;
	}

	.user-name-compact {
		font-size: 0.875rem;
		font-weight: bold;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.edit-btn-compact {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.edit-btn-compact:hover {
		color: var(--color-capa-orange);
		background: rgba(255, 165, 0, 0.1);
	}

	.logout-btn-compact {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logout-btn-compact:hover {
		color: white;
		background: rgba(255, 255, 255, 0.1);
	}

	/* Size variants */
	.small .profile-card {
		padding: 1rem;
		max-width: 250px;
	}

	.small .avatar-image,
	.small .avatar-placeholder {
		width: 60px;
		height: 60px;
	}

	.small .user-name {
		font-size: 1rem;
	}

	.large .profile-card {
		padding: 2rem;
		max-width: 350px;
	}

	.large .avatar-image,
	.large .avatar-placeholder {
		width: 100px;
		height: 100px;
	}

	.large .user-name {
		font-size: 1.5rem;
	}
</style>
