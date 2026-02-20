<script lang="ts">
	import type { ForumPost } from '$lib/types';
	import { authStore } from '$lib/auth/store';
	import { forumService } from '$lib/services/forum/forumService';
	import { goto } from '$app/navigation';
	import AvatarCircle from '$lib/components/AvatarCircle.svelte';

	export let post: ForumPost;
	export let showCategory = false;
	export let compact = false;

	function formatTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'Just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
		if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
		return date.toLocaleDateString();
	}

	function isOwnPost(): boolean {
		return $authStore.user?.userId === post.authorId;
	}

	async function handleDeletePost(event: Event) {
		event.preventDefault();
		event.stopPropagation();

		const confirmed = confirm(
			'Are you sure you want to delete this post? This action cannot be undone.'
		);
		if (!confirmed) return;

		try {
			await forumService.deletePost(post.$id!);
			// Refresh the page or navigate back
			window.location.reload();
		} catch (err) {
			alert('Failed to delete post: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	}
</script>

<div class="post-card" class:compact class:pinned={post.isPinned}>
	<!-- Stats Section -->
	<div class="stats-section">
		<div class="stat">
			<span class="number">{post.commentCount}</span>
			<span class="label">replies</span>
		</div>
		<div class="stat">
			<span class="number">{post.views}</span>
			<span class="label">views</span>
		</div>
	</div>

	<!-- Content Section -->
	<div class="content-section">
		<div class="post-header">
			<a href="/forum/post/{post.$id}" class="post-title">
				{#if post.isPinned}
					<span class="material-icons pinned-icon">push_pin</span>
				{/if}
				{#if post.isLocked}
					<span class="material-icons locked-icon">lock</span>
				{/if}
				{post.title}
			</a>

			{#if showCategory && post.category}
				<a href="/forum/category/{post.category.slug}" class="category-link">
					{#if post.category.icon}
						<span
							class="material-icons category-icon"
							style="color: {post.category.color || 'var(--color-capa-orange)'}"
							>{post.category.icon}</span
						>
					{:else}
						<div
							class="category-dot"
							style="background: {post.category.color || 'var(--color-capa-orange)'}"
						></div>
					{/if}
					{post.category.name}
				</a>
			{/if}

			{#if post.tags && typeof post.tags === 'string' && post.tags.trim() && !compact}
				<div class="post-tags">
					{#each post.tags
						.split(',')
						.map((t) => t.trim())
						.filter((t) => t.length > 0)
						.slice(0, 3) as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>

		{#if post.excerpt && !compact}
			<p class="post-excerpt">{post.excerpt}</p>
		{/if}

		<div class="post-meta">
			<div class="author-info">
				<AvatarCircle
					userId={post.authorId}
					name={post.authorName}
					size={compact ? 32 : 40}
					class="post-author-avatar"
				/>
				<div class="author-meta">
					<span class="author">
						by <a href={`/profile/${post.authorId}`} class="profile-link">{post.authorName}</a>
					</span>
					<span class="created-date">{formatTimeAgo(post.$createdAt || '')}</span>
				</div>
			</div>

			<div class="post-actions">
				{#if post.lastActivity && post.lastActivity !== post.$createdAt}
					<div class="last-activity">
						<span>Last activity</span>
						<span class="activity-time">{formatTimeAgo(post.lastActivity)}</span>
					</div>
				{/if}

				{#if $authStore.isAuthenticated && isOwnPost()}
					<button onclick={handleDeletePost} class="delete-btn" title="Delete post">
						<span class="material-icons">delete</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.post-card {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 10px;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		display: grid;
		grid-template-columns: 80px 1fr;
		gap: 1rem;
		padding: 1.5rem;
		transition: all 0.3s ease;
		font-family: 'eurostile', sans-serif;
	}

	.post-card:hover {
		border-color: var(--color-capa-orange);
		background: rgba(0, 0, 0, 0.8);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(188, 48, 17, 0.2);
	}

	.post-card.pinned {
		border-color: var(--color-capa-yellow);
		background: rgba(251, 147, 31, 0.05);
	}

	.post-card.compact {
		padding: 1rem;
		grid-template-columns: 70px 1fr;
		gap: 0.75rem;
	}

	.stats-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		text-align: center;
	}

	.post-card.compact .stats-section {
		gap: 0.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .number {
		font-weight: bold;
		color: var(--color-capa-white);
		font-size: 1rem;
	}

	.post-card.compact .stat .number {
		font-size: 0.9rem;
	}

	.stat .label {
		font-size: 0.8rem;
		opacity: 0.7;
		color: rgba(255, 255, 255, 0.6);
	}

	.post-card.compact .stat .label {
		font-size: 0.7rem;
	}

	.content-section {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.post-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.post-title {
		font-size: 1.3rem;
		font-weight: bold;
		color: var(--color-capa-white);
		text-decoration: none;
		line-height: 1.4;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		transition: color 0.3s ease;
	}

	.post-card.compact .post-title {
		font-size: 1.1rem;
	}

	.post-title:hover {
		color: var(--color-capa-orange);
	}

	.pinned-icon {
		color: var(--color-capa-yellow);
		transform: rotate(45deg);
		font-size: 1.1rem;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.locked-icon {
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.1rem;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.category-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-capa-orange);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: bold;
		transition: color 0.3s ease;
		align-self: flex-start;
	}

	.category-link:hover {
		color: var(--color-capa-yellow);
	}

	.category-icon {
		font-size: 1.1rem;
	}

	.category-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.post-tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		background: rgba(188, 48, 17, 0.2);
		color: var(--color-capa-orange);
		padding: 0.25rem 0.75rem;
		border-radius: 15px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.post-excerpt {
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
		line-height: 1.5;
		font-size: 0.95rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.post-meta {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
		flex-wrap: wrap;
	}

	.post-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.post-card.compact .post-meta {
		font-size: 0.8rem;
	}

	.author-info {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.post-card.compact .author-info {
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-start;
	}

	.post-author-avatar {
		--avatar-border-color: rgba(255, 255, 255, 0.2);
		--avatar-bg-color: rgba(255, 255, 255, 0.08);
	}

	.author-meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.author {
		color: var(--color-capa-orange);
		font-weight: bold;
	}

	.author a {
		color: var(--color-capa-red);
		text-decoration: none;
		font-weight: 600;
	}

	.author a:hover {
		text-decoration: underline;
		color: var(--color-capa-orange);
	}

	.delete-btn {
		background: none;
		border: 1px solid rgba(255, 107, 157, 0.3);
		color: rgba(255, 107, 157, 0.7);
		padding: 0.5rem;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
	}

	.delete-btn:hover {
		border-color: #ff6b9d;
		color: #ff6b9d;
		background: rgba(255, 107, 157, 0.1);
		transform: scale(1.1);
	}

	.delete-btn .material-icons {
		font-size: 1.1rem;
	}

	.last-activity {
		display: flex;
		gap: 1rem;
		text-align: right;
		align-items: center;
	}

	.post-card.compact .last-activity {
		flex-direction: column;
		gap: 0.25rem;
		text-align: left;
		align-items: flex-end;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.post-card {
			grid-template-columns: 1fr;
			text-align: center;
			padding: 1rem;
		}

		.stats-section {
			flex-direction: row;
			justify-content: center;
			gap: 2rem;
		}

		.post-title {
			font-size: 1.1rem;
		}

		.post-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
			text-align: left;
		}

		.last-activity {
			flex-direction: column;
			gap: 0.25rem;
			text-align: left;
			align-items: flex-start;
		}

		.category-link {
			align-self: center;
		}

		.post-tags {
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.author-info {
			flex-direction: column;
			gap: 0.25rem;
			align-items: flex-start;
		}
	}
</style>
