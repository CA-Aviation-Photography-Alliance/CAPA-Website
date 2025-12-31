<script lang="ts">
	import { moderationService } from '$lib/services/forum/moderationService';
	import { authStore } from '$lib/auth/store';
	import type { ForumPost, ForumComment, UserPermissions } from '$lib/types';
	import { createEventDispatcher } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	export let targetType: 'post' | 'comment';
	export let target: ForumPost | ForumComment;
	export let compact = false;
	export let onactioncomplete: ((event: CustomEvent) => void) | undefined = undefined;

	const dispatch = createEventDispatcher();

	let permissions: UserPermissions = {
		canModerate: false,
		canPin: false,
		canLock: false,
		canDelete: false,
		canEditAnyPost: false,
		canManageUsers: false
	};

	let showModerationMenu = false;
	let showReasonModal = false;
	let currentAction: string = '';
	let reason = '';
	let loading = false;
	let error = '';

	// Load user permissions
	$: if ($authStore.isAuthenticated) {
		loadPermissions();
	}

	async function loadPermissions() {
		try {
			permissions = await moderationService.getUserPermissions();
		} catch (err) {
			console.error('Error loading permissions:', err);
		}
	}

	function toggleMenu() {
		showModerationMenu = !showModerationMenu;
	}

	function closeMenu() {
		showModerationMenu = false;
	}

	function showActionModal(action: string) {
		currentAction = action;
		reason = '';
		error = '';
		showReasonModal = true;
		closeMenu();
	}

	function closeModal() {
		showReasonModal = false;
		currentAction = '';
		reason = '';
		error = '';
	}

	async function executeAction() {
		if (!currentAction) return;

		loading = true;
		error = '';

		try {
			const targetId = target.$id!;

			switch (currentAction) {
				case 'pin':
					await moderationService.togglePinPost(targetId, true, reason);
					break;
				case 'unpin':
					await moderationService.togglePinPost(targetId, false, reason);
					break;
				case 'lock':
					await moderationService.toggleLockPost(targetId, true, reason);
					break;
				case 'unlock':
					await moderationService.toggleLockPost(targetId, false, reason);
					break;
				case 'delete':
					if (!reason.trim()) {
						error = 'Reason is required for deletion';
						return;
					}
					if (targetType === 'post') {
						await moderationService.deletePost(targetId, reason);
					} else {
						await moderationService.deleteComment(targetId, reason);
					}
					break;
			}

			closeModal();
			const event = { action: currentAction, targetId };
			dispatch('actionComplete', event);
			if (onactioncomplete) {
				onactioncomplete(new CustomEvent('actionComplete', { detail: event }));
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Action failed';
		} finally {
			loading = false;
		}
	}

	function getActionLabel(action: string): string {
		switch (action) {
			case 'pin':
				return 'Pin Post';
			case 'unpin':
				return 'Unpin Post';
			case 'lock':
				return 'Lock Post';
			case 'unlock':
				return 'Unlock Post';
			case 'delete':
				return targetType === 'post' ? 'Delete Post' : 'Delete Comment';
			default:
				return 'Moderate';
		}
	}

	function getActionDescription(action: string): string {
		switch (action) {
			case 'pin':
				return 'Pin this post to the top of the category';
			case 'unpin':
				return 'Remove pin from this post';
			case 'lock':
				return 'Lock this post to prevent new comments';
			case 'unlock':
				return 'Unlock this post to allow comments';
			case 'delete':
				return `Permanently delete this ${targetType}`;
			default:
				return '';
		}
	}
</script>

{#if permissions.canModerate}
	<div class="moderation-controls" class:compact>
		<!-- Moderation Button -->
		<button
			class="mod-toggle-btn"
			class:active={showModerationMenu}
			onclick={toggleMenu}
			title="Moderation Controls"
		>
			<span class="material-icons">admin_panel_settings</span>
			{#if !compact}
				<span>Moderate</span>
			{/if}
		</button>

		<!-- Moderation Menu -->
		{#if showModerationMenu}
			<div class="mod-menu" transition:fade={{ duration: 200 }}>
				<div class="mod-menu-header">
					<span class="material-icons">gavel</span>
					<h4>Moderation Actions</h4>
					<button class="close-btn" onclick={closeMenu}>
						<span class="material-icons">close</span>
					</button>
				</div>

				<div class="mod-actions">
					{#if targetType === 'post'}
						<!-- Pin/Unpin -->
						{#if permissions.canPin && targetType === 'post'}
							{#if (target as ForumPost).isPinned}
								<button class="mod-action unpin" onclick={() => showActionModal('unpin')}>
									<span class="material-icons">push_pin</span>
									Unpin Post
								</button>
							{:else}
								<button class="mod-action pin" onclick={() => showActionModal('pin')}>
									<span class="material-icons">push_pin</span>
									Pin Post
								</button>
							{/if}
						{/if}

						<!-- Lock/Unlock -->
						{#if permissions.canLock && targetType === 'post'}
							{#if (target as ForumPost).isLocked}
								<button class="mod-action unlock" onclick={() => showActionModal('unlock')}>
									<span class="material-icons">lock_open</span>
									Unlock Post
								</button>
							{:else}
								<button class="mod-action lock" onclick={() => showActionModal('lock')}>
									<span class="material-icons">lock</span>
									Lock Post
								</button>
							{/if}
						{/if}
					{/if}

					<!-- Delete -->
					{#if permissions.canDelete}
						<button class="mod-action delete" onclick={() => showActionModal('delete')}>
							<span class="material-icons">delete</span>
							Delete {targetType === 'post' ? 'Post' : 'Comment'}
						</button>
					{/if}

					<!-- Report (for non-moderator actions) -->
					<button class="mod-action report" onclick={() => dispatch('report', { target })}>
						<span class="material-icons">flag</span>
						Report Content
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Action Confirmation Modal -->
	{#if showReasonModal}
		<div class="modal-overlay" transition:fade={{ duration: 200 }}>
			<div class="modal" transition:slide={{ duration: 300 }}>
				<div class="modal-header">
					<h3>{getActionLabel(currentAction)}</h3>
					<button class="close-btn" onclick={closeModal}>
						<span class="material-icons">close</span>
					</button>
				</div>

				<div class="modal-content">
					<p class="action-description">{getActionDescription(currentAction)}</p>

					{#if error}
						<div class="error-message">
							<span class="material-icons">error</span>
							{error}
						</div>
					{/if}

					<div class="form-group">
						<label for="reason">
							Reason {currentAction === 'delete' ? '(Required)' : '(Optional)'}:
						</label>
						<textarea
							id="reason"
							bind:value={reason}
							placeholder="Explain why you're taking this action..."
							rows="3"
							disabled={loading}
						></textarea>
					</div>
				</div>

				<div class="modal-actions">
					<button class="cancel-btn" onclick={closeModal} disabled={loading}> Cancel </button>
					<button
						class="confirm-btn {currentAction}"
						onclick={executeAction}
						disabled={loading || (currentAction === 'delete' && !reason.trim())}
					>
						{#if loading}
							<div class="spinner"></div>
						{:else}
							<span class="material-icons">
								{#if currentAction === 'delete'}
									delete
								{:else if currentAction === 'pin'}
									push_pin
								{:else if currentAction === 'lock'}
									lock
								{:else}
									check
								{/if}
							</span>
						{/if}
						{getActionLabel(currentAction)}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Click outside to close menu -->
	{#if showModerationMenu}
		<div
			class="menu-backdrop"
			role="button"
			tabindex="0"
			onclick={closeMenu}
			onkeydown={(e) => e.key === 'Escape' && closeMenu()}
		></div>
	{/if}
{/if}

<style>
	.moderation-controls {
		position: relative;
		display: inline-block;
	}

	.moderation-controls.compact {
		margin: 0;
	}

	.mod-toggle-btn {
		background: rgba(188, 48, 17, 0.1);
		border: 1px solid rgba(188, 48, 17, 0.3);
		color: var(--color-capa-orange);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-family: 'eurostile', sans-serif;
	}

	.moderation-controls.compact .mod-toggle-btn {
		padding: 0.5rem;
		min-width: 40px;
		justify-content: center;
	}

	.mod-toggle-btn:hover,
	.mod-toggle-btn.active {
		background: rgba(188, 48, 17, 0.2);
		border-color: var(--color-capa-orange);
	}

	.mod-toggle-btn .material-icons {
		font-size: 1.1rem;
	}

	.menu-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 99;
	}

	.mod-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		background: rgba(0, 0, 0, 0.95);
		border: 1px solid rgba(188, 48, 17, 0.3);
		border-radius: 10px;
		padding: 0;
		min-width: 250px;
		z-index: 100;
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
	}

	.mod-menu-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--color-capa-orange);
	}

	.mod-menu-header h4 {
		margin: 0;
		flex: 1;
		font-size: 1rem;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: color 0.3s ease;
	}

	.close-btn:hover {
		color: var(--color-capa-white);
	}

	.close-btn .material-icons {
		font-size: 1.2rem;
	}

	.mod-actions {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		gap: 0.25rem;
	}

	.mod-action {
		background: none;
		border: none;
		color: var(--color-capa-white);
		padding: 0.75rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-family: 'eurostile', sans-serif;
		font-size: 0.9rem;
		text-align: left;
	}

	.mod-action:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.mod-action.pin:hover,
	.mod-action.unpin:hover {
		background: rgba(251, 147, 31, 0.2);
		color: var(--color-capa-yellow);
	}

	.mod-action.lock:hover,
	.mod-action.unlock:hover {
		background: rgba(223, 70, 20, 0.2);
		color: var(--color-capa-orange);
	}

	.mod-action.delete:hover {
		background: rgba(255, 107, 157, 0.2);
		color: #ff6b9d;
	}

	.mod-action.report:hover {
		background: rgba(188, 48, 17, 0.2);
		color: var(--color-capa-red);
	}

	.mod-action .material-icons {
		font-size: 1.1rem;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: rgba(0, 0, 0, 0.95);
		border: 1px solid rgba(188, 48, 17, 0.3);
		border-radius: 15px;
		width: 100%;
		max-width: 500px;
		margin: 2rem;
		backdrop-filter: blur(10px);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h3 {
		margin: 0;
		color: var(--color-capa-orange);
	}

	.modal-content {
		padding: 1.5rem;
	}

	.action-description {
		margin: 0 0 1.5rem 0;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.error-message {
		background: rgba(255, 107, 157, 0.1);
		border: 1px solid rgba(255, 107, 157, 0.3);
		color: #ff6b9d;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.form-group textarea {
		width: 100%;
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: var(--color-capa-white);
		padding: 1rem;
		font-family: 'eurostile', sans-serif;
		resize: vertical;
		box-sizing: border-box;
	}

	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-capa-orange);
	}

	.form-group textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.cancel-btn,
	.confirm-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		font-family: 'eurostile', sans-serif;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.cancel-btn {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.cancel-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.confirm-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
	}

	.confirm-btn:hover:not(:disabled) {
		background: var(--color-capa-red);
		transform: translateY(-1px);
	}

	.confirm-btn.delete {
		background: #ff6b9d;
	}

	.confirm-btn.delete:hover:not(:disabled) {
		background: #ff4081;
	}

	.confirm-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid var(--color-capa-white);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Mobile Styles */
	@media (max-width: 768px) {
		.mod-menu {
			right: auto;
			left: 0;
			width: calc(100vw - 2rem);
			max-width: 300px;
		}

		.modal {
			margin: 1rem;
			max-height: calc(100vh - 2rem);
			overflow-y: auto;
		}

		.modal-actions {
			flex-direction: column;
		}

		.cancel-btn,
		.confirm-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
