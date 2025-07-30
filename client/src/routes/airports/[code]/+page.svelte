<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	onMount(() => {
		const airportCode = $page.params.code;
		window.location.replace(`https://wiki.capacommunity.net/${airportCode}`);
	});
</script>
