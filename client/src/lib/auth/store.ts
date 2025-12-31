import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { authService } from '$lib/services/auth';
import type { AuthUser } from '$lib/types';

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

// Initialize Appwrite Auth
// Initialize auth when the module loads in browser
export async function initAuth() {
	if (!browser) return;

	console.log('Starting auth store initialization');

	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		// Initialize auth service
		console.log('Calling authService.init()');
		await authService.init();
		console.log('Auth service initialized successfully');

		// Subscribe to auth service stores
		authService.user.subscribe((user) => {
			console.log('User state updated:', user?.email || 'No user');
			authStore.update((state) => ({ ...state, user }));
		});

		authService.isAuthenticated.subscribe((authenticated) => {
			console.log('Auth state updated:', authenticated);
			authStore.update((state) => ({ ...state, isAuthenticated: authenticated }));
		});

		authService.isLoading.subscribe((loading) => {
			console.log('Loading state updated:', loading);
			authStore.update((state) => ({ ...state, isLoading: loading }));
		});

		console.log('Auth store initialization complete');
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
