<script lang="ts">
	import { authStore } from '$lib/auth/store';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import UserProfile from '$lib/components/UserProfile.svelte';
</script>

<AuthGuard>
	<div class="content-container">
		<div class="profile-page">
			<div class="header">
				<h1>User Profile</h1>
				<p>Manage your account settings and preferences</p>
			</div>

			<div class="profile-content">
				<div class="profile-section">
					<h2>Account Information</h2>
					<UserProfile showFullProfile={true} size="large" />
				</div>

				{#if $authStore.user}
					<div class="user-details">
						<h2>Account Details</h2>
						<div class="details-grid">
							<div class="detail-item">
								<label>Name</label>
								<span>{$authStore.user.name || 'Not provided'}</span>
							</div>
							<div class="detail-item">
								<label>Email</label>
								<span>{$authStore.user.email}</span>
							</div>
							<div class="detail-item">
								<label>Nickname</label>
								<span>{$authStore.user.nickname || 'Not set'}</span>
							</div>
							<div class="detail-item">
								<label>Email Verified</label>
								<span class="status {$authStore.user.email_verified ? 'verified' : 'unverified'}">
									{$authStore.user.email_verified ? 'Verified' : 'Unverified'}
								</span>
							</div>
							<div class="detail-item">
								<label>Last Updated</label>
								<span
									>{$authStore.user.updated_at
										? new Date($authStore.user.updated_at).toLocaleDateString()
										: 'Unknown'}</span
								>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</AuthGuard>

<style>
	.content-container {
		padding-top: 70px;
		min-height: 100vh;
		background-color: var(--color-capa-black);
		color: var(--color-capa-white);
	}

	.profile-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'eurostile', sans-serif;
	}

	.header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.header h1 {
		font-size: 2.5rem;
		margin: 0 0 1rem 0;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header p {
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.1rem;
		margin: 0;
	}

	.profile-content {
		display: grid;
		gap: 2rem;
	}

	.profile-section,
	.user-details,
	.preferences-section {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.profile-section {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: var(--color-capa-white);
	}

	.details-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.detail-item label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.detail-item span {
		font-size: 1rem;
		color: var(--color-capa-white);
		word-break: break-word;
	}

	.status {
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		width: fit-content;
	}

	.status.verified {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.status.unverified {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.coming-soon {
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
		text-align: center;
		padding: 2rem;
		border: 2px dashed rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		margin: 0;
	}

	@media (max-width: 768px) {
		.profile-page {
			padding: 1rem;
		}

		.header h1 {
			font-size: 2rem;
		}

		.details-grid {
			grid-template-columns: 1fr;
		}

		.profile-section,
		.user-details,
		.preferences-section {
			padding: 1.5rem;
		}
	}
</style>
