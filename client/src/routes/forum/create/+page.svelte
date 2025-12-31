<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { forumService } from '$lib/services/forum/forumService';
	import { authStore } from '$lib/auth/store';
	import type { ForumCategory } from '$lib/types';
	import { fade, fly } from 'svelte/transition';

	let categories: ForumCategory[] = [];
	let loading = true;
	let submitting = false;
	let error: string | null = null;

	// Form data
	let title = '';
	let content = '';
	let selectedCategoryId = '';
	let tags = '';
	let isPinned = false;

	// Form validation
	let titleError = '';
	let contentError = '';
	let categoryError = '';

	onMount(async () => {
		// Check authentication
		if (!$authStore.isAuthenticated) {
			goto('/forum');
			return;
		}

		try {
			categories = await forumService.getCategories();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load categories';
		} finally {
			loading = false;
		}
	});

	function validateForm(): boolean {
		titleError = '';
		contentError = '';
		categoryError = '';

		let isValid = true;

		if (!title.trim()) {
			titleError = 'Title is required';
			isValid = false;
		} else if (title.length < 5) {
			titleError = 'Title must be at least 5 characters';
			isValid = false;
		} else if (title.length > 200) {
			titleError = 'Title must be less than 200 characters';
			isValid = false;
		}

		if (!content.trim()) {
			contentError = 'Content is required';
			isValid = false;
		} else if (content.length < 10) {
			contentError = 'Content must be at least 10 characters';
			isValid = false;
		}

		if (!selectedCategoryId) {
			categoryError = 'Please select a category';
			isValid = false;
		}

		return isValid;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!validateForm()) return;

		submitting = true;
		error = null;

		try {
			const postData = {
				title: title.trim(),
				content: content.trim(),
				categoryId: selectedCategoryId,
				tags: tags.trim(),
				isPinned
			};

			const newPost = await forumService.createPost(postData);
			goto(`/forum/post/${newPost.$id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create post';
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		goto('/forum');
	}

	function insertText(textarea: HTMLTextAreaElement, text: string) {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const value = textarea.value;

		textarea.value = value.slice(0, start) + text + value.slice(end);
		textarea.focus();
		textarea.setSelectionRange(start + text.length, start + text.length);
		content = textarea.value;
	}

	function formatText(format: string) {
		const textarea = document.getElementById('content') as HTMLTextAreaElement;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selectedText = textarea.value.slice(start, end);

		let formattedText = '';
		switch (format) {
			case 'bold':
				formattedText = `**${selectedText || 'bold text'}**`;
				break;
			case 'italic':
				formattedText = `*${selectedText || 'italic text'}*`;
				break;
			case 'code':
				formattedText = `\`${selectedText || 'code'}\``;
				break;
			case 'link':
				formattedText = `[${selectedText || 'link text'}](url)`;
				break;
			case 'quote':
				formattedText = `> ${selectedText || 'quoted text'}`;
				break;
		}

		insertText(textarea, formattedText);
	}
</script>

<svelte:head>
	<title>Create New Post - CAPA Forum</title>
</svelte:head>

