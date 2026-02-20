import { account, client, validateAppwriteConfig } from '$lib/config/appwrite';
import type { AuthUser, Creator, UserRole } from '$lib/types';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export class AuthService {
	// Auth stores as class properties
	public user = writable<AuthUser | null>(null);
	public isAuthenticated = writable<boolean>(false);
	public isLoading = writable<boolean>(true);
	/**
	 * Initialize authentication state
	 */
	async init(): Promise<void> {
		if (!browser) return;

		// Validate Appwrite configuration first
		if (!validateAppwriteConfig()) {
			throw new Error('Appwrite configuration is invalid - check your .env file');
		}

		// Check if client is properly initialized
		if (!client) {
			throw new Error('Appwrite client not initialized');
		}

		// Check if account service is available
		if (!account) {
			throw new Error('Account service not available - check Appwrite configuration');
		}

		try {
			isLoading.set(true);

			const session = await account.get();

			if (session) {
				const authUser = this.buildAuthUser(session);
				this.user.set(authUser);
				this.isAuthenticated.set(true);
			} else {
				this.user.set(null);
				this.isAuthenticated.set(false);
			}
		} catch (error) {
			// Handle guest/unauthorized errors as normal (user not logged in)
			if (error?.code === 401 || error?.type === 'general_unauthorized_scope') {
				// No active session (user not logged in) - this is normal
			} else {
				// Log actual errors, but silently
			}

			this.user.set(null);
			this.isAuthenticated.set(false);
		} finally {
			this.isLoading.set(false);
		}
	}

	/**
	 * Register a new user with email and password
	 */
	async register(email: string, password: string, username: string): Promise<AuthUser> {
		try {
			// Create account
			console.log('Attempting to create account with email:', email, 'username:', username);
			const accountResponse = await account.create('unique()', email, password, username);
			console.log('Account created successfully:', accountResponse);

			// Automatically log in after registration
			await this.login(email, password);

			return this.buildAuthUser(accountResponse);
		} catch (error) {
			console.error('Registration error details:', error);
			throw this.handleRegistrationError(error);
		}
	}

	/**
	 * Login with email and password
	 */
	async login(email: string, password: string): Promise<AuthUser> {
		try {
			await account.createEmailPasswordSession(email, password);

			const session = await account.get();
			const authUser = this.buildAuthUser(session);
			this.user.set(authUser);
			this.isAuthenticated.set(true);

			return authUser;
		} catch (error) {
			console.error('Login error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Logout current user
	 */
	async logout(): Promise<void> {
		try {
			await account.deleteSession('current');
			this.user.set(null);
			this.isAuthenticated.set(false);
		} catch (error) {
			console.error('Logout error:', error);
			// Even if logout fails on server, clear local state
			this.user.set(null);
			this.isAuthenticated.set(false);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Send email verification
	 */
	async sendEmailVerification(): Promise<void> {
		try {
			const origin = browser ? window.location.origin : '';
			await account.createVerification(`${origin}/verify-email`);
		} catch (error) {
			console.error('Email verification error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Confirm email verification
	 */
	async confirmEmailVerification(userId: string, secret: string): Promise<void> {
		try {
			await account.updateVerification(userId, secret);
			// Refresh user data
			await this.init();
		} catch (error) {
			console.error('Email verification confirmation error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Send password reset email
	 */
	async sendPasswordReset(email: string): Promise<void> {
		try {
			const origin = browser ? window.location.origin : '';
			await account.createRecovery(email, `${origin}/reset-password`);
		} catch (error) {
			console.error('Password reset error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Confirm password reset
	 */
	async confirmPasswordReset(userId: string, secret: string, newPassword: string): Promise<void> {
		try {
			await account.updateRecovery(userId, secret, newPassword);
		} catch (error) {
			console.error('Password reset confirmation error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Update user profile
	 */
	async updateProfile(username?: string, email?: string): Promise<AuthUser> {
		try {
			let updatedUser;

			if (username) {
				updatedUser = await account.updateName(username);
			}

			if (email) {
				updatedUser = await account.updateEmail(email, 'current-password');
			}

			if (!updatedUser) {
				updatedUser = await account.get();
			}

			const authUser = this.buildAuthUser(updatedUser);
			this.user.set(authUser);
			return authUser;
		} catch (error) {
			console.error('Profile update error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Update user password
	 */
	async updatePassword(newPassword: string, oldPassword: string): Promise<void> {
		try {
			await account.updatePassword(newPassword, oldPassword);
		} catch (error) {
			console.error('Password update error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Update user preferences
	 */
	async updatePreferences(prefs: Record<string, any>): Promise<AuthUser> {
		try {
			const currentAccount = await account.get();
			const mergedPrefs = { ...(currentAccount.prefs || {}), ...prefs };

			await account.updatePrefs(mergedPrefs);
			const updatedUser = await account.get();

			const authUser = this.buildAuthUser(updatedUser);
			this.user.set(authUser);
			return authUser;
		} catch (error) {
			console.error('Preferences update error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Get current user session
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		try {
			const session = await account.get();

			if (session) {
				return this.buildAuthUser(session);
			}

			return null;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Delete user account
	 */
	async deleteAccount(): Promise<void> {
		try {
			await account.updateStatus();
			this.user.set(null);
			this.isAuthenticated.set(false);
		} catch (error) {
			console.error('Account deletion error:', error);
			throw this.handleAuthError(error);
		}
	}

	/**
	 * Upload or replace the current user's profile picture
	 */
	async updateProfilePicture(file: File): Promise<AuthUser> {
		if (!browser) {
			throw new Error('Profile picture updates are only available in the browser.');
		}

		try {
			const uploadedImage = await this.uploadProfileImage(file);
			const currentAccount = await account.get();

			const updatedPrefs = { ...(currentAccount.prefs || {}) };
			updatedPrefs.picture = uploadedImage.url;
			updatedPrefs.avatarFileId = uploadedImage.id;

			await account.updatePrefs(updatedPrefs);

			const updatedAccount = await account.get();
			const authUser = this.buildAuthUser(updatedAccount);
			this.user.set(authUser);
			this.isAuthenticated.set(true);
			return authUser;
		} catch (error) {
			console.error('Profile picture update error:', error);
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to update profile picture');
		}
	}

	/**
	 * Remove the current user's profile picture
	 */
	async removeProfilePicture(): Promise<AuthUser> {
		if (!browser) {
			throw new Error('Profile picture updates are only available in the browser.');
		}

		try {
			const currentAccount = await account.get();

			const updatedPrefs = { ...(currentAccount.prefs || {}) };
			delete updatedPrefs.picture;
			delete updatedPrefs.avatarFileId;

			await account.updatePrefs(updatedPrefs);

			const updatedAccount = await account.get();
			const authUser = this.buildAuthUser(updatedAccount);
			this.user.set(authUser);
			this.isAuthenticated.set(true);
			return authUser;
		} catch (error) {
			console.error('Profile picture removal error:', error);
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to remove profile picture');
		}
	}

	private async uploadProfileImage(file: File): Promise<{
		id: string;
		url: string;
		size?: number;
		type?: string;
		filename?: string;
		width?: number | null;
		height?: number | null;
	}> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/api/upload-image', {
			method: 'POST',
			body: formData
		});

		let result: {
			success: boolean;
			data?: {
				id: string;
				url: string;
				size?: number;
				type?: string;
				filename?: string;
				width?: number | null;
				height?: number | null;
			};
			error?: string;
		};

		try {
			result = await response.json();
		} catch (err) {
			throw new Error(
				err instanceof Error ? `Failed to parse upload response: ${err.message}` : 'Failed to upload image'
			);
		}

		if (!response.ok || !result?.success || !result.data) {
			throw new Error(result?.error || 'Failed to upload image');
		}

		return result.data;
	}

	/**
	 * Handle registration-specific errors
	 */
	private handleRegistrationError(error: any): Error {
		let message = 'Registration failed';

		console.log('Registration error code:', error?.code, 'message:', error?.message);

		if (error?.code) {
			switch (error.code) {
				case 409:
					message = 'An account with this email already exists.';
					break;
				case 400:
					if (error.message?.includes('password')) {
						message = 'Password must be at least 8 characters long.';
					} else if (error.message?.includes('email')) {
						message = 'Please enter a valid email address.';
					} else if (error.message?.includes('name')) {
						message = 'Username is required or invalid.';
					} else {
						message = 'Invalid input. Please check your information.';
					}
					break;
				case 429:
					message = 'Too many requests. Please try again later.';
					break;
				default:
					message = error.message || 'An error occurred during registration';
			}
		} else {
			message = error.message || 'Registration failed';
		}

		return new Error(message);
	}

	/**
	 * Handle authentication errors and provide user-friendly messages
	 */
	private handleAuthError(error: any): Error {
		let message = 'An authentication error occurred';

		if (error?.message) {
			switch (error.code) {
				case 401:
					message = 'Invalid credentials. Please check your email and password.';
					break;
				case 409:
					message = 'An account with this email already exists.';
					break;
				case 429:
					message = 'Too many requests. Please try again later.';
					break;
				case 400:
					if (error.message.includes('password')) {
						message = 'Password must be at least 8 characters long.';
					} else if (error.message.includes('email')) {
						message = 'Please enter a valid email address.';
					} else {
						message = 'Invalid input. Please check your information.';
					}
					break;
				default:
					message = error.message;
			}
		}

		return new Error(message);
	}

	/**
	 * Get user for events creation (compatible with existing format)
	 */
	getCurrentUserForEvents(): Creator | null {
		const user = this.getCurrentUserSync();
		if (!user || !user.$id) return null;

		return {
			userId: user.$id,
			email: user.email,
			username: user.username,
			nickname: user.username, // Use username as nickname fallback
			picture: user.picture
		};
	}

	/**
	 * Check if user is authenticated
	 */
	isUserAuthenticated(): boolean {
		let authenticated = false;
		this.isAuthenticated.subscribe((auth) => (authenticated = auth))();
		return authenticated;
	}

	/**
	 * Get current user data synchronously
	 */
	getCurrentUserSync(): AuthUser | null {
		let currentUser: AuthUser | null = null;
		this.user.subscribe((u) => (currentUser = u))();
		return currentUser;
	}

	private buildAuthUser(accountData: any): AuthUser {
		if (!accountData) {
			throw new Error('Invalid account data');
		}

		const prefs = accountData.prefs || {};
		const roles = Array.isArray(prefs.roles) ? (prefs.roles as UserRole[]) : undefined;
		const picture =
			typeof prefs.picture === 'string' && prefs.picture.trim().length > 0
				? (prefs.picture as string)
				: undefined;
		const avatarFileId =
			typeof prefs.avatarFileId === 'string' && prefs.avatarFileId.trim().length > 0
				? (prefs.avatarFileId as string)
				: undefined;

		return {
			$id: accountData.$id,
			userId: accountData.$id,
			email: accountData.email,
			username: accountData.name,
			emailVerification: accountData.emailVerification,
			phoneVerification: accountData.phoneVerification,
			prefs: accountData.prefs,
			roles,
			picture,
			avatarFileId
		};
	}
}

// Export a singleton instance
export const authService = new AuthService();

// Export stores for backwards compatibility
export const user = authService.user;
export const isAuthenticated = authService.isAuthenticated;
export const isLoading = authService.isLoading;

// Initialize auth state when the module loads in browser
if (browser) {
	authService.init();
}
