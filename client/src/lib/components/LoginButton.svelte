<script lang="ts">
	import { authStore } from '$lib/auth/store';
	import LoginModal from './LoginModal.svelte';

	let {
		variant = 'primary',
		size = 'normal',
		text = 'Sign In'
	}: {
		variant?: 'primary' | 'secondary' | 'minimal';
		size?: 'small' | 'normal' | 'large';
		text?: string;
	} = $props();

	let showModal = $state(false);

	function handleLoginClick() {
		showModal = true;
	}

	function handleLoginSuccess() {
		showModal = false;
	}
</script>

<button
	class="login-btn {variant} {size}"
	onclick={handleLoginClick}
	disabled={$authStore.isLoading}
>
	{#if $authStore.isLoading}
		<span class="spinner"></span>
		Signing in...
	{:else}
		{text}
	{/if}
</button>

<LoginModal bind:isOpen={showModal} onSuccess={handleLoginSuccess} />

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

	.primary {
		background: var(--color-capa-red);
		color: white;
		border: 2px solid transparent;
	}

	.primary:hover:not(:disabled) {
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
		background: red !important;
		color: white !important;
		border: 2px solid yellow !important;
		backdrop-filter: blur(10px);
		border-radius: 8px;
		min-width: 80px;
		position: relative;
		z-index: 1000;
		visibility: visible !important;
		display: inline-flex !important;
		opacity: 1 !important;
	}

	.minimal:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.4);
		transform: translateY(-1px);
	}

	/* Sizes */
	.small {
		padding: 0.5rem 0.75rem;
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
