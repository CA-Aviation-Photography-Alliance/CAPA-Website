<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Event {
		_id: string;
		startdate: string;
		enddate: string;
		type: string;
		title: string;
		description: string;
		creator:
			| {
					userId: string;
					email: string;
					name: string;
					nickname?: string;
					picture?: string;
			  }
			| string;
		createdAt: string;
		updatedAt: string;
		isUpcoming?: boolean;
		durationHours?: number;
	}

	export let event: Event;
	export let showEditButton = false;
	export let compact = false;

	const dispatch = createEventDispatcher();

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatDateRange(): string {
		const start = new Date(event.startdate);
		const end = new Date(event.enddate);

		// Same day
		if (start.toDateString() === end.toDateString()) {
			return `${formatDate(event.startdate)} • ${formatTime(event.startdate)} - ${formatTime(event.enddate)}`;
		}

		// Different days
		return `${formatDate(event.startdate)} ${formatTime(event.startdate)} - ${formatDate(event.enddate)} ${formatTime(event.enddate)}`;
	}

	function isUpcoming(): boolean {
		return new Date(event.startdate) > new Date();
	}

	function isOngoing(): boolean {
		const now = new Date();
		return new Date(event.startdate) <= now && now <= new Date(event.enddate);
	}

	function getEventStatus(): { label: string; class: string } {
		if (isOngoing()) {
			return { label: 'Live', class: 'status-live' };
		}
		if (isUpcoming()) {
			return { label: 'Upcoming', class: 'status-upcoming' };
		}
		return { label: 'Past', class: 'status-past' };
	}

	function handleEdit() {
		dispatch('edit', event);
	}

	function truncateDescription(text: string, maxLength: number = 150): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength).trim() + '...';
	}

	// Helper function to get creator name (handles both string and object formats)
	function getCreatorName(): string {
		if (typeof event.creator === 'string') {
			return event.creator;
		}
		return event.creator?.nickname || event.creator?.name || 'Unknown User';
	}

	// Helper function to get creator initial
	function getCreatorInitial(): string {
		const name = getCreatorName();
		return name.charAt(0).toUpperCase();
	}

	// Helper function to get creator picture
	function getCreatorPicture(): string | null {
		if (typeof event.creator === 'object' && event.creator?.picture) {
			return event.creator.picture;
		}
		return null;
	}
</script>

<div class="event-card" class:compact>
	<div class="event-header">
		<div class="event-type">
			<span class="type-badge">{event.type}</span>
			<span class="status-badge {getEventStatus().class}">
				{getEventStatus().label}
			</span>
		</div>
		{#if showEditButton}
			<button class="edit-button" onclick={handleEdit} title="Edit event">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
				</svg>
			</button>
		{/if}
	</div>

	<div class="event-content">
		<h3 class="event-title">{event.title}</h3>

		<div class="event-time">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="icon"
			>
				<circle cx="12" cy="12" r="10"></circle>
				<polyline points="12,6 12,12 16,14"></polyline>
			</svg>
			<span>{formatDateRange()}</span>
		</div>

		<div class="event-description">
			{#if compact}
				<p>{truncateDescription(event.description, 100)}</p>
			{:else}
				<p>{truncateDescription(event.description)}</p>
			{/if}
		</div>

		<div class="event-footer">
			<div class="creator-info">
				{#if getCreatorPicture()}
					<img src={getCreatorPicture()} alt={getCreatorName()} class="creator-avatar" />
				{:else}
					<div class="creator-avatar-placeholder">
						{getCreatorInitial()}
					</div>
				{/if}
				<span class="creator-name">
					{getCreatorName()}
				</span>
			</div>

			{#if event.durationHours}
				<div class="duration">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="icon"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12,6 12,12 16,14"></polyline>
					</svg>
					<span>{event.durationHours}h</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.event-card {
		background: white;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.event-card:hover {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.event-card.compact {
		font-size: 0.875rem;
	}

	.event-header {
		padding: 1rem 1rem 0;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.event-type {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.type-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-live {
		background: #dcfce7;
		color: #166534;
	}

	.status-upcoming {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.status-past {
		background: #f3f4f6;
		color: #6b7280;
	}

	.edit-button {
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.edit-button:hover {
		color: #bc3011;
		background: #f3f4f6;
	}

	.event-content {
		padding: 0.5rem 1rem 1rem;
	}

	.event-title {
		margin: 0 0 0.75rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		line-height: 1.3;
	}

	.compact .event-title {
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}

	.event-time {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.compact .event-time {
		margin-bottom: 0.5rem;
		font-size: 0.8125rem;
	}

	.event-description {
		margin-bottom: 1rem;
	}

	.compact .event-description {
		margin-bottom: 0.75rem;
	}

	.event-description p {
		margin: 0;
		color: #4b5563;
		line-height: 1.5;
		font-size: 0.875rem;
	}

	.compact .event-description p {
		font-size: 0.8125rem;
	}

	.event-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.75rem;
		border-top: 1px solid #f3f4f6;
	}

	.compact .event-footer {
		padding-top: 0.5rem;
	}

	.creator-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.creator-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}

	.creator-avatar-placeholder {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #bc3011;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.compact .creator-avatar,
	.compact .creator-avatar-placeholder {
		width: 20px;
		height: 20px;
		font-size: 0.625rem;
	}

	.creator-name {
		color: #6b7280;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.compact .creator-name {
		font-size: 0.75rem;
	}

	.duration {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #6b7280;
		font-size: 0.75rem;
	}

	.icon {
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.event-header {
			padding: 0.75rem 0.75rem 0;
		}

		.event-content {
			padding: 0.5rem 0.75rem 0.75rem;
		}

		.event-type {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.event-footer {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
