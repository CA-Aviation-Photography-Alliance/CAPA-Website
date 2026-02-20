import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { authService } from '$lib/services/auth';
import type { AuthUser, UserProfileLink } from '$lib/types';
import { userProfileService } from '$lib/services/userProfileService';

// Auth state interface
interface AuthState {
	isLoading: boolean;
	isAuthenticated: boolean;
	user: AuthUser | null;
	error: string | null;
}

// Initial state
const initialState: AuthState = {
	isLoading: true,
	isAuthenticated: false,
	user: null,
	error: null
};

// Create the main auth store
export const authStore = writable<AuthState>(initialState);

// Derived stores for convenience
export const isLoading = derived(authStore, ($authStore) => $authStore.isLoading);
export const isAuthenticated = derived(authStore, ($authStore) => $authStore.isAuthenticated);
export const currentUser = derived(authStore, ($authStore) => $authStore.user);
export const authError = derived(authStore, ($authStore) => $authStore.error);

async function syncUserProfileDocument(user: AuthUser | null, extras?: { bio?: string; links?: UserProfileLink[] }) {
	if (!user) return;
	try {
		await userProfileService.syncProfile(user, extras);
	} catch (error) {
		console.warn('Failed to sync user profile document', error);
	}
}

// Initialize Appwrite Auth
// Initialize auth when the module loads in browser
export async function initAuth() {
	if (!browser) return;

	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		// Initialize auth service

		await authService.init();

		// Subscribe to auth service stores
		authService.user.subscribe((user) => {
			authStore.update((state) => ({ ...state, user }));
		});

		authService.isAuthenticated.subscribe((authenticated) => {
			authStore.update((state) => ({ ...state, isAuthenticated: authenticated }));
		});

		authService.isLoading.subscribe((loading) => {
			authStore.update((state) => ({ ...state, isLoading: loading }));
		});
	} catch (error) {
		// Handle guest/unauthorized errors as normal (user not logged in)
		if (error?.code === 401 || error?.type === 'general_unauthorized_scope') {
			console.log('Auth store initialized - user not logged in');
			authStore.update((state) => ({
				...state,
				isLoading: false,
				isAuthenticated: false,
				user: null,
				error: null
			}));
		} else {
			console.error('❌ Auth store initialization failed:', {
				message: error?.message,
				code: error?.code,
				type: error?.type,
				stack: error?.stack,
				fullError: error
			});

			authStore.update((state) => ({
				...state,
				isLoading: false,
				error: 'Failed to initialize authentication'
			}));
		}
	}
}

// Login with email and password
export async function login(email: string, password: string) {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		const user = await authService.login(email, password);

		authStore.update((state) => ({
			...state,
			isLoading: false,
			isAuthenticated: true,
			user,
			error: null
		}));

		await syncUserProfileDocument(user);

		return user;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Login failed';
		authStore.update((state) => ({
			...state,
			isLoading: false,
			error: errorMessage
		}));
		throw error;
	}
}

// Register new user
export async function register(email: string, password: string, username: string) {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		const user = await authService.register(email, password, username);

		authStore.update((state) => ({
			...state,
			isLoading: false,
			isAuthenticated: true,
			user,
			error: null
		}));

		await syncUserProfileDocument(user);

		return user;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Registration failed';
		authStore.update((state) => ({
			...state,
			isLoading: false,
			error: errorMessage
		}));
		throw error;
	}
}

// Logout
export async function logout() {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		await authService.logout();

		authStore.update((state) => ({
			...state,
			isLoading: false,
			isAuthenticated: false,
			user: null,
			error: null
		}));
	} catch (error) {
		console.error('Logout error:', error);
		// Even if logout fails on server, clear local state
		authStore.update((state) => ({
			...state,
			isLoading: false,
			isAuthenticated: false,
			user: null,
			error: null
		}));
	}
}

// Send email verification
export async function sendEmailVerification() {
	try {
		await authService.sendEmailVerification();
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to send verification email';
		authStore.update((state) => ({
			...state,
			error: errorMessage
		}));
		throw error;
	}
}

// Confirm email verification
export async function confirmEmailVerification(userId: string, secret: string) {
	try {
		await authService.confirmEmailVerification(userId, secret);

		// Refresh user data after verification
		await refreshUser();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
		authStore.update((state) => ({
			...state,
			error: errorMessage
		}));
		throw error;
	}
}

// Send password reset
export async function sendPasswordReset(email: string) {
	try {
		await authService.sendPasswordReset(email);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to send password reset email';
		authStore.update((state) => ({
			...state,
			error: errorMessage
		}));
		throw error;
	}
}

// Confirm password reset
export async function confirmPasswordReset(userId: string, secret: string, newPassword: string) {
	try {
		await authService.confirmPasswordReset(userId, secret, newPassword);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
		authStore.update((state) => ({
			...state,
			error: errorMessage
		}));
		throw error;
	}
}

// Update user profile
export async function updateProfile(username?: string, email?: string) {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		const user = await authService.updateProfile(username, email);

		authStore.update((state) => ({
			...state,
			isLoading: false,
			user,
			error: null
		}));

		await syncUserProfileDocument(user);

		return user;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
		authStore.update((state) => ({
			...state,
			isLoading: false,
			error: errorMessage
		}));
		throw error;
	}
}

export async function updateProfilePicture(file: File) {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		const user = await authService.updateProfilePicture(file);

		authStore.update((state) => ({
			...state,
			isLoading: false,
			user,
			isAuthenticated: true
		}));

		const userId = user?.userId || user?.$id || null;
		userProfileService.setAvatar(userId, user?.picture || null);

		await syncUserProfileDocument(user);

		return user;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Profile picture update failed';
		authStore.update((state) => ({
			...state,
			isLoading: false,
			error: errorMessage
		}));
		throw error;
	}
}

export async function removeProfilePicture() {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		const user = await authService.removeProfilePicture();

		authStore.update((state) => ({
			...state,
			isLoading: false,
			user,
			isAuthenticated: true
		}));

		const userId = user?.userId || user?.$id || null;
		userProfileService.setAvatar(userId, user?.picture || null);

		await syncUserProfileDocument(user);

		return user;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to remove profile picture';
		authStore.update((state) => ({
			...state,
			isLoading: false,
			error: errorMessage
		}));
		throw error;
	}
}

// Update password
export async function updatePassword(newPassword: string, oldPassword: string) {
	try {
		await authService.updatePassword(newPassword, oldPassword);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Password update failed';
		authStore.update((state) => ({
			...state,
			error: errorMessage
		}));
		throw error;
	}
}

// Refresh user data
export async function refreshUser() {
	try {
		const user = await authService.getCurrentUser();

		authStore.update((state) => ({
			...state,
			user,
			isAuthenticated: !!user
		}));

		return user;
	} catch (error) {
		console.error('Error refreshing user data:', error);
		throw error;
	}
}

// Clear error
export function clearError() {
	authStore.update((state) => ({ ...state, error: null }));
}

export async function updateProfileExtras(details: { bio?: string; links?: UserProfileLink[] }) {
	const state = get(authStore);
	if (!state.user) {
		throw new Error('You must be logged in to update your profile.');
	}

	await syncUserProfileDocument(state.user, details);
}

// Get user for events (helper function)
export function getCurrentUserForEvents() {
	return authService.getCurrentUserForEvents();
}

// Check if user is authenticated (synchronous)
export function checkAuthentication() {
	return authService.isUserAuthenticated();
}

// Initialize auth when the module loads in browser
if (browser) {
	initAuth();
}
