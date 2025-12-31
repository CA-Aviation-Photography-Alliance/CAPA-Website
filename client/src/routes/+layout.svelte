<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/auth/store.js';

	let { children } = $props();

	// Auth is automatically initialized when the auth service module loads
</script>

<svelte:head>
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
</svelte:head>

<Nav />
{@render children()}

<!-- Show loading state while auth is initializing -->
{#if $authStore.isLoading}
	<div class="auth-loading-overlay">
		<div class="spinner"></div>
	</div>
{/if}

<style>
	:global(body) {
		background: var(--color-capa-black);
	}

	.auth-loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: var(--color-capa-black);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid var(--color-capa-red);
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
