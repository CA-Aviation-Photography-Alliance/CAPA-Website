<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/auth/store';
	import { wikiService } from '$lib/services/wiki/wikiService';
	import { AppwriteImageService, type UploadedImage } from '$lib/services/appwriteImageService';
	import type { WikiPage, WikiCategory } from '$lib/types';

	let isLoading = true;
	let isSaving = false;
	let error: string | null = null;

	let wikiPage: WikiPage | null = null;
	let categories: WikiCategory[] = [];

	// Form fields
	let title = '';
	let content = '';
	let tagsInput = '';
	let categoryId: string | null = null;
	let isPublished = true;
	let isLocked = false;
	let changeDescription = 'Edited page';

	// Thumbnail handling
	const imageService = new AppwriteImageService();
	let currentThumbnailUrl: string | null = null; // existing thumbnail url
	let newThumbnail: UploadedImage | null = null; // newly uploaded thumbnail (if any)
	let thumbnailCleared = false; // true when removing existing thumbnail

	// Editor preview
	let showPreview = true;

	// Derived auth/perm
	$: isAuthenticated = $authStore.isAuthenticated;
	$: userId = $authStore.user?.$id || null;
	$: roles = $authStore.user?.roles || [];
	$: canModerate = roles?.includes('moderator') || roles?.includes('admin');
	$: canEdit =
		!!wikiPage &&
		isAuthenticated &&
		((userId && wikiPage.authorId === userId) ||
			canModerate ||
			(!wikiPage.isLocked && userId === wikiPage.authorId)) &&
		// If locked, only moderators/admins can edit
		(!wikiPage?.isLocked || !!canModerate);

	onMount(async () => {
		const slug = $page.params.slug;
		if (!slug) {
			error = 'Missing page slug';
			isLoading = false;
			return;
		}

		try {
			isLoading = true;
			error = null;

			const [pageRes, catRes] = await Promise.all([
				wikiService.getPageBySlug(slug),
				wikiService.getCategories()
			]);

			if (!pageRes.success || !pageRes.data) {
				throw new Error(pageRes.error || 'Failed to load wiki page');
			}
			wikiPage = pageRes.data;

			// Initialize form values
			title = wikiPage.title || '';
			content = wikiPage.content || '';
			tagsInput = (wikiPage.tags || []).join(', ');
			categoryId = wikiPage.categoryId || null;
			isPublished = wikiPage.isPublished ?? true;
			isLocked = wikiPage.isLocked ?? false;
			currentThumbnailUrl = wikiPage.thumbnailUrl || null;

			if (catRes.success && catRes.data) {
				categories = catRes.data;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load page';
		} finally {
			isLoading = false;
		}
	});

	function parseTags(input: string): string[] {
		return input
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
	}

	function validate(): string | null {
		if (!wikiPage?.$id) return 'Invalid page';
		if (!title.trim()) return 'Title is required';
		if (title.trim().length < 3) return 'Title must be at least 3 characters';
		if (!content.trim()) return 'Content is required';
		if (content.trim().length < 10) return 'Content must be at least 10 characters';
		if (!canEdit) return 'You do not have permission to edit this page';
		return null;
	}

	async function uploadNewThumbnail() {
		error = null;
		try {
			const images = await imageService.selectAndUploadImages(false);
			if (images && images.length > 0) {
				newThumbnail = images[0];
				thumbnailCleared = false; // replaced instead of cleared
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to upload image';
		}
	}

	async function clearThumbnail() {
		error = null;
		try {
			// If there's a newly uploaded one, no need to delete from storage, just drop it
			if (newThumbnail) {
				newThumbnail = null;
			} else if (currentThumbnailUrl) {
				// Best-effort delete if it's an Appwrite image
				if (imageService.isAppwriteImage(currentThumbnailUrl)) {
					const id = imageService.extractImageId(currentThumbnailUrl);
					if (id) {
						try {
							await imageService.deleteImage(id);
						} catch (e) {
							// Not fatal; proceed with clearing the field
							console.warn('Failed to delete image from storage:', e);
						}
					}
				}
				thumbnailCleared = true;
				currentThumbnailUrl = null;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to clear thumbnail';
		}
	}

	async function insertImagesIntoContent() {
		error = null;
		try {
			const images = await imageService.selectAndUploadImages(true);
			if (images && images.length > 0) {
				const toAppend =
					'\n\n' + images.map((img) => `![${img.filename}](${img.url})`).join('\n') + '\n';
				content += toAppend;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to upload images';
		}
	}

	async function save() {
		error = null;

		const validationError = validate();
		if (validationError) {
			error = validationError;
			return;
		}

		if (!wikiPage?.$id) {
			error = 'Invalid page id';
			return;
		}

		isSaving = true;

		try {
			// Determine new thumbnail URL
			let thumbnailUrlToSet: string | undefined;
			if (newThumbnail) {
				thumbnailUrlToSet = newThumbnail.url;
			} else if (thumbnailCleared) {
				// Set to empty string for clearing (service will treat empty as unset)
				thumbnailUrlToSet = '';
			} // else leave undefined (no change)

			const res = await wikiService.updatePage(wikiPage.$id, {
				$id: wikiPage.$id,
				title: title.trim(),
				content: content.trim(),
				categoryId: categoryId || undefined,
				tags: parseTags(tagsInput),
				isPublished,
				// Only moderators/admins can toggle lock
				isLocked: canModerate ? isLocked : undefined,
				thumbnailUrl: thumbnailUrlToSet,
				changeDescription: changeDescription?.trim() || 'Edited page'
			});

			if (!res.success || !res.data) {
				throw new Error(res.error || 'Failed to update page');
			}

			// Navigate to updated slug if it changed
			const updated = res.data;
			goto(`/wiki/${updated.slug}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save changes';
		} finally {
			isSaving = false;
		}
	}

	function cancel() {
		if (wikiPage?.slug) {
			goto(`/wiki/${wikiPage.slug}`);
		} else {
			goto('/wiki');
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
			Loading editor...
		</div>
	</div>
{:else if error}
	<div class="page">
		<div class="error" role="alert">{error}</div>
		<div style="margin-top: 0.75rem;">
			<button class="button" on:click={() => location.reload()}>Retry</button>
			<a class="button link" href="/wiki">Back to wiki</a>
		</div>
	</div>
{:else if !wikiPage}
	<div class="page">
		<div class="empty">This page could not be found.</div>
		<div style="margin-top: 0.75rem;">
			<a class="button link" href="/wiki">Back to wiki</a>
		</div>
	</div>
{:else}
	<div class="page">
		<div class="header">
			<h1 class="title">Edit: {wikiPage.title}</h1>
			<div style="display: flex; gap: 0.5rem;">
				<button class="button" on:click={cancel}>Cancel</button>
				<button class="button primary" on:click={save} disabled={!canEdit || isSaving}>
					{isSaving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</div>


		<main>
			{#if !isAuthenticated || !canEdit}
				<div class="error" role="alert">You don’t have permission to edit this page.</div>
				<div style="margin-top: 0.75rem;">
					<a class="button link" href="/wiki/{wikiPage.slug}">Back to page</a>
				</div>
			{:else}
				{#if error}
					<div class="error" role="alert">{error}</div>
				{/if}

				<form class="form" on:submit|preventDefault={save} aria-labelledby="edit-wiki-title">
					<div class="field">
						<label id="edit-wiki-title" class="label" for="title">Title</label>
						<input
							id="title"
							class="input"
							type="text"
							placeholder="Enter a descriptive title"
							bind:value={title}
							required
							minlength="3"
						/>
					</div>

					<div class="field">
						<label class="label" for="category">Category</label>
						<select id="category" class="select" bind:value={categoryId}>
							<option value={null}>— None —</option>
							{#each categories as cat (cat.$id)}
								<option value={cat.$id} selected={wikiPage.categoryId === cat.$id}
									>{cat.name}</option
								>
							{/each}
						</select>
					</div>

					<div class="field">
						<label class="label" for="tags">Tags (comma-separated)</label>
						<input
							id="tags"
							class="input"
							type="text"
							placeholder="e.g. reference, tutorial"
							bind:value={tagsInput}
						/>
					</div>

					<div class="field">
						<label class="label">Thumbnail</label>
						{#if newThumbnail}
							<div class="thumb">
								<img src={newThumbnail.url} alt="New thumbnail preview" />
								<div>
									<div style="font-size: 0.9rem; color: #374151;">{newThumbnail.filename}</div>
									<button class="button" type="button" on:click={clearThumbnail}>Remove</button>
								</div>
							</div>
						{:else if currentThumbnailUrl}
							<div class="thumb">
								<img src={currentThumbnailUrl} alt="Current thumbnail" />
								<div>
									<button class="button" type="button" on:click={clearThumbnail}>Remove</button>
									<button class="button" type="button" on:click={uploadNewThumbnail}>
										Replace
									</button>
								</div>
							</div>
						{:else}
							<div class="thumb">
								<div
									style="width:120px;height:120px;background:#e5e7eb;border:1px solid #e5e7eb;border-radius:.375rem;"
								></div>
								<button class="button" type="button" on:click={uploadNewThumbnail}>
									Upload image
								</button>
							</div>
						{/if}
					</div>

					<div class="field editor">
						<div class="editor-toolbar">
							<div style="display:flex; gap:0.75rem; align-items:center;">
								<label style="display:inline-flex; gap:0.35rem; align-items:center;">
									<input
										type="checkbox"
										bind:checked={isPublished}
										aria-label="Published"
										style="margin-right:0.25rem"
									/>
									Published
								</label>

								{#if canModerate}
									<label style="display:inline-flex; gap:0.35rem; align-items:center;">
										<input
											type="checkbox"
											bind:checked={isLocked}
											aria-label="Locked"
											style="margin-right:0.25rem"
										/>
										Locked
									</label>
								{:else if isLocked}
									<span title="Locked by a moderator/admin">(Locked)</span>
								{/if}

								<button
									class="button"
									type="button"
									on:click={() => (showPreview = !showPreview)}
									aria-controls="markdown-preview"
									aria-expanded={showPreview}
								>
									{showPreview ? 'Hide preview' : 'Show preview'}
								</button>
							</div>
						</div>

						<div class="editor-body">
							<textarea
								class="textarea"
								placeholder="Write content in markdown..."
								bind:value={content}
								required
								minlength="10"
								aria-label="Markdown content"
							></textarea>

							{#if showPreview}
								<div id="markdown-preview" class="preview" aria-live="polite">
									{#if content}
										{@html mdToHtml(content)}
									{:else}
										<p style="color: #6b7280;">Live preview will appear here.</p>
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<div class="field">
						<label class="label" for="changeDesc">Change description</label>
						<input
							id="changeDesc"
							class="input"
							type="text"
							placeholder="Describe what changed"
							bind:value={changeDescription}
						/>
					</div>

					<div style="display:flex; gap:0.5rem;">
						<button class="button primary" type="submit" disabled={!canEdit || isSaving}>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</button>
						<button class="button" type="button" on:click={cancel}>Cancel</button>
						<a class="button link" href="/wiki/{wikiPage.slug}">Back to page</a>
					</div>
				</form>
			{/if}
		</main>
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

	/* Page layout */
	.page {
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		line-height: 1.6;
		padding-top: 70px; /* spacer like forum */
		display: flex;
		flex-direction: column;
		padding-left: 2rem;
		padding-right: 2rem;
		padding-bottom: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}
	@media (max-width: 900px) {
		.page {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}

	/* Header */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 2px solid rgba(188, 48, 17, 0.3);
		padding-bottom: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.title {
		font-size: 2rem;
		font-weight: bold;
		margin: 0;
		color: var(--color-capa-white);
	}

	/* Buttons */
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
		cursor: pointer;
	}

	/* Sidebar (glass panel) - REMOVED */

	/* Form (glass panel) */
	.form {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 12px;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
	}
	.field {
		display: grid;
		gap: 0.35rem;
	}
	.label {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--color-capa-white);
	}

	/* Inputs styled like forum */
	.input,
	.select,
	.textarea {
		padding: 0.9rem 1rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.5);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-size: 1rem;
		transition: border-color 0.3s ease;
		box-sizing: border-box;
	}
	.input:focus,
	.select:focus,
	.textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}
	.textarea {
		min-height: 220px;
		resize: vertical;
	}

	/* Thumbnail preview */
	.thumb {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.thumb img {
		width: 120px;
		height: 120px;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	/* Editor */
	.editor {
		border: 1px solid rgba(188, 48, 17, 0.2);
		border-radius: 12px;
		overflow: hidden;
	}
	.editor-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.3);
		gap: 0.5rem;
	}
	.editor-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	@media (max-width: 900px) {
		.editor-body {
			grid-template-columns: 1fr;
		}
	}
	.preview {
		padding: 0.75rem;
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
		color: var(--color-capa-white);
	}
	.preview h1,
	.preview h2,
	.preview h3 {
		margin: 0.5rem 0;
		color: var(--color-capa-white);
	}
	.preview p {
		margin: 0.5rem 0;
	}
	.preview code {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.1rem 0.35rem;
		border-radius: 0.25rem;
	}
	.preview pre {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.6rem;
		border-radius: 0.375rem;
		overflow: auto;
	}
	.preview img {
		max-width: 100%;
		border-radius: 0.375rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	/* Error/empty matching forum palette */
	.error {
		border: 1px solid rgba(220, 53, 69, 0.5);
		background: rgba(220, 53, 69, 0.15);
		color: #ff6b6b;
		padding: 0.9rem;
		border-radius: 8px;
	}
	.empty {
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(0, 0, 0, 0.3);
	}
</style>
