<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let event;
	export let compact = false;
	export let showEditButton = false;
	export let onEdit = () => {};

	const dispatch = createEventDispatcher();

	let status = '';
	const now = new Date();
	const start = new Date(event.startdate);
	const end = new Date(event.enddate);

	if (now < start) {
		status = 'Upcoming';
	} else if (now >= start && now <= end) {
		status = 'Live';
	} else {
		status = 'Past';
	}

	function handleEdit() {
		dispatch('edit', event);
	}
</script>

<div class="event-card" class:compact>
	<div class="event-status {status.toLowerCase()}">{status}</div>
	<h3 class="event-title">{event.title}</h3>
	<div class="event-meta">
		<span class="event-type">{event.type}</span>
		<span class="event-date">
			{new Date(event.startdate).toLocaleString()} – {new Date(event.enddate).toLocaleString()}
		</span>
	</div>
	<a
		class="view-details-btn"
		href={`/events/${event.$id}`}
		target="_blank"
		rel="noopener noreferrer"
	>
		View Details
	</a>
	{#if event.creator}
		<div class="event-creator">
			By {event.creator.nickname || event.creator.name || event.creator.email || 'Unknown'}
		</div>
	{/if}
	{#if showEditButton}
		<button class="edit-btn" on:click={handleEdit}>Edit</button>
	{/if}
</div>

<style>
	.event-card {
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
		padding: 1rem;
		margin-bottom: 1rem;
		font-family: inherit;
		position: relative;
	}
	.event-title {
		font-size: 1.2rem;
		margin-bottom: 0.3em;
		color: #bc3011;
	}
	.event-status {
		position: absolute;
		top: 1rem;
		right: 1rem;
		font-size: 0.95em;
		font-weight: 600;
		padding: 0.15em 0.7em;
		border-radius: 1em;
		z-index: 2;
	}
	.event-status.upcoming {
		background: #f0fdf4;
		color: #10b981;
	}
	.event-status.live {
		background: #fff7ed;
		color: #bc3011;
	}
	.event-status.past {
		background: #f3f4f6;
		color: #888;
	}
	.event-meta {
		font-size: 0.95em;
		color: #555;
		margin-bottom: 0.5em;
		display: flex;
		gap: 1.2em;
		flex-wrap: wrap;
	}
	.event-type {
		background: #f0fdf4;
		color: #10b981;
		padding: 0.15em 0.6em;
		border-radius: 1em;
		font-weight: 600;
		font-size: 0.95em;
	}
	.event-date {
		font-size: 0.98em;
		color: #666;
	}
	.event-description {
		margin-bottom: 0.5em;
		font-size: 0.98em;
		color: #444;
	}
	.event-creator {
		font-size: 0.9em;
		color: #888;
		margin-top: 0.5em;
	}
	.edit-btn {
		margin-top: 0.7em;
		background: #bc3011;
		color: #fff;
		border: none;
		border-radius: 5px;
		padding: 0.3em 1em;
		font-size: 1em;
		cursor: pointer;
		transition: background 0.18s;
	}
	.edit-btn:hover {
		background: #a02b0f;
	}
	.compact {
		padding: 0.7rem;
		font-size: 0.97em;
	}
	.view-details-btn {
		display: inline-block;
		margin-top: 0.7em;
		background: #10b981;
		color: #fff;
		border: none;
		border-radius: 5px;
		padding: 0.4em 1.2em;
		font-size: 1em;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.18s;
	}
	.view-details-btn:hover {
		background: #059669;
	}
</style>
