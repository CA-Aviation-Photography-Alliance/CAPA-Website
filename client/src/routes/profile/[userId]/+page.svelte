<script lang="ts">
	import { onMount } from 'svelte';
	import AvatarCircle from '$lib/components/AvatarCircle.svelte';
	import { userProfileService } from '$lib/services/userProfileService';
	import { forumService } from '$lib/services/forum/forumService';
	import { wikiService } from '$lib/services/wiki/wikiService';
	import type { ForumPost, WikiPage, UserProfileData } from '$lib/types';
	import { authStore } from '$lib/auth/store';

	const { data } = $props<{ data: { userId: string } }>();

	let profile = $state<UserProfileData | null>(null);
	let profileLoading = $state(true);
	let profileError = $state<string | null>(null);

	let forumPosts = $state<ForumPost[]>([]);
	let forumLoading = $state(true);
	let forumError = $state<string | null>(null);

	let wikiPages = $state<WikiPage[]>([]);
	let wikiLoading = $state(true);
	let wikiError = $state<string | null>(null);

	let fallbackName = $state<string | null>(null);

	const formatTimeAgo = (dateString?: string) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'Just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
		if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
		return date.toLocaleDateString();
	};

	const bioText = () => profile?.bio?.trim() || '';

	const truncatedId = (value: string) => (value.length > 8 ? `${value.slice(0, 8)}…` : value);

	const escapeHtml = (value: string) =>
		value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

	const sanitizeUrl = (value: string) => {
		const trimmed = value.trim();
		const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
		try {
			const url = new URL(normalized);
			if (!/^https?:$/i.test(url.protocol)) {
				return null;
			}
			return url.toString();
		} catch {
			return null;
		}
	};

	const formatBioHtml = () => {
		const raw = bioText();
		if (!raw) return '';

		const regex = /\[([^\]]+)\]\(\s*([^)]+?)\s*\)/g;
		let result = '';
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(raw)) !== null) {
			result += escapeHtml(raw.slice(lastIndex, match.index));
			const safeUrl = sanitizeUrl(match[2]);

			if (safeUrl) {
				result += `<a href="${safeUrl.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(match[1])}</a>`;
			} else {
				result += escapeHtml(match[0]);
			}

			lastIndex = match.index + match[0].length;
		}

		result += escapeHtml(raw.slice(lastIndex));
		return result.replace(/\n/g, '<br />');
	};

	const usernameText = () => {
		const byProfile = profile?.username?.trim();
		if (byProfile) return byProfile;
		const byActivity = fallbackName?.trim();
		if (byActivity) return byActivity;
		return data.userId ? truncatedId(data.userId) : null;
	};

	const displayName = () => {
		const preferred = profile?.displayName?.trim();
		if (preferred) return preferred;
		return usernameText() || (data.userId ? truncatedId(data.userId) : 'Member');
	};

	const authUserId = $derived($authStore.user?.userId || $authStore.user?.$id || null);
	const isOwnProfile = $derived(authUserId === data.userId);

	onMount(() => {
		loadProfile();
		loadForumPosts();
		loadWikiPages();
	});

	async function loadProfile() {
		profileLoading = true;
		profileError = null;
		try {
			profile = await userProfileService.getProfile(data.userId);
		} catch (error) {
			console.warn('Failed to load profile', error);
			profileError = 'Unable to load profile details.';
		} finally {
			profileLoading = false;
		}
	}

	async function loadForumPosts() {
		forumLoading = true;
		forumError = null;
		try {
			const result = await forumService.getPosts({
				authorId: data.userId,
				limit: 5,
				sortBy: 'lastActivity',
				sortOrder: 'desc'
			});
			forumPosts = result.posts || [];
			if (!fallbackName && forumPosts.length > 0) {
				fallbackName = forumPosts[0].authorName;
			}
		} catch (error) {
			console.warn('Failed to load forum posts for profile', error);
			forumError = 'Unable to load forum activity.';
		} finally {
			forumLoading = false;
		}
	}

	async function loadWikiPages() {
		wikiLoading = true;
		wikiError = null;
		try {
			const result = await wikiService.listPages({
				authorId: data.userId,
				limit: 5,
				sortBy: 'updatedAt',
				sortOrder: 'desc'
			});
			wikiPages = result.success ? result.data || [] : [];
			if (!fallbackName && wikiPages.length > 0) {
				fallbackName = wikiPages[0].authorName;
			}
		} catch (error) {
			console.warn('Failed to load wiki pages for profile', error);
			wikiError = 'Unable to load wiki contributions.';
		} finally {
			wikiLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{displayName()} | CAPA Profile</title>
	<meta
		name="description"
		content={`View ${displayName()}'s CAPA profile, bio, and recent contributions.`}
	/>
</svelte:head>

<div class="public-profile-page">
	<div class="profile-hero">
		<div class="avatar-wrapper">
			<AvatarCircle userId={data.userId} name={displayName()} size={96} />
		</div>
		<div class="bio-wrapper">
			<div class="name-row">
				<h1>{displayName()}</h1>
				{#if isOwnProfile}
					<a href="/profile" class="edit-profile-link">Edit your profile</a>
				{/if}
			</div>
			{#if profileLoading}
				<p class="bio muted">Loading profile...</p>
			{:else if bioText()}
				<p class="bio" aria-live="polite">
					{@html formatBioHtml()}
				</p>
			{:else}
				<p class="bio muted">This user hasn't shared a bio yet.</p>
			{/if}
		</div>
	</div>

	<div class="activity-grid">
		<section class="activity-card">
			<div class="card-header">
				<h2>Recent Forum Posts</h2>
				<a href="/forum" class="view-all-link">View forum</a>
			</div>

			{#if forumLoading}
				<p class="muted">Loading forum activity...</p>
			{:else if forumError}
				<p class="error">{forumError}</p>
			{:else if forumPosts.length === 0}
				<p class="muted">No forum posts yet.</p>
			{:else}
				<ul class="activity-list">
					{#each forumPosts as post (post.$id)}
						<li>
							<a href={`/forum/post/${post.$id}`} class="activity-title">{post.title}</a>
							<div class="activity-meta">
								<span>{formatTimeAgo(post.$createdAt || post.$updatedAt)}</span>
								<span>• {post.commentCount} replies</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="activity-card">
			<div class="card-header">
				<h2>Recent Wiki Contributions</h2>
				<a href="/wiki" class="view-all-link">Browse wiki</a>
			</div>

			{#if wikiLoading}
				<p class="muted">Loading wiki activity...</p>
			{:else if wikiError}
				<p class="error">{wikiError}</p>
			{:else if wikiPages.length === 0}
				<p class="muted">No wiki contributions yet.</p>
			{:else}
				<ul class="activity-list">
					{#each wikiPages as page (page.$id)}
						<li>
							<a href={`/wiki/${page.slug}`} class="activity-title">{page.title}</a>
							<div class="activity-meta">
								<span>{formatTimeAgo(page.$updatedAt || page.$createdAt)}</span>
								{#if page.category?.name}
									<span>• {page.category.name}</span>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	.public-profile-page {
		padding: 90px 1.5rem 3rem;
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		max-width: 1100px;
		margin: 0 auto;
	}

	.profile-hero {
		display: flex;
		gap: 2rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.avatar-wrapper {
		flex-shrink: 0;
	}

	.bio-wrapper {
		flex: 1;
		min-width: 0;
	}

	.name-row {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	h1 {
		font-size: 2rem;
		margin: 0;
	}

	.username {
		margin: 0.25rem 0 1rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.bio {
		margin: 0;
		font-size: 1rem;
		line-height: 1.6;
		word-break: break-word;
	}

	.bio a {
		color: var(--color-capa-red);
		text-decoration: none;
		font-weight: 600;
	}

	.bio a:hover,
	.bio a:focus-visible {
		color: var(--color-capa-orange);
		text-decoration: underline;
	}

	.muted {
		color: rgba(255, 255, 255, 0.6);
	}

	.edit-profile-link {
		margin-left: auto;
		font-size: 0.9rem;
		color: var(--color-capa-orange);
		text-decoration: none;
	}

	.activity-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.activity-card {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.5rem;
		min-height: 220px;
		display: flex;
		flex-direction: column;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.3rem;
	}

	.view-all-link {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
	}

	.view-all-link:hover {
		color: var(--color-capa-orange);
	}

	.activity-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-title {
		color: var(--color-capa-white);
		text-decoration: none;
		font-weight: 600;
	}

	.activity-title:hover {
		color: var(--color-capa-orange);
	}

	.activity-meta {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
		display: flex;
		gap: 0.5rem;
	}

	.error {
		color: var(--color-capa-yellow);
		margin: 0;
	}

	@media (max-width: 768px) {
		.public-profile-page {
			padding: 80px 1rem 2rem;
		}

		.profile-hero {
			flex-direction: column;
		}

		.edit-profile-link {
			margin-left: 0;
		}
	}
</style>
