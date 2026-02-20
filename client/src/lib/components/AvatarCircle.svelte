<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { userProfileService } from '$lib/services/userProfileService';

	export let userId: string | null | undefined = undefined;
	export let name: string | null | undefined = undefined;
	export let size = 40;
	export let src: string | null | undefined = null;

	let avatar: string | null = null;
	let lastUserId: string | null = null;
	let destroyed = false;

	const normalize = (value?: string | null): string | null => {
		if (typeof value !== 'string') return null;
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	};

	const getInitials = (value?: string | null): string => {
		if (!value) return '?';
		const trimmed = value.trim();
		return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
	};

	$: normalizedSrc = normalize(src);

	// Reset cached avatar when the user changes
	$: if ((userId ?? null) !== lastUserId) {
		lastUserId = userId ?? null;
		avatar = normalizedSrc;
	}

	// Keep avatar in sync if an explicit src prop is provided
	$: if (normalizedSrc && normalizedSrc !== avatar) {
		avatar = normalizedSrc;
	}

	// Fetch avatar lazily in the browser if we still don't have one
	$: if (browser && userId && !avatar) {
		loadAvatar(userId);
	}

	async function loadAvatar(targetId: string) {
		try {
			const fetched = await userProfileService.getAvatar(targetId);
			if (!destroyed && targetId === userId && fetched && !avatar) {
				avatar = fetched;
			}
		} catch (error) {
			// Swallow fetch errors; component will keep showing initials
			console.warn('Failed to load avatar for user', targetId, error);
		}
	}

	onDestroy(() => {
		destroyed = true;
	});
</script>

<div
	class="avatar-circle"
	class:has-image={!!avatar}
	style={`--avatar-size:${size}px`}
>
	{#if avatar}
		<img
			src={avatar}
			alt={name ? `${name}'s avatar` : 'User avatar'}
			loading="lazy"
			decoding="async"
		/>
	{:else}
		<span aria-hidden="true">{getInitials(name)}</span>
	{/if}
</div>

<style>
	.avatar-circle {
		width: var(--avatar-size, 40px);
		height: var(--avatar-size, 40px);
		border-radius: 50%;
		border: 1px solid var(--avatar-border-color, rgba(255, 255, 255, 0.2));
		background: var(--avatar-bg-color, rgba(255, 255, 255, 0.08));
		color: var(--avatar-text-color, var(--color-capa-white, #ffffff));
		display: inline-flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font-weight: bold;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.avatar-circle.has-image {
		border-color: transparent;
		background: transparent;
	}

	.avatar-circle img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-circle span {
		font-size: calc(var(--avatar-size, 40px) * 0.45);
	}
</style>
