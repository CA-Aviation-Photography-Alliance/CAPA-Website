<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { forumService } from '$lib/services/forum/forumService';
	import { authStore } from '$lib/auth/store';
	import type { ForumCategory, ForumPost, ForumFilters } from '$lib/types';
	import { fade, fly } from 'svelte/transition';

	let category: ForumCategory | null = null;
	let posts: ForumPost[] = [];
	let loading = true;
	let loadingMore = false;
	let error: string | null = null;
	let hasMore = false;
	let currentPage = 1;

	// Filters
	let sortBy: 'lastActivity' | 'createdAt' | 'views' | 'comments' = 'lastActivity';
	let sortOrder: 'asc' | 'desc' = 'desc';
	let searchQuery = '';

	$: slug = $page.params.slug as string;

	onMount(() => {
		loadCategory();
	});

	$: if (slug) {
		loadCategory();
	}

	async function loadCategory() {
		if (!slug) {
			error = 'Invalid category';
			return;
		}

		loading = true;
		error = null;
		posts = [];
		currentPage = 1;

		try {
			// Load category info
			category = await forumService.getCategoryBySlug(slug);
			if (!category) {
				error = 'Category not found';
				return;
			}

			// Load posts for this category
			await loadPosts(true);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load category';
		} finally {
			loading = false;
		}
	}

	async function loadPosts(reset = false) {
		if (reset) {
			posts = [];
			currentPage = 1;
			loadingMore = false;
		} else {
			loadingMore = true;
		}

		try {
			const filters: ForumFilters = {
				page: currentPage,
				limit: 20,
				categoryId: category?.$id,
				sortBy,
				sortOrder,
				search: searchQuery || undefined
			};

			const result = await forumService.getPosts(filters);

			if (reset) {
				posts = result.posts;
			} else {
				posts = [...posts, ...result.posts];
			}

			hasMore = result.hasMore;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load posts';
		} finally {
			loadingMore = false;
		}
	}

	async function loadMorePosts() {
		if (loadingMore || !hasMore) return;
		currentPage++;
		await loadPosts(false);
	}

	async function handleSortChange() {
		await loadPosts(true);
	}

	async function handleSearch() {
		await loadPosts(true);
	}

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
	<title>{category?.name || 'Category'} - CAPA Forum</title>
	<meta name="description" content={category?.description || 'Forum category'} />
</svelte:head>

