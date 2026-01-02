import { account, client, validateAppwriteConfig } from '$lib/config/appwrite';
import type { AuthUser, Creator } from '$lib/types';
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
				const authUser: AuthUser = {
					$id: session.$id,
					email: session.email,
					username: session.name,
					emailVerification: session.emailVerification,
					phoneVerification: session.phoneVerification,
					prefs: session.prefs
				};

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

			return {
				$id: accountResponse.$id,
				email: accountResponse.email,
				username: accountResponse.name,
				emailVerification: accountResponse.emailVerification,
				phoneVerification: accountResponse.phoneVerification
			};
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
			const authUser: AuthUser = {
				$id: session.$id,
				email: session.email,
				username: session.name,
				emailVerification: session.emailVerification,
				phoneVerification: session.phoneVerification,
				prefs: session.prefs
			};

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

			const authUser: AuthUser = {
				$id: updatedUser.$id,
				email: updatedUser.email,
				username: updatedUser.name,
				emailVerification: updatedUser.emailVerification,
				phoneVerification: updatedUser.phoneVerification,
				prefs: updatedUser.prefs
			};

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
			await account.updatePrefs(prefs);
			const updatedUser = await account.get();

			const authUser: AuthUser = {
				$id: updatedUser.$id,
				email: updatedUser.email,
				username: updatedUser.name,
				emailVerification: updatedUser.emailVerification,
				phoneVerification: updatedUser.phoneVerification,
				prefs: updatedUser.prefs
			};

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
				return {
					$id: session.$id,
					email: session.email,
					username: session.name,
					emailVerification: session.emailVerification,
					phoneVerification: session.phoneVerification,
					prefs: session.prefs
				};
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
		let currentUser: AuthUser | null = null;
		this.user.subscribe((u) => (currentUser = u))();

		if (!currentUser) return null;

		return {
			userId: currentUser.$id!,
			email: currentUser.email,
			username: currentUser.username,
			nickname: currentUser.username, // Use username as nickname fallback
			picture: '' // Appwrite doesn't have profile pictures by default
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
