<script lang="ts">
	let {
		label,
		href,
		target = undefined,
		rel = undefined,
		onclick = undefined
	}: {
		label: string;
		href: string;
		target?: string;
		rel?: string;
		onclick?: () => void;
	} = $props();

	function handleClick(event: Event) {
		if (onclick) {
			event.preventDefault();
			onclick();
		}
	}
</script>

<a class="link" {href} {target} {rel} onclick={handleClick}>{label}</a>

<style>
	.link {
		color: white;
		border-bottom: 4px solid transparent;
		border-top: 2px solid transparent;
		cursor: pointer;
		transition: border-bottom 0.2s ease-in-out;
		text-align: center;
		margin: 0 20px;
		font-family: eurostile;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		font-size: 1.5rem;
	}
	.link:hover {
		border-bottom: 4px solid white;
	}
</style>
