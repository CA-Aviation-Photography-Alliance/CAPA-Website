<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/auth/store';
	import { wikiService } from '$lib/services/wiki/wikiService';
	import ImageUpload from '$lib/components/forum/ImageUpload.svelte';
	import type { UploadedImage } from '$lib/services/proxyCatboxService';
	import type { WikiCategory, CreateWikiPageData } from '$lib/types';

	let isLoading = false;
	let error: string | null = null;

	// Auth
	$: isAuthenticated = $authStore.isAuthenticated;

	// Form fields
	let title = '';
	let content = '';
	let tagsInput = '';
	let categoryId: string | null = null;
	let isPublished = true;

	// Categories
	let categories: WikiCategory[] = [];

	// Thumbnail
	let imageUpload: ImageUpload;
	let uploadedImages: UploadedImage[] = [];

	// Live preview toggle
	let showPreview = true;
	let previewHtml = '';
	
	$: {
		if (content) {
			// Convert markdown to HTML for preview
			previewHtml = content
				// Images first (before other formatting)
				.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0;" />')
				// Headings
				.replace(/^### (.+)$/gm, '<h3>$1</h3>')
				.replace(/^## (.+)$/gm, '<h2>$1</h2>')
				.replace(/^# (.+)$/gm, '<h1>$1</h1>')
				// Bold and italic
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/_(.+?)_/g, '<em>$1</em>')
				// Inline code
				.replace(/`([^`]+)`/g, '<code>$1</code>')
				// Links
				.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
				// Lists
				.replace(/^- (.+)$/gm, '<li>$1</li>')
				.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
				// Line breaks
				.replace(/\n\n/g, '<br/><br/>')
				.replace(/\n/g, '<br/>');
		} else {
			previewHtml = '';
		}
	}

	onMount(async () => {
		if (!isAuthenticated) {
			// Redirect to login or show message
			error = 'You must be signed in to create a wiki page.';
			return;
		}

		const res = await wikiService.getCategories();
		if (res.success && res.data) {
			categories = res.data;
		} else {
			console.warn('Failed to load categories:', res.error);
		}
	});

	function parseTags(input: string): string[] {
		return input
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
	}

	function validate(): string | null {
		if (!title.trim()) return 'Title is required';
		if (title.trim().length < 3) return 'Title must be at least 3 characters';
		if (!content.trim()) return 'Content is required';
		if (content.trim().length < 10) return 'Content must be at least 10 characters';
		return null;
	}

	function handleImagesUploaded(event: CustomEvent<UploadedImage[]>) {
		uploadedImages = event.detail;
	}

	function handleImageError(event: CustomEvent<string>) {
		error = event.detail;
	}

	async function submit() {
		error = null;

		const validationError = validate();
		if (validationError) {
			error = validationError;
			return;
		}

		isLoading = true;

		try {
			const data: CreateWikiPageData = {
				title: title.trim(),
				content: content.trim(),
				categoryId: categoryId || undefined,
				tags: parseTags(tagsInput),
				isPublished,
				thumbnailUrl: uploadedImages.length > 0 ? uploadedImages[0].url : undefined,
				metadata: {}
			};

			const res = await wikiService.createPage(data);
			if (!res.success || !res.data) {
				throw new Error(res.error || 'Failed to create page');
			}

			// Navigate to the created page by slug
			goto(`/wiki/${res.data.slug}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create page';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="page">
	<div class="header">
		<h1>Create Wiki Page</h1>
		<div>
			<a class="button link" href="/wiki">Back to wiki</a>
		</div>
	</div>

	<main>
		{#if error}
			<div class="error" role="alert">{error}</div>
		{/if}

		<form
			class="form"
			on:submit|preventDefault={submit}
			aria-labelledby="create-wiki-title"
			autocomplete="off"
		>
			<div class="field">
				<label id="create-wiki-title" class="label" for="title">Title</label>
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
						<option value={cat.$id}>{cat.name}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label class="label" for="tags">Tags (comma-separated)</label>
				<input
					id="tags"
					class="input"
					type="text"
					placeholder="e.g. getting started, tutorial, reference"
					bind:value={tagsInput}
				/>
			</div>

			<div class="field">
				<label class="label">Thumbnail</label>
				<ImageUpload
					bind:this={imageUpload}
					multiple={false}
					maxImages={1}
					showThumbnails={true}
					compact={false}
					on:imagesUploaded={handleImagesUploaded}
					on:error={handleImageError}
				/>
			</div>

			<div class="field editor">
				<div class="editor-toolbar">
					<div style="display: flex; gap: 0.75rem; align-items: center;">
						<label style="display: inline-flex; gap: 0.4rem; align-items: center;">
							<input
								type="checkbox"
								bind:checked={isPublished}
								aria-label="Publish immediately"
								style="margin-right: 0.25rem"
							/>
							Publish
						</label>
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
						placeholder="Write your content in markdown..."
						bind:value={content}
						required
						minlength="10"
						aria-label="Markdown content"
					></textarea>

					{#if showPreview}
						<div id="markdown-preview" class="preview" aria-live="polite">
							{#if content}
								{@html previewHtml}
							{:else}
								<p style="color: rgba(255, 255, 255, 0.7);">Live preview will appear here.</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<div class="actions">
				<button class="button primary" type="submit" disabled={isLoading || !isAuthenticated}>
					{isLoading ? 'Creating...' : 'Create Page'}
				</button>
				<a class="button" href="/wiki">Cancel</a>
			</div>
		</form>
	</main>
</div>

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
	.header h1 {
		font-size: 2rem;
		font-weight: bold;
		margin: 0;
		color: var(--color-capa-white);
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

	/* Actions / Buttons */
	.actions {
		display: flex;
		gap: 0.75rem;
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

	/* Error state matching forum palette */
	.error {
		border: 1px solid rgba(220, 53, 69, 0.5);
		background: rgba(220, 53, 69, 0.15);
		color: #ff6b6b;
		padding: 0.9rem;
		border-radius: 8px;
	}

	/* Thumbnail preview - REMOVED, now using ImageUpload component */

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
	}
	:global(.preview h1),
	:global(.preview h2),
	:global(.preview h3) {
		margin: 0.5rem 0;
		color: var(--color-capa-white);
		line-height: 1.3;
	}
	
	:global(.preview h1) {
		font-size: 2rem !important;
		font-weight: bold !important;
	}
	
	:global(.preview h2) {
		font-size: 1.5rem !important;
		font-weight: bold !important;
	}
	
	:global(.preview h3) {
		font-size: 1.25rem !important;
		font-weight: bold !important;
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
		height: auto;
		border-radius: 0.375rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: block;
		margin: 0.5rem 0;
	}
	
	.preview a {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}
	
	.preview a:hover {
		color: var(--color-capa-yellow);
	}
	
	.preview ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}
	
	.preview li {
		margin: 0.25rem 0;
	}
</style>
