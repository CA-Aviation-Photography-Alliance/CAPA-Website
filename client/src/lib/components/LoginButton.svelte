<script lang="ts">
	import { authStore, login } from '$lib/auth/store';

	let {
		redirectTo = undefined,
		variant = 'primary',
		size = 'normal'
	}: {
		redirectTo?: string;
		variant?: 'primary' | 'secondary' | 'minimal';
		size?: 'small' | 'normal' | 'large';
	} = $props();

	async function handleLogin() {
		try {
			await login(redirectTo);
		} catch (error) {
			console.error('Login failed:', error);
		}
	}
</script>

<button class="login-btn {variant} {size}" onclick={handleLogin} disabled={$authStore.isLoading}>
	{#if $authStore.isLoading}
		<span class="spinner"></span>
		Signing in...
	{:else}
		Sign In
	{/if}
</button>

<style>
	.login-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: none;
		border-radius: 6px;
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.login-btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* Variants */
	.primary {
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		color: white;
		border: 2px solid transparent;
	}

	.primary:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--color-capa-orange), var(--color-capa-yelorange));
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.secondary {
		background: transparent;
		color: var(--color-capa-red);
		border: 2px solid var(--color-capa-red);
	}

	.secondary:hover:not(:disabled) {
		background: var(--color-capa-red);
		color: white;
		transform: translateY(-1px);
	}

	.minimal {
		background: transparent;
		color: white;
		border: 2px solid white;
	}

	.minimal:hover:not(:disabled) {
		background: white;
		color: var(--color-capa-red);
		transform: translateY(-1px);
	}

	/* Sizes */
	.small {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.normal {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	.large {
		padding: 1rem 2rem;
		font-size: 1.125rem;
	}

	/* Spinner animation */
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
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
</style>
