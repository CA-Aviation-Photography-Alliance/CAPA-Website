<script>
	import NavLink from './NavLink.svelte';
</script>

<div class="nav">
	<NavLink label="Home" href="/" />
	<NavLink label="Airports" href="/airports" />
	<NavLink label="Photography" href="/photography" />
	<NavLink label="Knowledge" href="/knowledge" />
	<NavLink label="Events" href="/events" />
	<NavLink label="Forum" href="/forum" />
</div>

<style>
	.nav {
		position: fixed;
		z-index: 999;
		height: 50px;
		width: 100vw;
		background-color: #3e4163;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		filter: drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.5));
	}
</style>
