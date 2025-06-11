<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	let { children } = $props();
</script>

<Nav />
{@render children()}

<style>
	:global(body) {
		background: var(--color-capa-black);
	}
</style>
