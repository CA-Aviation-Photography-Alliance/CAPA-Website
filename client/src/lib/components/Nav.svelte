<script>
	import NavLink from './NavLink.svelte';
</script>

<div class="nav">
	<img class="logo" src="capa-logo.png" onclick={() => (window.location.href = '/')} />
	<NavLink
		label="Wiki"
		href="https://wiki.bitstream.io"
		target="_blank"
		rel="noopener noreferrer"
	/>
	<NavLink label="Guides" href="/guides" />
	<NavLink label="Community" href="/community" />
	<NavLink label="Map" href="/map" />
	<NavLink label="Donate" href="/donate" />
</div>

<style>
	.logo {
		left: 0px;
		cursor: pointer;
		height: 150px;
	}
	.nav {
		position: fixed;
		z-index: 999;
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
		justify-content: space-around;
		align-items: center;
		filter: drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.5));
	}
</style>