<div class="category-container">
	<div class="spacer"></div>

	{#if loading}
		<div class="loading-container">
			<div class="spinner"></div>
			<p>Loading category...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<span class="material-icons">error</span>
			<h3>Failed to load category</h3>
			<p>{error}</p>
			<button onclick={() => goto('/forum')} class="back-btn">Back to Forum</button>
		</div>
	{:else if category}
		<div class="category-content">
			<!-- Category Header -->
			<div class="category-header" in:fade={{ duration: 500 }}>
				<div class="header-content">
					<div class="breadcrumb">
						<a href="/forum">Forum</a>
						<span class="material-icons">chevron_right</span>
						<span>{category.name}</span>
					</div>

					<div class="category-info">
						<div class="category-title">
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
							<h1>{category.name}</h1>
						</div>
						<p class="category-description">{category.description}</p>

						{#if $authStore.isAuthenticated}
							<a href="/forum/create?category={category.$id}" class="create-post-btn">
								<span class="material-icons">add</span>
								New Post
							</a>
						{/if}
					</div>
				</div>
			</div>

			<!-- Filters and Search -->
			<div class="filters-section" in:fly={{ y: 20, duration: 500, delay: 200 }}>
				<div class="filters-content">
					<div class="search-box">
						<span class="material-icons">search</span>
						<input
							type="text"
							placeholder="Search posts in {category.name}..."
							bind:value={searchQuery}
							onkeypress={(e) => e.key === 'Enter' && handleSearch()}
						/>
						<button onclick={handleSearch} class="search-btn">Search</button>
					</div>

					<div class="sort-controls">
						<label for="sortBy">Sort by:</label>
						<select id="sortBy" bind:value={sortBy} onchange={handleSortChange}>
							<option value="lastActivity">Latest Activity</option>
							<option value="createdAt">Date Created</option>

							<option value="views">Most Views</option>
							<option value="comments">Most Comments</option>
						</select>

						<select bind:value={sortOrder} onchange={handleSortChange}>
							<option value="desc">Descending</option>
							<option value="asc">Ascending</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Posts List -->
			<div class="posts-section" in:fly={{ y: 20, duration: 500, delay: 300 }}>
				{#if posts.length === 0}
					<div class="empty-state">
						<span class="material-icons">forum</span>
						<h3>No posts yet</h3>
						<p>Be the first to start a discussion in {category.name}!</p>
						{#if $authStore.isAuthenticated}
							<a href="/forum/create?category={category.$id}" class="create-first-btn">
								Create First Post
							</a>
						{/if}
					</div>
				{:else}
					<div class="posts-list">
						{#each posts as post, index (post.$id)}
							<div
								class="post-item"
								class:pinned={post.isPinned}
								in:fly={{ y: 20, duration: 300, delay: index * 50 }}
							>
								<div class="post-stats">
									<div class="stat">
										<span class="number">{post.commentCount}</span>
										<span class="label">replies</span>
									</div>
									<div class="stat">
										<span class="number">{post.views}</span>
										<span class="label">views</span>
									</div>
								</div>

								<div class="post-content">
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

										{#if post.tags && typeof post.tags === 'string' && post.tags.trim()}
											<div class="post-tags">
												{#each post.tags
													.split(',')
													.map((t) => t.trim())
													.filter((t) => t.length > 0)
													.slice(0, 3) as tag (tag)}
													<span class="tag">{tag}</span>
												{/each}
											</div>
										{/if}
									</div>

									{#if post.excerpt}
										<p class="post-excerpt">{post.excerpt}</p>
									{/if}

									<div class="post-meta">
										<div class="author-info">
											<span class="author">by {post.authorName}</span>
											<span class="created-date">{formatTimeAgo(post.$createdAt || '')}</span>
										</div>

										{#if post.lastActivity && post.lastActivity.timestamp !== post.$createdAt}
											<div class="last-activity">
												<span>Last reply by {post.lastActivity.username}</span>
												<span class="activity-time"
													>{formatTimeAgo(post.lastActivity.timestamp)}</span
												>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Load More Button -->
					{#if hasMore}
						<div class="load-more-section">
							<button onclick={loadMorePosts} class="load-more-btn" disabled={loadingMore}>
								{#if loadingMore}
									<div class="btn-spinner"></div>
									Loading...
								{:else}
									Load More Posts
								{/if}
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.category-container {
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
	}

	.spacer {
		height: 70px;
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

	.back-btn {
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

	.back-btn:hover {
		background: var(--color-capa-red);
	}

	.category-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.category-header {
		background: linear-gradient(
			135deg,
			rgba(188, 48, 17, 0.2),
			rgba(223, 70, 20, 0.2),
			rgba(251, 147, 31, 0.2)
		);
		padding: 2rem;
		border-bottom: 2px solid rgba(188, 48, 17, 0.3);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.breadcrumb a {
		color: var(--color-capa-orange);
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	.breadcrumb .material-icons {
		font-size: 1.1rem;
	}

	.category-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.category-title {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.category-icon {
		font-size: 2.5rem;
	}

	.category-color-dot {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.category-title h1 {
		font-size: 2.5rem;
		margin: 0;
		font-weight: bold;
	}

	.category-description {
		font-size: 1.1rem;
		opacity: 0.9;
		line-height: 1.5;
		margin: 0;
	}

	.create-post-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(45deg, var(--color-capa-red), var(--color-capa-orange));
		color: var(--color-capa-white);
		padding: 0.75rem 1.5rem;
		border-radius: 25px;
		text-decoration: none;
		font-weight: bold;
		transition: all 0.3s ease;
		align-self: flex-start;
		margin-top: 1rem;
	}

	.create-post-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(188, 48, 17, 0.3);
	}

	.filters-section {
		padding: 2rem;
		background: rgba(0, 0, 0, 0.5);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.filters-content {
		display: flex;
		gap: 2rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-box {
		flex: 1;
		min-width: 300px;
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 25px;
		padding: 0.5rem 1rem;
		transition: border-color 0.3s ease;
	}

	.search-box:focus-within {
		border-color: var(--color-capa-orange);
	}

	.search-box .material-icons {
		color: rgba(255, 255, 255, 0.5);
		margin-right: 0.5rem;
	}

	.search-box input {
		flex: 1;
		background: none;
		border: none;
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		outline: none;
	}

	.search-box input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.search-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 15px;
		cursor: pointer;
		font-weight: bold;
		margin-left: 0.5rem;
		transition: background 0.3s ease;
	}

	.search-btn:hover {
		background: var(--color-capa-red);
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.sort-controls label {
		font-weight: bold;
		white-space: nowrap;
	}

	.sort-controls select {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: var(--color-capa-white);
		padding: 0.5rem;
		font-family: 'eurostile', sans-serif;
		cursor: pointer;
	}

	.sort-controls select:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	.posts-section {
		padding: 2rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-state .material-icons {
		font-size: 4rem;
		color: rgba(255, 255, 255, 0.3);
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
	}

	.empty-state p {
		opacity: 0.7;
		margin-bottom: 2rem;
	}

	.create-first-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
		padding: 0.75rem 1.5rem;
		border-radius: 20px;
		text-decoration: none;
		font-weight: bold;
		transition: background 0.3s ease;
	}

	.create-first-btn:hover {
		background: var(--color-capa-red);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.post-item {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 10px;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		display: grid;
		grid-template-columns: 80px 1fr;
		gap: 1rem;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.post-item:hover {
		border-color: var(--color-capa-orange);
		background: rgba(0, 0, 0, 0.8);
	}

	.post-item.pinned {
		border-color: var(--color-capa-yellow);
		background: rgba(251, 147, 31, 0.05);
	}

	.post-stats {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		text-align: center;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .number {
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.stat .label {
		font-size: 0.8rem;
		opacity: 0.7;
	}

	.post-content {
		min-width: 0;
	}

	.post-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
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
		margin: 0 0 1rem 0;
		line-height: 1.5;
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

	.author-info {
		display: flex;
		gap: 1rem;
	}

	.author {
		color: var(--color-capa-orange);
		font-weight: bold;
	}

	.last-activity {
		display: flex;
		gap: 1rem;
		text-align: right;
	}

	.load-more-section {
		text-align: center;
		margin-top: 2rem;
	}

	.load-more-btn {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid var(--color-capa-orange);
		color: var(--color-capa-orange);
		padding: 0.75rem 2rem;
		border-radius: 25px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 auto;
	}

	.load-more-btn:hover:not(:disabled) {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
	}

	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid var(--color-capa-orange);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@media (max-width: 768px) {
		.category-header,
		.filters-section,
		.posts-section {
			padding: 1rem;
		}

		.category-title {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.category-title h1 {
			font-size: 1.8rem;
		}

		.filters-content {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.search-box {
			min-width: auto;
		}

		.sort-controls {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.post-item {
			grid-template-columns: 1fr;
			text-align: center;
		}

		.post-stats {
			flex-direction: row;
			justify-content: center;
			gap: 2rem;
		}

		.post-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.last-activity {
			flex-direction: column;
			gap: 0.25rem;
			text-align: left;
		}
	}
</style>
