<script lang="ts">
	import type { ForumComment } from '$lib/types';
	import { authStore } from '$lib/auth/store';

	export let comment: ForumComment;

	export let onReply: (commentId: string) => void;
	export let onEdit: (commentId: string, content: string) => Promise<void>;
	export let onDelete: (commentId: string) => Promise<void>;

	export let level = 0;

	let isEditing = false;
	let editContent = '';
	let showReplies = true;

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
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`(.*?)`/g, '<code>$1</code>')
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
			.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
			.replace(/\n/g, '<br>');
	}

	function startEdit() {
		isEditing = true;
		editContent = comment.content;
	}

	function cancelEdit() {
		isEditing = false;
		editContent = '';
	}

	async function submitEdit() {
		if (editContent.trim() !== comment.content) {
			await onEdit(comment.$id!, editContent.trim());
		}
		isEditing = false;
		editContent = '';
	}

	function isOwnComment(): boolean {
		return $authStore.user?.userId === comment.authorId;
	}
</script>

<div class="comment" class:nested={level > 0} style="--depth: {Math.min(level, 5)}">
	<!-- Comment Content -->
	<div class="comment-content">
		<div class="comment-header">
			<div class="author-info">
				<span class="comment-author">{comment.authorName}</span>
				<span class="comment-date">{formatTimeAgo(comment.$createdAt || '')}</span>
				{#if comment.isEdited}
					<span class="edited-indicator">(edited)</span>
				{/if}
			</div>
		</div>

		{#if isEditing}
			<div class="edit-form">
				<textarea bind:value={editContent} rows="4" placeholder="Edit your comment..."></textarea>
				<div class="edit-actions">
					<button onclick={submitEdit} class="save-btn" disabled={!editContent.trim()}>
						Save
					</button>
					<button onclick={cancelEdit} class="cancel-btn"> Cancel </button>
				</div>
			</div>
		{:else}
			<div class="comment-body">
				{@html formatContent(comment.content)}
			</div>
		{/if}

		{#if comment.attachments && comment.attachments.length > 0}
			<div class="comment-attachments">
				{#each comment.attachments as attachment}
					<div class="attachment">
						<span class="material-icons">attachment</span>
						<a href={attachment.url} target="_blank" rel="noopener">{attachment.filename}</a>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Comment Actions -->
		{#if $authStore.isAuthenticated && !isEditing}
			<div class="comment-actions">
				<button onclick={() => onReply(comment.$id!)} class="action-btn reply-btn">
					<span class="material-icons">reply</span>
					Reply
				</button>

				{#if isOwnComment()}
					<button onclick={startEdit} class="action-btn edit-btn">
						<span class="material-icons">edit</span>
						Edit
					</button>

					<button onclick={() => onDelete(comment.$id!)} class="action-btn delete-btn">
						<span class="material-icons">delete</span>
						Delete
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.comment {
		background: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		font-family: 'eurostile', sans-serif;
		color: var(--color-capa-white);
		margin-bottom: 1rem;
		transition: all 0.3s ease;
	}

	.comment.nested {
		margin-left: calc(var(--depth) * 2rem);
		border-left: 3px solid rgba(188, 48, 17, 0.3);
		background: rgba(0, 0, 0, 0.3);
	}

	.comment:hover {
		border-color: rgba(188, 48, 17, 0.4);
		background: rgba(0, 0, 0, 0.6);
	}

	.comment-content {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.comment-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.comment-author {
		font-weight: bold;
		color: var(--color-capa-orange);
		font-size: 1rem;
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
		font-size: 1rem;
	}

	.comment-body :global(strong) {
		color: var(--color-capa-orange);
		font-weight: bold;
	}

	.comment-body :global(em) {
		font-style: italic;
		color: var(--color-capa-yellow);
	}

	.comment-body :global(code) {
		background: rgba(0, 0, 0, 0.5);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
		color: var(--color-capa-yellow);
	}

	.comment-body :global(blockquote) {
		border-left: 3px solid var(--color-capa-orange);
		padding-left: 1rem;
		margin: 0.5rem 0;
		font-style: italic;
		opacity: 0.9;
	}

	.comment-body :global(a) {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}

	.comment-body :global(a:hover) {
		color: var(--color-capa-yellow);
	}

	.comment-attachments {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
	}

	.attachment {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		margin-bottom: 0.5rem;
	}

	.attachment .material-icons {
		color: var(--color-capa-orange);
		font-size: 1.1rem;
	}

	.attachment a {
		color: var(--color-capa-white);
		text-decoration: none;
		font-size: 0.9rem;
	}

	.attachment a:hover {
		text-decoration: underline;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.edit-form textarea {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: var(--color-capa-white);
		padding: 1rem;
		font-family: 'eurostile', sans-serif;
		resize: vertical;
		min-height: 100px;
	}

	.edit-form textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	.edit-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.save-btn,
	.cancel-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		font-family: 'eurostile', sans-serif;
	}

	.save-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
	}

	.save-btn:hover:not(:disabled) {
		background: var(--color-capa-red);
	}

	.save-btn:disabled {
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

	.comment-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
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
		font-family: 'eurostile', sans-serif;
	}

	.action-btn:hover {
		border-color: var(--color-capa-orange);
		color: var(--color-capa-orange);
		background: rgba(188, 48, 17, 0.1);
	}

	.action-btn .material-icons {
		font-size: 1rem;
	}

	.reply-btn:hover {
		border-color: var(--color-capa-orange);
		color: var(--color-capa-orange);
	}

	.edit-btn:hover {
		border-color: var(--color-capa-yellow);
		color: var(--color-capa-yellow);
	}

	.delete-btn:hover {
		border-color: #ff6b9d;
		color: #ff6b9d;
		background: rgba(255, 107, 157, 0.1);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.comment {
			padding: 1rem;
		}

		.comment.nested {
			margin-left: calc(var(--depth) * 1rem);
		}

		.author-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.comment-actions {
			flex-direction: column;
			align-items: flex-start;
		}

		.action-btn {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.edit-actions {
			flex-direction: column;
		}

		.save-btn,
		.cancel-btn {
			width: 100%;
		}
	}
</style>
