<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { authStore } from '$lib/auth/store';
	import { wikiService } from '$lib/services/wiki/wikiService';
	import type { WikiPage, WikiCategory } from '$lib/types';
	import AvatarCircle from '$lib/components/AvatarCircle.svelte';

	let isLoading = true;
	let error: string | null = null;
	let wikiPage: WikiPage | null = null;
	let categoryName: string | null = null;

	// Derived auth state
	$: isAuthenticated = $authStore.isAuthenticated;
	$: currentUserId = $authStore.user?.$id || null;
	$: currentUserRoles = $authStore.user?.roles || [];
	$: canEdit =
		!!wikiPage &&
		isAuthenticated &&
		// author can edit
		((currentUserId && wikiPage.authorId === currentUserId) ||
			// moderators/admins can edit
			currentUserRoles.includes('moderator') ||
			currentUserRoles.includes('admin'));

	onMount(async () => {
		const slug = $page.params.slug;
		if (!slug) {
			error = 'Page not found';
			isLoading = false;
			return;
		}

		try {
			isLoading = true;
			error = null;

			// Load page
			const pageRes = await wikiService.getPageBySlug(slug);
			if (!pageRes.success || !pageRes.data) {
				throw new Error(pageRes.error || 'Failed to load page');
			}
			wikiPage = pageRes.data;

			// Optionally resolve category name
			if (wikiPage.categoryId) {
				const catRes = await wikiService.getCategories();
				if (catRes.success && catRes.data) {
					const cat = (catRes.data as WikiCategory[]).find((c) => c.$id === wikiPage?.categoryId);
					if (cat) categoryName = cat.name;
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load page';
		} finally {
			isLoading = false;
		}
	});

	function formatDate(iso?: string) {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}

	function escapeHtml(str: string) {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function mdToHtml(md: string): string {
		if (!md) return '';

		// Extract fenced code blocks first, store placeholders
		const codeBlocks: string[] = [];
		md = md.replace(/```([\s\S]*?)```/g, (_m, code) => {
			const idx = codeBlocks.length;
			codeBlocks.push(escapeHtml(code));
			return `__CODE_BLOCK_${idx}__`;
		});

		// Escape everything else
		let html = escapeHtml(md);

		// Headings
		html = html
			.replace(/(^|\n)######\s+(.*)/g, '$1<h6>$2</h6>')
			.replace(/(^|\n)#####\s+(.*)/g, '$1<h5>$2</h5>')
			.replace(/(^|\n)####\s+(.*)/g, '$1<h4>$2</h4>')
			.replace(/(^|\n)###\s+(.*)/g, '$1<h3>$2</h3>')
			.replace(/(^|\n)##\s+(.*)/g, '$1<h2>$2</h2>')
			.replace(/(^|\n)#\s+(.*)/g, '$1<h1>$2</h1>');

		// Bold, italic, inline code
		html = html
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\_(.+?)\_/g, '<em>$1</em>')
			.replace(/`([^`]+)`/g, '<code>$1</code>');

		// Images and links
		html = html
			.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />')
			.replace(
				/\[(.*?)\]\((.*?)\)/g,
				'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
			);

		// Blockquotes
		html = html.replace(/(^|\n)>\s+(.*)/g, '$1<blockquote>$2</blockquote>');

		// Unordered lists (simple)
		// Convert consecutive "- item" lines into <ul><li>...</li></ul>
		html = html.replace(/(?:^|\n)(- .*(?:\n- .*)*)/g, (block) => {
			const items = block
				.split('\n')
				.filter((l) => l.trim().startsWith('- '))
				.map((l) => l.replace(/^- /, '').trim())
				.map((txt) => `<li>${txt}</li>`)
				.join('');
			return items ? `\n<ul>${items}</ul>` : block;
		});

		// Line breaks
		html = html.replace(/\n/g, '<br/>');

		// Restore code blocks
		html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_m, idx) => {
			const code = codeBlocks[Number(idx)] || '';
			return `<pre><code>${code}</code></pre>`;
		});

		return html;
	}

</script>

{#if isLoading}
	<div class="page">
		<div class="empty">
			<span class="material-icons" aria-hidden="true">hourglass_top</span>
			Loading page...
		</div>
	</div>
{:else if error}
	<div class="page">
		<div class="error" role="alert">
			<h3 style="margin: 0 0 0.25rem;">Failed to load wiki page</h3>
			<div>{error}</div>
		</div>
	</div>
{:else if !wikiPage}
	<div class="page">
		<div class="empty">This page could not be found.</div>
	</div>
{:else}
	<div class="page">
		<div class="header">
			<h1 class="title">{wikiPage.title}</h1>
			<div class="actions">
				{#if canEdit}
					<a class="button primary" href="/wiki/{wikiPage.slug}/edit" aria-label="Edit page">Edit</a
					>
				{/if}
			</div>
		</div>

		<div class="meta">
			<div class="meta-author">
				<AvatarCircle
					userId={wikiPage.authorId}
					name={wikiPage.authorName}
					size={56}
					class="meta-avatar"
				/>
				<div class="meta-author-text">
					<a class="meta-author-name profile-link" href="/profile/{wikiPage.authorId}">{wikiPage.authorName}</a>
					{#if wikiPage.$updatedAt}
						<div class="meta-date">Updated {formatDate(wikiPage.$updatedAt)}</div>
					{:else if wikiPage.$createdAt}
						<div class="meta-date">Created {formatDate(wikiPage.$createdAt)}</div>
					{/if}
				</div>
			</div>
			{#if wikiPage.lastEditedByName && wikiPage.lastEditedBy !== wikiPage.authorId}
				<div class="meta-editor">
					<AvatarCircle
						userId={wikiPage.lastEditedBy}
						name={wikiPage.lastEditedByName}
						size={36}
						class="meta-avatar small"
					/>
					<span>
						Last edited by
						<a class="profile-link" href="/profile/{wikiPage.lastEditedBy}">{wikiPage.lastEditedByName}</a>
					</span>
				</div>
			{/if}
			{#if categoryName}
				<div>Category: {categoryName}</div>
			{/if}
			<div>Version {wikiPage.version}</div>
			{#if wikiPage.isLocked}
				<div>Locked</div>
			{/if}
		</div>

		{#if wikiPage.tags && wikiPage.tags.length > 0}
			<div class="tags" aria-label="Tags">
				{#each wikiPage.tags as tag (tag)}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		{/if}

		{#if wikiPage.thumbnailUrl}
			<img
				class="thumbnail"
				src={wikiPage.thumbnailUrl}
				alt="{wikiPage.title} thumbnail"
				decoding="async"
				loading="lazy"
			/>
		{/if}

		<div class="content" aria-label="Article content">
			{@html mdToHtml(wikiPage.content)}
		</div>
	</div>
{/if}

<style>
	:global(.material-icons) {
		vertical-align: middle;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.page {
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		line-height: 1.6;
		padding: 1rem;
		padding-top: 70px;
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 2px solid rgba(188, 48, 17, 0.3);
		padding-bottom: 0.75rem;
	}

	.title {
		margin: 0;
		font-size: 2rem;
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

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
		text-decoration: none;
	}

	.button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.button.primary {
		background: linear-gradient(45deg, var(--color-capa-red), var(--color-capa-orange));
		border: none;
		color: var(--color-capa-white);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
	}

	.meta-author,
	.meta-editor {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.meta-avatar {
		--avatar-border-color: rgba(255, 255, 255, 0.2);
		--avatar-bg-color: rgba(255, 255, 255, 0.08);
	}

	.meta-avatar.small {
		--avatar-size: 36px;
	}

	.meta-author-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.meta-author-name {
		font-weight: bold;
		color: var(--color-capa-white);
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

	.meta-date {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.tag {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 999px;
		font-size: 0.8rem;
		color: var(--color-capa-white);
		background: rgba(0, 0, 0, 0.5);
	}

	.thumbnail {
		max-height: 320px;
		width: 100%;
		object-fit: cover;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.content {
		padding: 0.5rem 0;
		color: var(--color-capa-white);
	}
	:global(.content h1),
	:global(.content h2),
	:global(.content h3),
	:global(.content h4),
	:global(.content h5),
	:global(.content h6) {
		margin: 1rem 0 0.5rem;
		color: var(--color-capa-white);
		font-weight: bold !important;
		line-height: 1.3;
	}
	
	:global(.content h1) {
		font-size: 2rem !important;
	}
	
	:global(.content h2) {
		font-size: 1.5rem !important;
	}
	
	:global(.content h3) {
		font-size: 1.25rem !important;
	}
	
	:global(.content h4) {
		font-size: 1.1rem !important;
	}
	
	:global(.content h5) {
		font-size: 1rem !important;
	}
	
	:global(.content h6) {
		font-size: 0.9rem !important;
	}
	.content a {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}
	
	.content a:hover {
		color: var(--color-capa-yellow);
	}
	
	.content p {
		margin: 0.5rem 0;
	}
	.content pre {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.75rem;
		border-radius: 0.375rem;
		overflow: auto;
	}
	.content code {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.1rem 0.35rem;
		border-radius: 0.25rem;
	}
	.content blockquote {
		border-left: 4px solid rgba(255, 255, 255, 0.2);
		margin: 0.75rem 0;
		padding: 0.25rem 0.75rem;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(0, 0, 0, 0.3);
	}
	.content ul {
		padding-left: 1.25rem;
	}
	.content img {
		max-width: 100%;
		border-radius: 0.375rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	.empty,
	.error {
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(0, 0, 0, 0.3);
	}
</style>
