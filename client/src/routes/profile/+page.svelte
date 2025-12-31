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

	.profile-section {
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

		.profile-section {
			padding: 1.5rem;
		}
	}
</style>
