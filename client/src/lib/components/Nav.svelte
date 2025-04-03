<script>
	import NavLink from './NavLink.svelte';
</script>

<div class="nav">
	<NavLink label="Home" />
	<NavLink label="Airports" />
	<NavLink label="Photography" />
	<NavLink label="Knowledge" />
	<NavLink label="Events" />
	<NavLink label="Forum" />
</div>

<style>
	.nav {
		height: 50px;
		width: 100vw;
		background-color: #3e4163;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
	}
</style>
