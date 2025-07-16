<script lang="ts">
	import NavLink from './NavLink.svelte';
	import LoginButton from './LoginButton.svelte';
	import UserProfile from './UserProfile.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { authStore, initAuth0 } from '$lib/auth/store';

	let menuOpen: boolean = false;

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	onMount(() => {
		// Initialize Auth0
		initAuth0();

		function checkWindowSize() {
			if (window.innerWidth > 1000) {
				menuOpen = false;
			}
		}

		checkWindowSize();
		window.addEventListener('resize', checkWindowSize);

		return () => {
			window.removeEventListener('resize', checkWindowSize);
		};
	});
</script>

<div class="nav">
	<button
		class="logo-button"
		onclick={() => (window.location.href = '/')}
		aria-label="Go to home page"
	>
		<img class="logo" src="capa-logo.png" alt="CAPA Logo" />
	</button>
	<!-- Hamburger icon for mobile -->
	<button
		class="hamburger"
		class:open={menuOpen}
		onclick={toggleMenu}
		aria-label="Toggle navigation menu"
		aria-expanded={menuOpen}
	>
		<span></span>
		<span></span>
		<span></span>
	</button>
	<!-- Nav links (desktop) -->
	<div class="nav-links">
		<NavLink
			label="Wiki"
			href="https://wiki.capacommunity.net"
			target="_blank"
			rel="noopener noreferrer"
		/>
		<NavLink label="Guides" href="/guides" />
		<NavLink label="Community" href="/community" />
		<NavLink label="Map" href="/map" />
		<NavLink label="Donate" href="/donate" />
		{#if $authStore.isAuthenticated}
			<NavLink label="Profile" href="/profile" />
		{/if}

		<!-- Auth section -->
		<div class="auth-section">
			{#if $authStore.isAuthenticated}
				<UserProfile showFullProfile={false} />
			{:else if !$authStore.isLoading}
				<LoginButton variant="minimal" size="small" />
			{/if}
		</div>
	</div>
</div>

<!-- Mobile menu overlay with animation -->
{#if menuOpen}
	<div class="mobile-menu" transition:fade={{ duration: 250 }}>
		<NavLink
			label="Wiki"
			href="https://wiki.capacommunity.net"
			target="_blank"
			rel="noopener noreferrer"
		/>
		<NavLink label="Guides" href="/guides" />
		<NavLink label="Community" href="/community" />
		<NavLink label="Map" href="/map" />
		<NavLink label="Donate" href="/donate" />
		{#if $authStore.isAuthenticated}
			<NavLink label="Profile" href="/profile" />
		{/if}

		<!-- Mobile auth section -->
		<!-- <div class="mobile-auth">
			{#if $authStore.isAuthenticated}
				<UserProfile showFullProfile={false} size="small" />
			{:else if !$authStore.isLoading}
				<LoginButton variant="minimal" size="normal" />
			{/if}
		</div> -->
	</div>
{/if}

<style>
	.logo-button {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		left: 0px;
		flex-shrink: 0;
	}

	.logo {
		height: 150px;
		width: auto;
		min-width: 100px;
	}
	.nav {
		position: fixed;
		z-index: 1002;
		height: 70px;
		width: 100vw;
		background-image: linear-gradient(
			180deg,
			var(--color-capa-red) 25%,
			var(--color-capa-orange) 25%,
			var(--color-capa-orange) 50%,
			var(--color-capa-yelorange) 50%,
			var(--color-capa-yelorange) 75%,
			var(--color-capa-yellow) 75%,
			var(--color-capa-yellow) 100%
		);
		background-size: 50px 70px;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 0 2rem;
		filter: drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.5));
	}
	.nav-links {
		display: flex;
		gap: 2rem;
		align-items: center;
		flex-shrink: 1;
		min-width: 0;
	}

	.auth-section {
		margin-left: 1rem;
	}
	.hamburger {
		display: none;
		flex-direction: column;
		background: none;
		border: none;
		cursor: pointer;
		gap: 5px;
		width: 30px;
		height: 30px;
		justify-content: center;
		align-items: center;
		transition: transform 0.3s;
		position: relative;
	}
	.hamburger span {
		display: block;
		width: 30px;
		height: 4px;
		background: #fff;
		border-radius: 2px;
		transition: all 0.3s;
		position: relative;
	}
	.hamburger.open span:nth-child(1) {
		transform: translateY(9px) rotate(45deg);
	}
	.hamburger.open span:nth-child(2) {
		opacity: 0;
	}
	.hamburger.open span:nth-child(3) {
		transform: translateY(-9px) rotate(-45deg);
	}
	@media (max-width: 1200px) {
		.nav-links {
			gap: 1rem;
		}
	}

	@media (max-width: 1000px) {
		.nav-links {
			display: none;
		}
		.hamburger {
			display: flex;
		}
		.nav {
			padding: 0 1rem;
		}
	}
	.mobile-menu {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		opacity: 1;
		transition: opacity 0.25s;
	}
	.mobile-menu :global(.link) {
		margin: 1rem 0;
		font-size: 3rem;
		color: #fff;
	}

	.mobile-auth {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		justify-content: center;
	}
</style>
