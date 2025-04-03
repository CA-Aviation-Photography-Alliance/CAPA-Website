<script>
	let { label } = $props();
</script>

<div class="link">{label}</div>

<style>
	.link {
		color: white;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: border-bottom 0.2s ease-in-out;
		text-align: center;
		margin: 0 20px;
	}
	.link:hover {
		border-bottom: 2px solid white;
	}
</style>