<div class="create-post-container">
	<div class="spacer"></div>

	{#if loading}
		<div class="loading-container">
			<div class="spinner"></div>
			<p>Loading...</p>
		</div>
	{:else if error && categories.length === 0}
		<div class="error-container">
			<span class="material-icons">error</span>
			<h3>Failed to load</h3>
			<p>{error}</p>
			<button onclick={() => window.location.reload()} class="retry-btn">Try Again</button>
		</div>
	{:else}
		<div class="create-post-content" in:fade={{ duration: 500 }}>
			<div class="header" in:fly={{ y: -20, duration: 500, delay: 200 }}>
				<h1>Create New Post</h1>
				<p>Share your thoughts with the CAPA community</p>
			</div>

			<form onsubmit={handleSubmit} class="post-form" in:fly={{ y: 20, duration: 500, delay: 300 }}>
				<!-- Error display -->
				{#if error}
					<div class="form-error" in:fade>
						<span class="material-icons">error</span>
						{error}
					</div>
				{/if}

				<!-- Title -->
				<div class="form-group">
					<label for="title">Post Title *</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						placeholder="Enter a descriptive title for your post..."
						class:error={titleError}
						disabled={submitting}
					/>
					{#if titleError}
						<span class="field-error">{titleError}</span>
					{/if}
				</div>

				<!-- Category -->
				<div class="form-group">
					<label for="category">Category *</label>
					<select
						id="category"
						bind:value={selectedCategoryId}
						class:error={categoryError}
						disabled={submitting}
					>
						<option value="">Select a category...</option>
						{#each categories as category (category.$id)}
							<option value={category.$id}>{category.name}</option>
						{/each}
					</select>
					{#if categoryError}
						<span class="field-error">{categoryError}</span>
					{/if}
				</div>

				<!-- Content -->
				<div class="form-group">
					<label for="content">Content *</label>

					<!-- Formatting toolbar -->
					<div class="formatting-toolbar">
						<button
							type="button"
							onclick={() => formatText('bold')}
							title="Bold"
							disabled={submitting}
						>
							<span class="material-icons">format_bold</span>
						</button>
						<button
							type="button"
							onclick={() => formatText('italic')}
							title="Italic"
							disabled={submitting}
						>
							<span class="material-icons">format_italic</span>
						</button>
						<button
							type="button"
							onclick={() => formatText('code')}
							title="Code"
							disabled={submitting}
						>
							<span class="material-icons">code</span>
						</button>
						<button
							type="button"
							onclick={() => formatText('link')}
							title="Link"
							disabled={submitting}
						>
							<span class="material-icons">link</span>
						</button>
						<button
							type="button"
							onclick={() => formatText('quote')}
							title="Quote"
							disabled={submitting}
						>
							<span class="material-icons">format_quote</span>
						</button>
					</div>

					<textarea
						id="content"
						bind:value={content}
						placeholder="Write your post content here... You can use Markdown formatting."
						rows="15"
						class:error={contentError}
						disabled={submitting}
					></textarea>
					{#if contentError}
						<span class="field-error">{contentError}</span>
					{/if}
					<p class="help-text">
						You can use <strong>Markdown</strong> formatting: **bold**, *italic*, `code`, [links](url),
						> quotes
					</p>
				</div>

				<!-- Tags -->
				<div class="form-group">
					<label for="tags">Tags (optional)</label>
					<input
						id="tags"
						type="text"
						bind:value={tags}
						placeholder="Enter tags separated by commas (e.g., photography, aviation, tips)"
						disabled={submitting}
					/>
					<p class="help-text">Use tags to help others find your post</p>
				</div>

				<!-- Options -->
				<div class="form-group">
					<label class="checkbox-label">
						<span class="checkmark"></span>
						<input type="checkbox" bind:checked={isPinned} disabled={submitting} />
						Pin this post (moderators only)
					</label>
				</div>

				<!-- Actions -->
				<div class="form-actions">
					<button type="button" onclick={handleCancel} class="cancel-btn" disabled={submitting}>
						Cancel
					</button>
					<button
						type="submit"
						class="submit-btn"
						disabled={submitting || !title.trim() || !content.trim() || !selectedCategoryId}
					>
						{#if submitting}
							<div class="btn-spinner"></div>
							Creating...
						{:else}
							<span class="material-icons">publish</span>
							Create Post
						{/if}
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.create-post-container {
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

	.create-post-content {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.header h1 {
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0 0 1rem 0;
		color: var(--color-capa-white);
	}

	.header p {
		opacity: 0.8;
		font-size: 1.1rem;
	}

	.post-form {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		padding: 2rem;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
	}

	.form-error {
		background: rgba(220, 38, 127, 0.1);
		border: 1px solid rgba(220, 38, 127, 0.3);
		color: #ff6b9d;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.form-group {
		margin-bottom: 2rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.5);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-size: 1rem;
		transition: border-color 0.3s ease;
		box-sizing: border-box;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	.form-group input.error,
	.form-group select.error,
	.form-group textarea.error {
		border-color: #ff6b9d;
	}

	.form-group input:disabled,
	.form-group select:disabled,
	.form-group textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-error {
		color: #ff6b9d;
		font-size: 0.9rem;
		margin-top: 0.25rem;
		display: block;
	}

	.help-text {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
		margin-top: 0.25rem;
	}

	.formatting-toolbar {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.formatting-toolbar button {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		padding: 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.formatting-toolbar button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-capa-orange);
	}

	.formatting-toolbar button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.formatting-toolbar .material-icons {
		font-size: 1.2rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
		font-weight: normal !important;
		flex-direction: row;
	}

	.checkbox-label input[type='checkbox'] {
		opacity: 0;
		position: absolute;
		width: 0;
		height: 0;
	}

	.checkmark {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
		flex-shrink: 0;
	}

	.checkbox-label input[type='checkbox']:checked + .checkmark {
		background: var(--color-capa-orange);
		border-color: var(--color-capa-orange);
	}

	.checkbox-label input[type='checkbox']:checked + .checkmark::after {
		content: '✓';
		color: var(--color-capa-white);
		font-weight: bold;
		font-size: 0.8rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.cancel-btn,
	.submit-btn {
		padding: 0.75rem 2rem;
		border: none;
		border-radius: 25px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'eurostile', sans-serif;
	}

	.cancel-btn {
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-capa-white);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.cancel-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.submit-btn {
		background: linear-gradient(45deg, var(--color-capa-red), var(--color-capa-orange));
		color: var(--color-capa-white);
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(188, 48, 17, 0.3);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.btn-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid var(--color-capa-white);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@media (max-width: 768px) {
		.create-post-content {
			padding: 1rem;
		}

		.header h1 {
			font-size: 2rem;
		}

		.post-form {
			padding: 1.5rem;
		}

		.form-actions {
			flex-direction: column-reverse;
		}

		.cancel-btn,
		.submit-btn {
			width: 100%;
			justify-content: center;
		}

		.formatting-toolbar {
			flex-wrap: wrap;
		}
	}
</style>
