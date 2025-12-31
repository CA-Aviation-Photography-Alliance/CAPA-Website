<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { forumService } from '$lib/services/forum/forumService';
	import { authStore } from '$lib/auth/store';
	import type { ForumPost, ForumComment } from '$lib/types';
	import { fade, fly } from 'svelte/transition';
	import ModerationControls from '$lib/components/forum/ModerationControls.svelte';

	let post: ForumPost | null = null;
	let comments: ForumComment[] = [];
	let loading = true;
	let loadingComments = false;
	let submittingComment = false;
	let error: string | null = null;
	let hasMoreComments = false;
	let currentPage = 1;

	// Comment form
	let newCommentContent = '';
	let replyingTo: string | null = null;
	let replyContent = '';
	let commentError = '';

	$: postId = $page.params.id;

	onMount(() => {
		if (postId) {
			loadComments();
		}
	});

	$: if (postId) {
		loadPost();
	}

	async function loadPost() {
		loading = true;
		error = null;

		try {
			if (!postId) {
				error = 'Invalid post ID';
				return;
			}
			post = await forumService.getPost(postId);
			if (!post) {
				error = 'Post not found';
				return;
			}

			await loadComments(true);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load post';
		} finally {
			loading = false;
		}
	}

	async function loadComments(reset = false) {
		if (reset) {
			comments = [];
			currentPage = 1;
			loadingComments = false;
		} else {
			loadingComments = true;
		}

		try {
			if (!postId) return;
			const result = await forumService.getComments(postId, currentPage);

			if (reset) {
				comments = result.comments;
			} else {
				comments = [...comments, ...result.comments];
			}

			hasMoreComments = result.hasMore;
		} catch (err) {
			console.error('Failed to load comments:', err);
		} finally {
			loadingComments = false;
		}
	}

	async function loadMoreComments() {
		if (loadingComments || !hasMoreComments) return;
		currentPage++;
		await loadComments(false);
	}

	async function handleSubmitComment() {
		if (!$authStore.isAuthenticated) return;
		if (!newCommentContent.trim()) {
			commentError = 'Comment cannot be empty';
			return;
		}

		submittingComment = true;
		commentError = '';

		try {
			if (!postId) return;
			await forumService.createComment({
				content: newCommentContent.trim(),
				postId: postId
			});

			newCommentContent = '';
			await loadComments(true);
		} catch (err) {
			commentError = err instanceof Error ? err.message : 'Failed to submit comment';
		} finally {
			submittingComment = false;
		}
	}

	async function handleSubmitReply(parentId: string) {
		if (!$authStore.isAuthenticated || !replyContent.trim()) return;

		try {
			if (!postId) return;
			await forumService.createComment({
				content: replyContent.trim(),
				postId: postId,
				parentId: parentId
			});

			replyContent = '';
			replyingTo = null;
			await loadComments(true);
		} catch (err) {
			console.error('Failed to submit reply:', err);
		}
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

	function formatContent(content: string): string {
		// Basic markdown-style formatting
		// TODO: Add HTML sanitization (e.g., DOMPurify) for production to prevent XSS attacks
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`(.*?)`/g, '<code>$1</code>')
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
			.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
			.replace(/\n/g, '<br>');
	}

	function startReply(commentId: string) {
		replyingTo = commentId;
		replyContent = '';
	}

	function cancelReply() {
		replyingTo = null;
		replyContent = '';
	}

	function isOwnPost(): boolean {
		return $authStore.user?.userId === post?.authorId;
	}

	async function handleDeletePost() {
		if (!post) return;

		const confirmed = confirm(
			'Are you sure you want to delete this post? This action cannot be undone.'
		);
		if (!confirmed) return;

		try {
			await forumService.deletePost(post.$id!);
			// Redirect to category page after successful deletion
			goto(`/forum/category/${post.category?.slug || ''}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete post';
		}
	}

	function handleEditPost() {
		if (!post) return;
		goto(`/forum/edit/${post.$id}`);
	}
</script>

<svelte:head>
	<title>{post?.title || 'Post'} - CAPA Forum</title>
	<meta name="description" content={post?.excerpt || 'Forum post'} />
</svelte:head>

<div class="post-container">
	<div class="spacer"></div>

	{#if loading}
		<div class="loading-container">
			<div class="spinner"></div>
			<p>Loading post...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<span class="material-icons">error</span>
			<h3>Failed to load post</h3>
			<p>{error}</p>
			<button onclick={() => goto('/forum')} class="back-btn">Back to Forum</button>
		</div>
	{:else if post}
		<div class="post-content" in:fade={{ duration: 500 }}>
			<!-- Breadcrumb -->
			<div class="breadcrumb" in:fly={{ y: -20, duration: 500, delay: 200 }}>
				<a href="/forum">Forum</a>
				<span class="material-icons">chevron_right</span>
				{#if post.category}
					<a href="/forum/category/{post.category.slug}">{post.category.name}</a>
					<span class="material-icons">chevron_right</span>
				{/if}
				<span>{post.title}</span>
			</div>

			<!-- Post Header -->
			<div class="post-header" in:fly={{ y: 20, duration: 500, delay: 300 }}>
				<div class="post-title-section">
					<h1 class="post-title">
						{#if post.isPinned}
							<span class="material-icons pinned-icon">push_pin</span>
						{/if}
						{#if post.isLocked}
							<span class="material-icons locked-icon">lock</span>
						{/if}
						{post.title}
					</h1>

					{#if post.tags && typeof post.tags === 'string' && post.tags.trim()}
						<div class="post-tags">
							{#each post.tags
								.split(',')
								.map((t) => t.trim())
								.filter((t) => t.length > 0) as tag (tag)}
								<span class="tag">{tag}</span>
							{/each}
						</div>
					{/if}
				</div>

				<div class="post-meta">
					<div class="author-info">
						<div class="author-details">
							<span class="author-name">{post.authorName}</span>
							<span class="post-date">{formatTimeAgo(post.$createdAt || '')}</span>
						</div>
					</div>

					<div class="post-stats">
						<span class="stat">
							<span class="material-icons">visibility</span>
							{post.views} views
						</span>
						<span class="stat">
							<span class="material-icons">comment</span>
							{post.commentCount} replies
						</span>
					</div>

					<!-- Author Controls -->
					{#if $authStore.isAuthenticated && isOwnPost()}
						<div class="author-controls">
							<button onclick={handleEditPost} class="action-btn edit-btn">
								<span class="material-icons">edit</span>
								Edit Post
							</button>
							<button onclick={handleDeletePost} class="action-btn delete-btn">
								<span class="material-icons">delete</span>
								Delete Post
							</button>
						</div>
					{/if}

					<!-- Moderation Controls -->
					<div class="moderation-section">
						<ModerationControls
							targetType="post"
							target={post}
							onactioncomplete={() => loadPost()}
						/>
					</div>
				</div>
			</div>

			<!-- Post Body -->
			<div class="post-body" in:fly={{ y: 20, duration: 500, delay: 400 }}>
				<div class="post-content-area">
					<div class="content">
						{@html formatContent(post.content)}
					</div>

					{#if post.attachments && post.attachments.length > 0}
						<div class="attachments">
							<h4>Attachments</h4>
							{#each post.attachments as attachment (attachment.filename)}
								<div class="attachment">
									<span class="material-icons">attachment</span>
									<a href={attachment.url} download>{attachment.filename}</a>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Comments Section -->
			<div class="comments-section" in:fly={{ y: 20, duration: 500, delay: 500 }}>
				<div class="comments-header">
					<h2>
						{#if post.commentCount === 0}
							No replies yet
						{:else if post.commentCount === 1}
							1 reply
						{:else}
							{post.commentCount} replies
						{/if}
					</h2>

					{#if $authStore.isAuthenticated && !post.isLocked}
						<button
							onclick={() =>
								document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' })}
							class="reply-btn"
						>
							<span class="material-icons">reply</span>
							Reply
						</button>
					{/if}
				</div>

				<!-- Comments List -->
				{#if comments.length > 0}
					<div class="comments-list">
						{#each comments as comment, index (comment.$id)}
							<div class="comment" in:fly={{ y: 20, duration: 300, delay: index * 50 }}>
								<div class="comment-content">
									<div class="comment-header">
										<div class="comment-meta">
											<span class="comment-author">{comment.authorName}</span>
											<span class="comment-date">{formatTimeAgo(comment.$createdAt || '')}</span>
											{#if comment.isEdited}
												<span class="edited-indicator">(edited)</span>
											{/if}
										</div>

										<!-- Comment Moderation Controls -->
										<ModerationControls
											targetType="comment"
											target={comment}
											compact={true}
											onactioncomplete={() => loadComments(true)}
										/>
									</div>

									<div class="comment-body">
										{@html formatContent(comment.content)}
									</div>

									{#if $authStore.isAuthenticated && !post.isLocked}
										<div class="comment-actions">
											<button onclick={() => startReply(comment.$id!)} class="action-btn">
												<span class="material-icons">reply</span>
												Reply
											</button>
										</div>
									{/if}

									<!-- Reply Form -->
									{#if replyingTo === comment.$id}
										<div class="reply-form" transition:fly={{ y: 20, duration: 300 }}>
											<textarea bind:value={replyContent} placeholder="Write your reply..." rows="3"
											></textarea>
											<div class="reply-actions">
												<button
													onclick={() => handleSubmitReply(comment.$id!)}
													class="submit-reply-btn"
													disabled={!replyContent.trim()}
												>
													Submit Reply
												</button>
												<button onclick={cancelReply} class="cancel-btn"> Cancel </button>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<!-- Load More Comments -->
					{#if hasMoreComments}
						<div class="load-more-section">
							<button onclick={loadMoreComments} class="load-more-btn" disabled={loadingComments}>
								{#if loadingComments}
									<div class="btn-spinner"></div>
									Loading...
								{:else}
									Load More Comments
								{/if}
							</button>
						</div>
					{/if}
				{/if}

				<!-- Comment Form -->
				{#if $authStore.isAuthenticated && !post.isLocked}
					<div class="comment-form" id="comment-form">
						<h3>Add a reply</h3>

						{#if commentError}
							<div class="form-error">
								<span class="material-icons">error</span>
								{commentError}
							</div>
						{/if}

						<textarea
							bind:value={newCommentContent}
							placeholder="Share your thoughts..."
							rows="6"
							disabled={submittingComment}
						></textarea>

						<div class="comment-form-actions">
							<button
								onclick={handleSubmitComment}
								class="submit-comment-btn"
								disabled={submittingComment || !newCommentContent.trim()}
							>
								{#if submittingComment}
									<div class="btn-spinner"></div>
									Submitting...
								{:else}
									<span class="material-icons">send</span>
									Submit Reply
								{/if}
							</button>
						</div>
					</div>
				{:else if !$authStore.isAuthenticated}
					<div class="login-prompt">
						<span class="material-icons">account_circle</span>
						<p>Sign in to join the discussion</p>
					</div>
				{:else if post.isLocked}
					<div class="locked-notice">
						<span class="material-icons">lock</span>
						<p>This post is locked and no longer accepting replies</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.post-container {
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

	.post-content {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
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

	.post-header {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		padding: 2rem;
		margin-bottom: 2rem;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
	}

	.post-title-section {
		margin-bottom: 1.5rem;
	}

	.post-title {
		font-size: 2.2rem;
		font-weight: bold;
		margin: 0 0 1rem 0;
		line-height: 1.3;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.pinned-icon {
		color: var(--color-capa-yellow);
		transform: rotate(45deg);
		font-size: 1.5rem;
		flex-shrink: 0;
		margin-top: 0.2rem;
	}

	.locked-icon {
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.5rem;
		flex-shrink: 0;
		margin-top: 0.2rem;
	}

	.post-tags {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.tag {
		background: rgba(188, 48, 17, 0.2);
		color: var(--color-capa-orange);
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: bold;
	}

	.post-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		flex-wrap: wrap;
		gap: 1rem;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.author-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.author-name {
		font-weight: bold;
		color: var(--color-capa-orange);
		font-size: 1.1rem;
	}

	.post-date {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.post-stats {
		display: flex;
		gap: 1.5rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.stat .material-icons {
		font-size: 1.1rem;
	}

	.moderation-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.post-body {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		padding: 2rem;
		margin-bottom: 2rem;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
	}

	.post-content-area {
		min-width: 0;
	}

	.content {
		line-height: 1.6;
		font-size: 1.1rem;
	}

	.content :global(h1),
	.content :global(h2),
	.content :global(h3),
	.content :global(h4),
	.content :global(h5),
	.content :global(h6) {
		margin-top: 2rem;
		margin-bottom: 1rem;
		color: var(--color-capa-white);
	}

	.content :global(p) {
		margin: 1rem 0;
	}

	.content :global(strong) {
		color: var(--color-capa-orange);
		font-weight: bold;
	}

	.content :global(em) {
		font-style: italic;
		color: var(--color-capa-yellow);
	}

	.content :global(code) {
		background: rgba(0, 0, 0, 0.5);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
		color: var(--color-capa-yellow);
	}

	.content :global(blockquote) {
		border-left: 4px solid var(--color-capa-orange);
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
		opacity: 0.9;
	}

	.content :global(a) {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}

	.content :global(a:hover) {
		color: var(--color-capa-yellow);
	}

	.attachments {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.attachments h4 {
		margin-bottom: 1rem;
		color: var(--color-capa-orange);
	}

	.attachment {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		margin-bottom: 0.5rem;
	}

	.attachment .material-icons {
		color: var(--color-capa-orange);
	}

	.attachment a {
		color: var(--color-capa-white);
		text-decoration: none;
	}

	.attachment a:hover {
		text-decoration: underline;
	}

	.comments-section {
		background: rgba(0, 0, 0, 0.7);
		border-radius: 15px;
		padding: 2rem;
		border: 1px solid rgba(188, 48, 17, 0.2);
		backdrop-filter: blur(10px);
	}

	.comments-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.comments-header h2 {
		margin: 0;
		font-size: 1.8rem;
	}

	.reply-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 20px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.reply-btn:hover {
		background: var(--color-capa-red);
		transform: translateY(-2px);
	}

	.comments-list {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.comment {
		background: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.author-controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.action-btn {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.7);
		padding: 0.75rem 1.5rem;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
	}

	.action-btn:hover {
		border-color: var(--color-capa-orange);
		color: var(--color-capa-orange);
		background: rgba(188, 48, 17, 0.1);
	}

	.action-btn .material-icons {
		font-size: 1.1rem;
	}

	.edit-btn:hover {
		border-color: var(--color-capa-yellow);
		color: var(--color-capa-yellow);
		background: rgba(251, 147, 31, 0.1);
	}

	.delete-btn:hover {
		border-color: #ff6b9d;
		color: #ff6b9d;
		background: rgba(255, 107, 157, 0.1);
	}

	.comment-content {
		min-width: 0;
	}

	.comment-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.comment-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.comment-author {
		font-weight: bold;
		color: var(--color-capa-orange);
	}

	.comment-date {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.edited-indicator {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
		font-style: italic;
	}

	.comment-body {
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.comment-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.action-btn {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.7);
		padding: 0.5rem 1rem;
		border-radius: 15px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.9rem;
	}

	.action-btn:hover {
		border-color: var(--color-capa-orange);
		color: var(--color-capa-orange);
	}

	.action-btn .material-icons {
		font-size: 1rem;
	}

	.reply-form {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.reply-form textarea {
		width: 100%;
		background: rgba(0, 0, 0, 0.5);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: var(--color-capa-white);
		padding: 1rem;
		font-family: 'eurostile', sans-serif;
		resize: vertical;
		margin-bottom: 1rem;
		box-sizing: border-box;
	}

	.reply-form textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	.reply-actions {
		display: flex;
		gap: 1rem;
	}

	.submit-reply-btn,
	.cancel-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 15px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.submit-reply-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
	}

	.submit-reply-btn:hover:not(:disabled) {
		background: var(--color-capa-red);
	}

	.submit-reply-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-btn {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.load-more-section {
		text-align: center;
		margin: 2rem 0;
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

	.comment-form {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 2px solid rgba(188, 48, 17, 0.3);
	}

	.comment-form h3 {
		margin: 0 0 1.5rem 0;
		color: var(--color-capa-white);
	}

	.form-error {
		background: rgba(220, 38, 127, 0.1);
		border: 1px solid rgba(220, 38, 127, 0.3);
		color: #ff6b9d;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.comment-form textarea {
		width: 100%;
		background: rgba(0, 0, 0, 0.5);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: var(--color-capa-white);
		padding: 1rem;
		font-family: 'eurostile', sans-serif;
		resize: vertical;
		margin-bottom: 1rem;
		box-sizing: border-box;
	}

	.comment-form textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	.comment-form textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.comment-form-actions {
		display: flex;
		justify-content: flex-end;
	}

	.submit-comment-btn {
		background: linear-gradient(45deg, var(--color-capa-red), var(--color-capa-orange));
		color: var(--color-capa-white);
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 25px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.submit-comment-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(188, 48, 17, 0.3);
	}

	.submit-comment-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.login-prompt,
	.locked-notice {
		text-align: center;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		margin-top: 2rem;
	}

	.login-prompt .material-icons,
	.locked-notice .material-icons {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		opacity: 0.7;
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
		.post-content {
			padding: 1rem;
		}

		.post-title {
			font-size: 1.8rem;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.post-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.post-body {
			gap: 1rem;
		}

		.comment {
			text-align: center;
		}

		.comment-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.comment-meta {
			justify-content: center;
		}

		.comments-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.reply-btn {
			align-self: center;
		}

		.comment-header {
			justify-content: center;
		}

		.comment-actions {
			justify-content: center;
		}

		.comment-form-actions {
			justify-content: center;
		}
	}
</style>
