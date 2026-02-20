import { browser } from '$app/environment';
import { Permission, Role } from 'appwrite';
import type { AuthUser, UserProfileData, UserProfileLink } from '$lib/types';
import { COLLECTIONS, databases, getDatabase } from '$lib/config/appwrite';

type AvatarLikeDoc = {
	picture?: string;
	avatar?: string;
	avatarUrl?: string;
	photo?: string;
	image?: string;
	imageUrl?: string;
	username?: string;
	userName?: string;
	handle?: string;
	preferredName?: string;
	displayName?: string;
	name?: string;
	bio?: string;
	links?: string | UserProfileLink[];
};

type ProfileExtras = {
	bio?: string | null;
	links?: UserProfileLink[];
};

const MAX_LINKS = 5;

class UserProfileService {
	private avatarCache = new Map<string, string | null>();
	private profileCache = new Map<string, UserProfileData | null>();
	private pendingProfiles = new Map<string, Promise<UserProfileData | null>>();
	private collectionId = COLLECTIONS.USER_PROFILES;
	private warnedMissingCollection = false;
	private warnedServerLookup = false;

	async getAvatar(userId?: string | null): Promise<string | null> {
		if (!browser || !userId) {
			return null;
		}

		if (!this.collectionId) {
			if (!this.warnedMissingCollection) {
				console.warn(
					'VITE_APPWRITE_USER_PROFILES_COLLECTION_ID is not set; skipping avatar lookup.'
				);
				this.warnedMissingCollection = true;
			}
			return null;
		}

		if (this.avatarCache.has(userId)) {
			return this.avatarCache.get(userId)!;
		}

		const profile = await this.getProfile(userId);
		return profile?.picture ?? null;
	}

	async getProfile(userId?: string | null): Promise<UserProfileData | null> {
		if (!browser) {
			if (!this.warnedServerLookup) {
				console.warn('User profile lookup skipped on server for', userId);
				this.warnedServerLookup = true;
			}
			return null;
		}

		if (!userId) {
			console.warn('User profile lookup called without userId');
			return null;
		}

		if (!this.collectionId) {
			if (!this.warnedMissingCollection) {
				console.warn('USER_PROFILES collection id missing; cannot fetch profiles');
				this.warnedMissingCollection = true;
			}
			return null;
		}

		if (this.profileCache.has(userId)) {
			return this.profileCache.get(userId)!;
		}

		if (this.pendingProfiles.has(userId)) {
			return this.pendingProfiles.get(userId)!;
		}

		const request = this.fetchProfile(userId);
		this.pendingProfiles.set(userId, request);
		const profile = await request;
		this.pendingProfiles.delete(userId);

		this.profileCache.set(userId, profile);
		this.avatarCache.set(userId, profile?.picture ?? null);

		return profile;
	}

	setAvatar(userId: string | null | undefined, url: string | null): void {
		if (!userId) return;
		this.avatarCache.set(userId, url);
		const current = this.profileCache.get(userId);
		if (current) {
			this.profileCache.set(userId, { ...current, picture: url });
		}
	}

	async syncProfile(user: AuthUser | null | undefined, extras?: ProfileExtras): Promise<void> {
		if (!browser || !user || !this.collectionId) return;

		const databaseId = getDatabase();
		if (!databaseId) return;

		const docId = user.$id || user.userId;
		if (!docId) return;

		const normalizedExtras = this.normalizeExtras(extras);

		const username = (user.username || user.email?.split('@')[0] || '').trim();
		const displayName = (user.nickname || user.name || user.username || username || '').trim();

		const data: Record<string, unknown> = {
			userId: docId,
			picture: user.picture ?? ''
		};

		if (username) {
			data.username = username;
		}

		if (normalizedExtras.bio !== undefined) {
			data.bio = normalizedExtras.bio;
		}

		if (normalizedExtras.links !== undefined) {
			data.links = normalizedExtras.links.length > 0 ? JSON.stringify(normalizedExtras.links) : '';
		}

		const permissions = [
			Permission.read(Role.any()),
			Permission.read(Role.user(docId)),
			Permission.write(Role.user(docId)),
			Permission.update(Role.user(docId)),
			Permission.delete(Role.user(docId))
		];

		try {
			await databases.createDocument(databaseId, this.collectionId, docId, data, permissions);
		} catch (error: any) {
			if (error?.code === 409) {
				await databases.updateDocument(databaseId, this.collectionId, docId, data, permissions);
			} else {
				console.warn('Failed to sync user profile document', docId, error);
				return;
			}
		}

		const profile: UserProfileData = {
			userId: docId,
			picture: user.picture || null,
			username: username || null,
			displayName: displayName || null,
			bio: normalizedExtras.bio ?? undefined,
			links: normalizedExtras.links
		};

		this.avatarCache.set(docId, profile.picture ?? null);
		this.profileCache.set(docId, {
			...(this.profileCache.get(docId) || { userId: docId }),
			...profile
		});
	}

