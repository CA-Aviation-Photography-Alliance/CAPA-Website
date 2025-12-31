<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { moderationService } from '$lib/services/forum/moderationService';
	import { authStore } from '$lib/auth/store';
	import type { UserReport, ModerationAction, UserPermissions } from '$lib/types';
	import { fade, fly } from 'svelte/transition';

	let permissions: UserPermissions = {
		canModerate: false,
		canPin: false,
		canLock: false,
		canDelete: false,
		canEditAnyPost: false,
		canManageUsers: false
	};

	let pendingReports: UserReport[] = [];
	let moderationHistory: ModerationAction[] = [];
	let stats = {
		pendingReports: 0,
		actionsToday: 0,
		totalPosts: 0,
		totalComments: 0
	};

	let loading = true;
	let error: string | null = null;
	let activeTab: 'reports' | 'history' | 'stats' = 'reports';

	onMount(async () => {
		// Check if user has moderation permissions
		if (!$authStore.isAuthenticated) {
			goto('/forum');
			return;
		}

		try {
			permissions = await moderationService.getUserPermissions();
			if (!permissions.canModerate) {
				goto('/forum');
				return;
			}

			await loadData();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load moderation dashboard';
		} finally {
			loading = false;
		}
	});

	async function loadData() {
		try {
			const [reportsResult, historyResult, statsResult] = await Promise.all([
				moderationService.getPendingReports(),
				moderationService.getModerationHistory(20),
				moderationService.getModerationStats()
			]);

			pendingReports = reportsResult;
			moderationHistory = historyResult;
			stats = statsResult;
		} catch (err) {
			console.error('Error loading moderation data:', err);
			throw err;
		}
	}

	async function resolveReport(reportId: string, status: 'resolved' | 'dismissed', resolution: string) {
		try {
			await moderationService.resolveReport(reportId, status, resolution);
			await loadData(); // Refresh data
		} catch (err) {
			console.error('Error resolving report:', err);
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

	function getActionColor(actionType: string): string {
		switch (actionType) {
			case 'pin':
			case 'unpin':
				return 'var(--color-capa-yellow)';
			case 'lock':
			case 'unlock':
				return 'var(--color-capa-orange)';
			case 'delete':
				return '#ff6b9d';
			case 'edit':
			case 'move':
				return 'var(--color-capa-white)';
			default:
				return 'rgba(255, 255, 255, 0.6)';
		}
	}

	function getActionIcon(actionType: string): string {
		switch (actionType) {
			case 'pin':
			case 'unpin':
				return 'push_pin';
			case 'lock':
				return 'lock';
			case 'unlock':
				return 'lock_open';
			case 'delete':
				return 'delete';
			case 'edit':
				return 'edit';
			case 'move':
				return 'drive_file_move';
			default:
				return 'gavel';
		}
	}
</script>

<svelte:head>
	<title>Moderation Dashboard - CAPA Forum</title>
</svelte:head>

<div class="moderation-dashboard">
	<div class="spacer"></div>

	{#if loading}
		<div class="loading-container">
			<div class="spinner"></div>
			<p>Loading moderation dashboard...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<span class="material-icons">error</span>
			<h3>Access Denied</h3>
			<p>{error}</p>
			<button onclick={() => goto('/forum')} class="back-btn">Back to Forum</button>
		</div>
	{:else}
		<div class="dashboard-content" in:fade={{ duration: 500 }}>
			<!-- Dashboard Header -->
			<div class="dashboard-header" in:fly={{ y: -20, duration: 500, delay: 200 }}>
				<div class="header-content">
					<div class="breadcrumb">
						<a href="/forum">Forum</a>
						<span class="material-icons">chevron_right</span>
						<span>Moderation</span>
					</div>

					<div class="header-title">
						<h1>Moderation Dashboard</h1>
						<p>Manage forum content and community guidelines</p>
					</div>
				</div>
			</div>

			<!-- Stats Overview -->
			<div class="stats-overview" in:fly={{ y: 20, duration: 500, delay: 300 }}>
				<div class="stat-card">
					<div class="stat-icon">
						<span class="material-icons">flag</span>
					</div>
					<div class="stat-content">
						<div class="stat-number">{stats.pendingReports}</div>
						<div class="stat-label">Pending Reports</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<span class="material-icons">today</span>
					</div>
					<div class="stat-content">
						<div class="stat-number">{stats.actionsToday}</div>
						<div class="stat-label">Actions Today</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<span class="material-icons">forum</span>
					</div>
					<div class="stat-content">
						<div class="stat-number">{stats.totalPosts}</div>
						<div class="stat-label">Total Posts</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<span class="material-icons">comment</span>
					</div>
					<div class="stat-content">
						<div class="stat-number">{stats.totalComments}</div>
						<div class="stat-label">Total Comments</div>
					</div>
				</div>
			</div>

			<!-- Tab Navigation -->
			<div class="tab-navigation" in:fly={{ y: 20, duration: 500, delay: 400 }}>
				<button
					class="tab-btn"
					class:active={activeTab === 'reports'}
					onclick={() => activeTab = 'reports'}
				>
					<span class="material-icons">flag</span>
					Pending Reports
					{#if pendingReports.length > 0}
						<span class="badge">{pendingReports.length}</span>
					{/if}
				</button>

				<button
					class="tab-btn"
					class:active={activeTab === 'history'}
					onclick={() => activeTab = 'history'}
				>
					<span class="material-icons">history</span>
					Recent Actions
				</button>

				<button
					class="tab-btn"
					class:active={activeTab === 'stats'}
					onclick={() => activeTab = 'stats'}
				>
					<span class="material-icons">analytics</span>
					Statistics
				</button>
			</div>

			<!-- Tab Content -->
			<div class="tab-content" in:fly={{ y: 20, duration: 500, delay: 500 }}>
				{#if activeTab === 'reports'}
					<div class="reports-section">
						<h2>Pending Reports</h2>

						{#if pendingReports.length === 0}
							<div class="empty-state">
								<span class="material-icons">check_circle</span>
								<h3>No pending reports</h3>
								<p>All reports have been reviewed!</p>
							</div>
						{:else}
							<div class="reports-list">
								{#each pendingReports as report, index}
									<div class="report-card" in:fly={{ y: 20, duration: 300, delay: index * 50 }}>
										<div class="report-header">
											<div class="report-type">
												<span class="material-icons">
													{#if report.targetType === 'post'}
														article
													{:else if report.targetType === 'comment'}
														comment
													{:else}
														person
													{/if}
												</span>
												<span class="type-label">{report.targetType}</span>
											</div>
											<span class="report-time">{formatTimeAgo(report.$createdAt || '')}</span>
										</div>

										<div class="report-content">
											<div class="reporter">
												<strong>Reported by:</strong> {report.reporterName}
											</div>
											<div class="reason">
												<strong>Reason:</strong> {report.reason}
											</div>
											<div class="description">
												<strong>Description:</strong> {report.description}
											</div>
										</div>

										<div class="report-actions">
											<button
												class="resolve-btn"
												onclick={() => resolveReport(report.$id!, 'resolved', 'Resolved by moderator')}
											>
												<span class="material-icons">check</span>
												Resolve
											</button>
											<button
												class="dismiss-btn"
												onclick={() => resolveReport(report.$id!, 'dismissed', 'Dismissed - no action needed')}
											>
												<span class="material-icons">close</span>
												Dismiss
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'history'}
					<div class="history-section">
						<h2>Recent Moderation Actions</h2>

						{#if moderationHistory.length === 0}
							<div class="empty-state">
								<span class="material-icons">history</span>
								<h3>No recent actions</h3>
								<p>Moderation actions will appear here</p>
							</div>
						{:else}
							<div class="history-list">
								{#each moderationHistory as action, index}
									<div class="action-card" in:fly={{ y: 20, duration: 300, delay: index * 50 }}>
										<div class="action-icon" style="color: {getActionColor(action.actionType)}">
											<span class="material-icons">{getActionIcon(action.actionType)}</span>
										</div>

										<div class="action-content">
											<div class="action-summary">
												<strong>{action.moderatorName}</strong>
												{action.actionType}d a {action.targetType}
											</div>
											{#if action.reason}
												<div class="action-reason">
													<strong>Reason:</strong> {action.reason}
												</div>
											{/if}
											<div class="action-time">
												{formatTimeAgo(action.$createdAt || '')}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'stats'}
					<div class="stats-section">
						<h2>Detailed Statistics</h2>

						<div class="detailed-stats">
							<div class="stats-grid">
								<div class="detailed-stat-card">
									<h3>Content Overview</h3>
									<div class="stat-rows">
										<div class="stat-row">
											<span>Total Posts:</span>
											<span>{stats.totalPosts.toLocaleString()}</span>
										</div>
										<div class="stat-row">
											<span>Total Comments:</span>
											<span>{stats.totalComments.toLocaleString()}</span>
										</div>
									</div>
								</div>

								<div class="detailed-stat-card">
									<h3>Moderation Activity</h3>
									<div class="stat-rows">
										<div class="stat-row">
											<span>Pending Reports:</span>
											<span class="highlight">{stats.pendingReports}</span>
										</div>
										<div class="stat-row">
											<span>Actions Today:</span>
											<span>{stats.actionsToday}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.moderation-dashboard {
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
	}

	.spacer {
		height: 70px;
	}

	.loading-container, .error-container {
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
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

	.dashboard-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.dashboard-header {
		margin-bottom: 3rem;
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

	.header-title h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem 0;
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.header-title p {
		font-size: 1.1rem;
		opacity: 0.8;
		margin: 0;
	}

	.stats-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(188, 48, 17, 0.2);
		border-radius: 15px;
		padding: 2rem;
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		background: rgba(188, 48, 17, 0.2);
		color: var(--color-capa-orange);
		padding: 1rem;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-icon .material-icons {
		font-size: 2rem;
	}

	.stat-content {
		flex: 1;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: bold;
		color: var(--color-capa-white);
		margin-bottom: 0.25rem;
	}

	.stat-label {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
	}

	.tab-navigation {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
	}

	.tab-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		padding: 1rem 1.5rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
		border-radius: 8px 8px 0 0;
		position: relative;
	}

	.tab-btn:hover {
		color: var(--color-capa-orange);
		background: rgba(188, 48, 17, 0.1);
	}

	.tab-btn.active {
		color: var(--color-capa-orange);
		background: rgba(188, 48, 17, 0.2);
		border-bottom: 2px solid var(--color-capa-orange);
	}

	.tab-btn .material-icons {
		font-size: 1.2rem;
	}

	.badge {
		background: var(--color-capa-red);
		color: var(--color-capa-white);
		padding: 0.25rem 0.5rem;
		border-radius: 10px;
		font-size: 0.8rem;
		min-width: 20px;
		text-align: center;
	}

	.tab-content {
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(188, 48, 17, 0.2);
		border-radius: 15px;
		padding: 2rem;
		backdrop-filter: blur(10px);
	}

	.reports-section h2,
	.history-section h2,
	.stats-section h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: var(--color-capa-orange);
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.empty-state .material-icons {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
	}

	.reports-list,
	.history-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.report-card,
	.action-card {
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 1.5rem;
	}

	.report-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.report-type {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-capa-orange);
		font-weight: bold;
	}

	.report-time {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.report-content {
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.report-content > div {
		margin-bottom: 0.5rem;
	}

	.report-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.resolve-btn,
	.dismiss-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'eurostile', sans-serif;
	}

	.resolve-btn {
		background: var(--color-capa-orange);
		color: var(--color-capa-white);
	}

	.resolve-btn:hover {
		background: var(--color-capa-red);
	}

	.dismiss-btn {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.dismiss-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.action-card {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.action-icon {
		background: rgba(0, 0, 0, 0.5);
		padding: 0.75rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-icon .material-icons {
		font-size: 1.5rem;
	}

	.action-content {
		flex: 1;
	}

	.action-summary {
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}

	.action-reason {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 0.25rem;
	}

	.action-time {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.detailed-stats {
		margin-top: 1rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.detailed-stat-card {
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 1.5rem;
	}

	.detailed-stat-card h3 {
		margin: 0 0 1rem 0;
		color: var(--color-capa-orange);
		font-size: 1.1rem;
	}

	.stat-rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat-row:last-child {
		border-bottom: none;
	}

	.stat-row .highlight {
		color: var(--color-capa-red);
		font-weight: bold;
	}

	@media (max-width: 768px) {
		.dashboard-content {
			padding: 1rem;
		}

		.header-title h1 {
			font-size: 2rem;
		}

		.stats-overview {
			grid-template-columns: 1fr;
		}

		.tab-navigation {
			flex-direction: column;
		}

		.tab-btn {
			border-radius: 8px;
			border-bottom: none;
		}

		.tab-btn.active {
			border-bottom: none;
			border-left: 4px solid var(--color-capa-orange);
		}

		.report-actions {
			flex-direction: column;
		}

		.resolve-btn,
		.dismiss-btn {
			width: 100%;
			justify-content: center;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
