<script>
	let { label, href, target = undefined, rel = undefined } = $props();
</script>

<a class="link" {href} {target} {rel}>{label}</a>

<style>
	.link {
		color: white;
		border-bottom: 0px solid transparent;
		border-top: 2px solid transparent;
		cursor: pointer;
		transition: border-bottom 0.2s ease-in-out;
		text-align: center;
		margin: 0 40px;
		font-family: eurostile;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		font-size: 1.5rem;
	}
	.link:hover {
		border-bottom: 4px solid white;
	}
</style>
