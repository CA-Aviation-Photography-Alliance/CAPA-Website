<script lang="ts">
	import { onMount } from 'svelte';
	import { forumService } from '$lib/services/forum/forumService';
	import { authStore } from '$lib/auth/store';
	import type { ForumCategory, ForumStats } from '$lib/types';

	let categories: ForumCategory[] = [];
	let stats: ForumStats | null = null;
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			const [categoriesResult, statsResult] = await Promise.all([
				forumService.getCategories(),
				forumService.getForumStats()
			]);

			categories = categoriesResult;
			stats = statsResult;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load forum data';
		} finally {
			loading = false;
		}
	});

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
</script>

<svelte:head>
	<title>CAPA Community Forum</title>
	<meta
		name="description"
		content="Join the CAPA community discussions on aviation photography, events, and more."
	/>
</svelte:head>

<div class="forum-container">
	<div class="spacer"></div>

	<!-- Header -->
	<div class="forum-header">
		<div class="header-content">
			<h1>Community Forum</h1>
			<p class="header-subtitle">Connect with fellow aviation photographers and enthusiasts</p>

			{#if $authStore.isAuthenticated}
				<a href="/forum/create" class="create-post-btn">
					<span class="material-icons">add</span>
					<span class="btn-label">New Post</span>
				</a>
			{:else}
				<p class="login-prompt">
					<span class="material-icons">info</span>
					Sign in to create posts and join discussions
				</p>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="spinner"></div>
			<p>Loading forum...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<span class="material-icons">error</span>
			<h3>Failed to load forum</h3>
			<p>{error}</p>
			<button onclick={() => window.location.reload()} class="retry-btn">Try Again</button>
		</div>
	{:else}
		<div class="forum-content">
			<!-- Categories -->
			<div class="categories-section">
				<h2>Forum Categories</h2>

				<div class="categories-grid">
					{#each categories as category, index}
						<a
							href="/forum/category/{category.slug}"
							class="category-card"
						>
							<div class="category-header">
								{#if category.icon}
									<span
										class="material-icons category-icon"
										style="color: {category.color || 'var(--color-capa-orange)'}"
										>{category.icon}</span
									>
								{:else}
									<div
										class="category-color-dot"
										style="background: {category.color || 'var(--color-capa-orange)'}"
									></div>
								{/if}
								<h3>{category.name}</h3>
							</div>

							<p class="category-description">{category.description}</p>
						</a>
					{/each}
				</div>
			</div>

			<!-- Recent Activity -->
			{#if stats?.recentPosts?.length > 0}
				<div class="recent-section">
					<h2>Recent Posts</h2>

					<div class="recent-posts">
						{#each stats.recentPosts as post, index}
							<a
								href="/forum/post/{post.$id}"
								class="recent-post"
							>
								<div class="post-info">
									<h4>{post.title}</h4>
									<div class="post-meta">
										<span class="author">by {post.authorName}</span>
										<span class="time">{formatTimeAgo(post.$createdAt || '')}</span>
										<span class="stats">
											{post.views} views • {post.commentCount} comments
										</span>
									</div>
								</div>

								{#if post.isPinned}
									<span class="material-icons pinned-icon">push_pin</span>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(.material-icons) {
		vertical-align: middle;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.forum-container {
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		line-height: 1.6;
	}

	.forum-container * {
		box-sizing: border-box;
		text-rendering: optimizeLegibility;
	}

	.spacer {
		height: 70px;
	}

	.forum-header {
		background-color: rgba(188, 48, 17, 0.2);
		padding: 4rem 2rem;
		border-bottom: 2px solid rgba(188, 48, 17, 0.3);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.forum-header h1 {
		font-size: 3.5rem;
		font-weight: bold;
		margin: 0 0 1rem 0;
		color: var(--color-capa-white);
		line-height: 1.2;
	}

	.header-subtitle {
		font-size: 1.2rem;
		margin: 0 0 2rem 0;
		opacity: 0.9;
	}

	.create-post-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		gap: 0.6rem;
		background: linear-gradient(45deg, var(--color-capa-red), var(--color-capa-orange));
		color: var(--color-capa-white);
		padding: 0.6rem 1.2rem;
		border-radius: 24px;
		text-decoration: none;
		font-weight: bold;
		transition: all 0.3s ease;
		font-size: 0.95rem;
		box-shadow: 0 4px 15px rgba(188, 48, 17, 0.3);
	}

	.create-post-btn .btn-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		transform: translateY(2px);
	}

	.create-post-btn .material-icons {
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.create-post-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(188, 48, 17, 0.4);
	}

	.login-prompt {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		opacity: 0.7;
		font-style: italic;
	}

	.forum-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.loading-container,
	.error-container {
		text-align: center;
		padding: 4rem 2rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid var(--color-capa-red);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem auto;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error-container .material-icons {
		font-size: 3rem;
		color: var(--color-capa-red);
		margin-bottom: 1rem;
	}

	.retry-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 20px;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.3s ease;
		margin-top: 1rem;
	}

	.retry-btn:hover {
		background: var(--color-capa-red);
	}

	.categories-section,
	.recent-section {
		margin-bottom: 3rem;
	}

	.categories-section h2,
	.recent-section h2 {
		font-size: 2rem;
		margin-bottom: 1.5rem;
		color: var(--color-capa-white);
	}

	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.category-card {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		padding: 10px;
		text-decoration: none;
		color: var(--color-capa-white);
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		transition: all 0.3s ease;
		display: block;
	}

	.category-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 10px 30px rgba(188, 48, 17, 0.3);
		border-color: var(--color-capa-orange);
	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		line-height: 1.4;
	}

	.category-icon {
		font-size: 2rem;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.category-color-dot {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.category-header h3 {
		font-size: 1.5rem;
		margin: 0;
		color: var(--color-capa-white);
		line-height: 1;
		display: inline-flex;
		align-items: center;
		transform: translateY(2px);
	}

	.category-description {
		margin: 1rem 0;
		opacity: 0.9;
		line-height: 1.6;
		text-align: left;
	}

	.category-stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.last-post {
		font-size: 0.9rem;
	}

	.last-post-title {
		display: block;
		color: var(--color-capa-white);
		margin-bottom: 0.25rem;
	}

	.last-post-meta {
		display: flex;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.8rem;
	}

	.recent-posts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.recent-post {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 10px;
		padding: 1.5rem;
		text-decoration: none;
		color: var(--color-capa-white);
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		transition: all 0.3s ease;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.recent-post:hover {
		border-color: var(--color-capa-orange);
		background: rgba(0, 0, 0, 0.8);
	}

	.post-info h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		color: var(--color-capa-white);
		line-height: 1;
		display: inline-flex;
		align-items: center;
		transform: translateY(1px);
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.pinned-icon {
		color: var(--color-capa-yellow);
		transform: rotate(45deg);
		line-height: 1;
		display: inline-flex;
		align-items: center;
	}

	@media (max-width: 768px) {
		.forum-header {
			padding: 2rem 1rem;
		}

		.forum-header h1 {
			font-size: 2.5rem;
		}

		.forum-content {
			padding: 1rem;
		}

		.categories-grid {
			grid-template-columns: 1fr;
		}

		.category-card {
			padding: 1.5rem;
		}

		.post-meta {
			flex-direction: column;
			gap: 0.25rem;
		}

		.recent-post {
			padding: 1rem;
		}
	}
</style>
