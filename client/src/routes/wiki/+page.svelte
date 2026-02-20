<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { wikiService } from '$lib/services/wiki/wikiService';
	import { authStore } from '$lib/auth/store';
	import AvatarCircle from '$lib/components/AvatarCircle.svelte';
	import type {
		WikiPage,
		WikiCategory,
		WikiStats,
		WikiFilters,
		PaginatedResponse
	} from '$lib/types';

	let pages: WikiPage[] = [];
	let categories: WikiCategory[] = [];
	let stats: WikiStats | null = null;

	let isLoading = true;
	let error: string | null = null;

	// Filters
	let search = '';
	let selectedCategoryId: string | null = null;
	let sortBy: WikiFilters['sortBy'] = 'updatedAt';
	let sortOrder: WikiFilters['sortOrder'] = 'desc';
	let page = 1;
	let limit = 20;

	// Derived
	let hasFilters = false;

	// Auth
	$: isAuthenticated = $authStore.isAuthenticated;

	function computeHasFilters() {
		hasFilters = !!search || !!selectedCategoryId || sortBy !== 'updatedAt' || sortOrder !== 'desc';
	}

	async function loadData() {
		isLoading = true;
		error = null;

		try {
			// Fetch categories and stats in parallel, pages with filters
			const [categoriesRes, statsRes, pagesRes] = await Promise.all([
				wikiService.getCategories(),
				wikiService.getStats(),
				wikiService.listPages({
					search: search || undefined,
					categoryId: selectedCategoryId || undefined,
					sortBy,
					sortOrder,
					page,
					limit
				} as WikiFilters)
			]);

			if (categoriesRes.success) {
				categories = categoriesRes.data || [];
			} else {
				console.warn('Failed to load wiki categories:', categoriesRes.error);
			}

			if (statsRes.success) {
				stats = statsRes.data || null;
			} else {
				console.warn('Failed to load wiki stats:', statsRes.error);
			}

			if (pagesRes.success) {
				pages = (pagesRes as PaginatedResponse<WikiPage>).data || [];
			} else {
				throw new Error(pagesRes.error || 'Failed to load wiki pages');
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load wiki';
		} finally {
			isLoading = false;
			computeHasFilters();
		}
	}

	function applyFilters() {
		page = 1;
		loadData();
	}

	function clearFilters() {
		search = '';
		selectedCategoryId = null;
		sortBy = 'updatedAt';
		sortOrder = 'desc';
		page = 1;
		applyFilters();
	}

	function goToCreate() {
		goto('/wiki/create');
	}

	function goToPage(pageSlug: string) {
		goto(`/wiki/${pageSlug}`);
	}

	function nextPage() {
		page += 1;
		loadData();
	}

	function prevPage() {
		page = Math.max(1, page - 1);
		loadData();
	}

	onMount(() => {
		loadData();
	});
</script>

<div class="wiki-page">
	<div class="wiki-header">
		<div class="header-content">
			<h1 class="header-title">Wiki</h1>
			
			{#if isAuthenticated}
				<button class="create-btn" on:click={goToCreate} aria-label="Create wiki page">
					<span class="material-icons" aria-hidden="true">add</span>
					Create Page
				</button>
			{/if}
		</div>
	</div>

	<div class="content-area">
		<aside class="sidebar">
			<div class="sidebar-section">
				<div class="sidebar-title">Categories</div>
				<div class="category-list">
					<button
						class="category-item {selectedCategoryId === null ? 'active' : ''}"
						on:click={() => {
							selectedCategoryId = null;
							applyFilters();
						}}
					>
						<span>All</span>
					</button>
					{#each categories as cat (cat.$id)}
						<button
							class="category-item {selectedCategoryId === cat.$id ? 'active' : ''}"
							on:click={() => {
								selectedCategoryId = cat.$id;
								applyFilters();
							}}
						>
							<span>{cat.name}</span>
							{#if cat.pageCount}
								<span class="recent-page-meta">{cat.pageCount}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			{#if stats && stats.recentPages.length > 0}
				<div class="sidebar-section">
					<div class="sidebar-title">Recently Updated</div>
					<div class="recent-pages">
				{#each stats.recentPages.slice(0, 5) as page (page.$id)}
					<div class="recent-page-item">
						<AvatarCircle
							userId={page.authorId}
							name={page.authorName}
							size={36}
							class="recent-page-avatar"
						/>
						<div class="recent-page-text">
							<a class="recent-page-title" href="/wiki/{page.slug}">{page.title}</a>
							<span class="recent-page-meta">
								<a class="profile-link" href="/profile/{page.authorId}">
									{page.authorName}
								</a>
								{#if page.$updatedAt}
									• {new Date(page.$updatedAt).toLocaleDateString()}
								{/if}
							</span>
						</div>
					</div>
				{/each}
					</div>
				</div>
			{/if}
		</aside>

		{#if error}
			<div class="empty-state-full">
				<h3>Failed to load wiki</h3>
				<p>{error}</p>
			</div>
		{:else if isLoading}
			<div class="empty-state-full">
				<span class="material-icons" aria-hidden="true">hourglass_top</span>
				Loading wiki...
			</div>
		{:else if pages.length === 0}
			<div class="empty-state-full">
				<span class="material-icons" aria-hidden="true">library_books</span>
				<h3>No pages found</h3>
				<p>
					{#if hasFilters}
						Try adjusting your search or filters.
					{:else}
						Be the first to contribute!
					{/if}
				</p>
				{#if isAuthenticated}
					<button class="button primary" on:click={goToCreate}>Create your first page</button>
				{/if}
			</div>
		{:else}
			<main class="main-content">
				<div class="filters">
					<input
						class="input"
						type="text"
						placeholder="Search pages..."
						bind:value={search}
						on:keydown={(e) => {
							if (e.key === 'Enter') applyFilters();
						}}
						aria-label="Search wiki pages"
					/>

					<select class="select" bind:value={sortBy} aria-label="Sort by">
						<option value="updatedAt">Recently updated</option>
						<option value="createdAt">Recently created</option>
						<option value="title">Title</option>
					</select>

					<select class="select" bind:value={sortOrder} aria-label="Sort order">
						<option value="desc">Descending</option>
						<option value="asc">Ascending</option>
					</select>

					<button class="button" on:click={applyFilters}>Apply</button>
					{#if hasFilters}
						<button class="button link" on:click={clearFilters}>Clear</button>
					{/if}
				</div>

				<div class="page-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
					{#each pages as p (p.$id)}
						<div class="page-card">
							{#if p.thumbnailUrl}
								<img class="page-thumb" src={p.thumbnailUrl} alt="{p.title} thumbnail" />
							{:else}
								<div class="page-thumb" aria-hidden="true"></div>
							{/if}

							<div class="page-info">
								<div class="page-title">
									<a href="/wiki/{p.slug}">{p.title}</a>
								</div>
								<div class="page-meta">
									<div class="page-author">
										<AvatarCircle
											userId={p.authorId}
											name={p.authorName}
											size={48}
											class="page-avatar"
										/>
										<div class="page-author-text">
											<a class="page-author-name profile-link" href="/profile/{p.authorId}">{p.authorName}</a>
											{#if p.$updatedAt || p.updatedAt}
												<span class="page-updated">
													Updated
													{new Date((p.$updatedAt || p.updatedAt) as string).toLocaleDateString()}
												</span>
											{:else if p.$createdAt}
												<span class="page-updated">
													Created {new Date(p.$createdAt).toLocaleDateString()}
												</span>
											{/if}
										</div>
									</div>
									{#if p.categoryId}
										<div class="page-category">
											Category: {categories.find((c) => c.$id === p.categoryId)?.name || '—'}
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="pagination" style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
					<button class="button" on:click={prevPage} disabled={page <= 1}>Previous</button>
					<div aria-live="polite" aria-atomic="true" style="align-self: center;">
						Page {page}
					</div>
					<button class="button" on:click={nextPage} disabled={pages.length < limit}>Next</button>
				</div>
			</main>
		{/if}
	</div>
</div>

<style>
	.wiki-page {
		display: flex;
		flex-direction: column;
		padding: 1rem;
	}

	.wiki-header {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #e5e7eb;
		margin-bottom: 0.5rem;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.header-title {
		font-size: 1.5rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.create-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		background: #2563eb;
		color: white;
		font-weight: 500;
		text-decoration: none;
	}

	.content-area {
		display: flex;
		gap: 2rem;
	}

	@media (max-width: 900px) {
		.content-area {
			flex-direction: column;
		}
	}

	.sidebar {
		background: #fafafa;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.sidebar-section {
		margin-bottom: 1rem;
	}

	.sidebar-title {
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.category-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.category-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.category-item.active {
		background-color: #eef2ff;
	}

	.recent-pages {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.recent-page-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 0.5rem;
		border-radius: 0.375rem;
	}

	.recent-page-item:hover {
		background-color: #f3f4f6;
	}

	.recent-page-title {
		font-weight: 500;
		color: inherit;
		text-decoration: none;
	}

	.recent-page-title:hover {
		text-decoration: underline;
	}

	.recent-page-title {
		font-weight: 500;
	}

	.recent-page-meta {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.profile-link {
		color: var(--color-capa-red);
		text-decoration: none;
		font-weight: 600;
	}

	.profile-link:hover,
	.profile-link:focus-visible {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.filters {
		display: grid;
		grid-template-columns: 1fr 200px 160px 120px auto;
		gap: 0.5rem;
	}

	@media (max-width: 900px) {
		.filters {
			grid-template-columns: 1fr 1fr;
		}
	}

	.input,
	.select {
		padding: 0.5rem 0.6rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
	}

	.button {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: #f9fafb;
		cursor: pointer;
	}

	.button.primary {
		border-color: #2563eb;
		background: #2563eb;
		color: white;
	}

	.button.link {
		border: none;
		background: transparent;
		color: #2563eb;
		cursor: pointer;
	}

	.page-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		gap: 1rem;
	}

	.page-thumb {
		flex: 0 0 96px;
		width: 96px;
		height: 96px;
		border-radius: 0.375rem;
		background: #e5e7eb;
		object-fit: cover;
	}

	.page-info {
		flex: 1;
		min-width: 0;
	}

	.page-title {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.page-meta {
		font-size: 0.85rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.page-author {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.page-avatar {
		--avatar-border-color: #e5e7eb;
		--avatar-bg-color: #f3f4f6;
		--avatar-text-color: #374151;
	}

	.page-author-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.page-author-name {
		font-weight: 600;
		color: #111827;
	}

	.page-updated,
	.page-category {
		color: #6b7280;
		font-size: 0.8rem;
	}

	.page-excerpt {
		font-size: 0.95rem;
		color: #374151;
	}

	.empty-state {
		border: 1px dashed #d1d5db;
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
		color: #6b7280;
	}
	/* Forum theme overrides for Wiki listing */

	.wiki-page {
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		line-height: 1.6;
		padding-top: 70px; /* spacer to match forum */
	}

	/* Header styles similar to forum */
	.wiki-header {
		background-color: rgba(188, 48, 17, 0.2);
		padding: 4rem 2rem;
		border-bottom: 2px solid rgba(188, 48, 17, 0.3);
		margin: 0;
	}

	.wiki-header .header-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.wiki-header .header-title {
		font-size: 3rem;
		font-weight: bold;
		margin: 0 0 1rem 0;
		color: var(--color-capa-white);
	}

	.wiki-header .header-stats {
		opacity: 0.9;
		font-size: 1.05rem;
	}

	.wiki-header .header-actions {
		margin-top: 1rem;
		display: flex;
		justify-content: center;
	}

	/* Create button to match forum CTA */
	.create-btn {
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
		border: none;
		cursor: pointer;
	}

	.create-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(188, 48, 17, 0.4);
	}

	/* Content area aligns with forum content width */
	.content-area {
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem;
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	@media (max-width: 900px) {
		.content-area {
			flex-direction: column;
			padding: 1rem;
		}
	}

	/* Glassmorphism panels like forum */
	.sidebar {
		flex: 0 0 280px;
		align-self: flex-start;
		background: rgba(0, 0, 0, 0.7);
		border-radius: 12px;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		color: var(--color-capa-white);
	}

	@media (max-width: 900px) {
		.sidebar {
			flex: 1 1 auto;
		}
	}

	.sidebar-title {
		color: var(--color-capa-white);
	}

	.category-item {
		color: rgba(255, 255, 255, 0.85);
	}

	.category-item.active {
		background: rgba(188, 48, 17, 0.15);
	}

	.recent-page-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 0.5rem;
		border-radius: 0.375rem;
		color: rgba(255, 255, 255, 0.85);
	}

	.recent-page-item:hover {
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-capa-white);
	}

	.recent-page-title {
		color: var(--color-capa-white);
		text-decoration: none;
	}

	.recent-page-title:hover {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}

	.recent-page-avatar {
		--avatar-border-color: rgba(255, 255, 255, 0.2);
		--avatar-bg-color: rgba(255, 255, 255, 0.05);
	}

	.recent-page-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.recent-page-meta {
		color: var(--color-capa-orange);
		font-weight: bold;
	}

	/* Main content panel spacing */
	.main-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Filters styled like forum form elements */
	.filters {
		display: grid;
		grid-template-columns: 1fr 200px 160px auto auto;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	@media (max-width: 900px) {
		.filters {
			grid-template-columns: 1fr 1fr;
		}
	}

	.input,
	.select {
		padding: 0.75rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.5);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-size: 1rem;
		transition: border-color 0.3s ease;
	}

	.input:focus,
	.select:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	/* Buttons like forum */
	.button {
		padding: 0.6rem 1.2rem;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-capa-white);
		cursor: pointer;
		font-weight: bold;
		transition: all 0.3s ease;
		font-family: 'eurostile', sans-serif;
	}

	.button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.button.primary {
		background: linear-gradient(45deg, var(--color-capa-red), var(--color-capa-orange));
		border: none;
	}

	.button.primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(188, 48, 17, 0.3);
	}

	.button.link {
		background: transparent;
		border: none;
		color: var(--color-capa-red);
		text-decoration: underline;
		padding: 0.4rem 0.2rem;
	}

	/* Page cards to match forum panels */
	.page-card {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 12px;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		color: var(--color-capa-white);
	}

	.page-title a {
		color: var(--color-capa-white);
		text-decoration: none;
	}

	.page-title a:hover {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}

	.page-meta {
		color: rgba(255, 255, 255, 0.7);
	}

	.page-avatar {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.08);
	}

	.page-avatar span {
		color: var(--color-capa-white);
	}

	.page-author-name {
		color: var(--color-capa-white);
	}

	.page-updated,
	.page-category {
		color: rgba(255, 255, 255, 0.75);
	}

	.page-excerpt {
		color: rgba(255, 255, 255, 0.9);
	}

	/* Empty state aligned to forum styling - spans full width */
	.empty-state-full {
		flex: 1;
		width: 100%;
		margin: 2rem 0;
		text-align: center;
		padding: 3rem 2rem;
		color: rgba(255, 255, 255, 0.9);
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.empty-state-full .material-icons {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	/* Pagination buttons */
	.pagination .button {
		border-radius: 24px;
	}
</style>
