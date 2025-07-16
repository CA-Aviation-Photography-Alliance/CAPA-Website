<script lang="ts">
	import { authStore } from '$lib/auth/store';
	import LoginButton from './LoginButton.svelte';
	import type { Snippet } from 'svelte';

	let {
		requireAuth = true,
		fallbackComponent = null,
		showLoading = true,
		redirectTo = undefined,
		children
	}: {
		requireAuth?: boolean;
		fallbackComponent?: Snippet | null;
		showLoading?: boolean;
		redirectTo?: string;
		children: Snippet;
	} = $props();
</script>

{#if $authStore.isLoading && showLoading}
	<div class="auth-loading">
		<div class="spinner"></div>
		<p>Loading...</p>
	</div>
{:else if requireAuth && !$authStore.isAuthenticated}
	<div class="auth-required">
		{#if fallbackComponent}
			{@render fallbackComponent()}
		{:else}
			<div class="auth-prompt">
				<div class="auth-card">
					<h2>Authentication Required</h2>
					<p>You need to sign in to access this content.</p>

					{#if $authStore.error}
						<div class="error-message">
							{$authStore.error}
						</div>
					{/if}

					<LoginButton {redirectTo} />
				</div>
			</div>
		{/if}
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.auth-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid var(--color-capa-red);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.auth-required {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		padding: 2rem;
	}

	.auth-prompt {
		width: 100%;
		max-width: 400px;
	}

	.auth-card {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		text-align: center;
		color: white;
		font-family: 'eurostile', sans-serif;
	}

	.auth-card h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.auth-card p {
		margin: 0 0 1.5rem 0;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.error-message {
		background: rgba(220, 53, 69, 0.2);
		border: 1px solid rgba(220, 53, 69, 0.5);
		color: #ff6b7a;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}
</style>