	private async fetchProfile(userId: string): Promise<UserProfileData | null> {
		try {
			const databaseId = getDatabase();
			if (!databaseId) return null;

			console.debug('Fetching profile document for user', userId);
			const doc = (await databases.getDocument(
				databaseId,
				this.collectionId!,
				userId
			)) as AvatarLikeDoc | undefined;
			if (!doc) {
				console.warn('No profile document found for user', userId);
				return null;
			}

			const username = this.deriveUsername(doc);
			if (!username) {
				this.logMissingUsername(userId, doc);
			}
			const displayName =
				this.normalize(doc.displayName) || this.normalize(doc.name) || username || null;

			console.debug('Resolved profile names', { userId, username, displayName });

			return {
				userId,
				picture:
					this.normalize(doc.picture) ||
					this.normalize(doc.avatar) ||
					this.normalize(doc.avatarUrl) ||
					this.normalize(doc.photo) ||
					this.normalize(doc.image) ||
					this.normalize(doc.imageUrl),
				username: username || displayName,
				displayName,
				bio: this.normalize(doc.bio),
				links: this.parseLinks(doc.links)
			};
		} catch (error) {
			console.warn('Failed to fetch profile for user', userId, error);
			return null;
		}
	}

	private parseLinks(value: unknown): UserProfileLink[] | undefined {
		if (!value) return undefined;

		let raw: unknown;
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (!trimmed) return undefined;
			try {
				raw = JSON.parse(trimmed);
			} catch {
				return undefined;
			}
		} else {
			raw = value;
		}

		if (!Array.isArray(raw)) return undefined;

		return raw
			.map((item) => ({
				label: typeof item?.label === 'string' ? item.label : '',
				url: typeof item?.url === 'string' ? item.url : ''
			}))
			.map(({ label, url }) => ({
				label: label.trim(),
				url: url.trim()
			}))
			.filter(({ url }) => url.length > 0)
			.slice(0, MAX_LINKS);
	}

	private normalizeExtras(extras?: ProfileExtras): ProfileExtras {
		if (!extras) return {};

		const normalized: ProfileExtras = {};

		if (extras.bio !== undefined) {
			const trimmed = (extras.bio || '').trim();
			normalized.bio = trimmed.length > 0 ? trimmed : '';
		}

		if (extras.links !== undefined) {
			normalized.links = extras.links
				.map(({ label, url }) => ({
					label: (label || '').trim(),
					url: (url || '').trim()
				}))
				.filter(({ url }) => url.length > 0)
				.slice(0, MAX_LINKS);
		}

		return normalized;
	}

	private normalize(value: unknown): string | null {
		if (typeof value !== 'string') return null;
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	private logMissingUsername(userId: string, doc: AvatarLikeDoc) {
		const relevantFields = {
			username: doc.username,
			userName: doc.userName,
			handle: doc.handle,
			preferredName: doc.preferredName,
			displayName: doc.displayName,
			name: doc.name
		};
		console.warn('Profile doc missing username fields', {
			userId,
			relevantFields,
			availableKeys: Object.keys(doc || {})
		});
	}

	private deriveUsername(doc: AvatarLikeDoc): string | null {
		return (
			this.normalize(doc.username) ||
			this.normalize(doc.userName) ||
			this.normalize(doc.handle) ||
			this.normalize(doc.preferredName) ||
			this.normalize(doc.displayName) ||
			this.normalize(doc.name)
		);
	}
}

export const userProfileService = new UserProfileService();
