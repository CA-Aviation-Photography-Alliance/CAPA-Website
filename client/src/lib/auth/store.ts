import { writable } from 'svelte/store';
import { createAuth0Client, type Auth0Client, type User } from '@auth0/auth0-spa-js';
import { auth0Config } from './config';

// Auth state interface
interface AuthState {
	isLoading: boolean;
	isAuthenticated: boolean;
	user: User | null;
	error: string | null;
}

// Initial state
const initialState: AuthState = {
	isLoading: true,
	isAuthenticated: false,
	user: null,
	error: null
};

// Create the auth store
export const authStore = writable<AuthState>(initialState);

// Auth0 client instance
let auth0Client: Auth0Client | null = null;

// Initialize Auth0
export async function initAuth0() {
	try {
		authStore.update((state) => ({ ...state, isLoading: true, error: null }));

		auth0Client = await createAuth0Client(auth0Config);

		// Check if user is authenticated
		const isAuthenticated = await auth0Client.isAuthenticated();

		let user: User | null = null;
		if (isAuthenticated) {
			user = (await auth0Client.getUser()) || null;
		}

		// Handle redirect callback
		if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
			try {
				await auth0Client.handleRedirectCallback();
				window.history.replaceState({}, document.title, window.location.pathname);

				// Re-check authentication after callback
				const isAuthenticatedAfterCallback = await auth0Client.isAuthenticated();
				if (isAuthenticatedAfterCallback) {
					user = (await auth0Client.getUser()) || null;
				}

				authStore.set({
					isLoading: false,
					isAuthenticated: isAuthenticatedAfterCallback,
					user,
					error: null
				});
			} catch (error) {
				console.error('Error handling redirect callback:', error);
				authStore.set({
					isLoading: false,
					isAuthenticated: false,
					user: null,
					error: 'Failed to handle authentication callback'
				});
			}
		} else {
			authStore.set({
				isLoading: false,
				isAuthenticated,
				user,
				error: null
			});
		}
	} catch (error) {
		console.error('Error initializing Auth0:', error);
		authStore.set({
			isLoading: false,
			isAuthenticated: false,
			user: null,
			error: 'Failed to initialize authentication'
		});
	}
}

// Login function
export async function login(redirectTo?: string) {
	if (!auth0Client) {
		throw new Error('Auth0 client not initialized');
	}

	try {
		await auth0Client.loginWithRedirect({
			authorizationParams: {
				...auth0Config.authorizationParams,
				redirect_uri: redirectTo || (typeof window !== 'undefined' ? window.location.origin : '')
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		authStore.update((state) => ({
			...state,
			error: 'Failed to initiate login'
		}));
	}
}

// Logout function
export async function logout() {
	if (!auth0Client) {
		throw new Error('Auth0 client not initialized');
	}

	try {
		await auth0Client.logout({
			logoutParams: {
				returnTo: window.location.origin
			}
		});

		authStore.set({
			isLoading: false,
			isAuthenticated: false,
			user: null,
			error: null
		});
	} catch (error) {
		console.error('Logout error:', error);
		authStore.update((state) => ({
			...state,
			error: 'Failed to logout'
		}));
	}
}

// Get access token
export async function getAccessToken(): Promise<string | null> {
	if (!auth0Client) {
		throw new Error('Auth0 client not initialized');
	}

	try {
		return await auth0Client.getTokenSilently();
	} catch (error) {
		console.error('Error getting access token:', error);

		// Check if it's a refresh token error
		if (error instanceof Error && error.message.includes('refresh token')) {
			console.warn('Refresh token expired, attempting to re-authenticate...');

			try {
				// Try to get a fresh token with cache disabled
				return await auth0Client.getTokenSilently({
					cacheMode: 'off',
					ignoreCache: true
				});
			} catch (retryError) {
				console.error('Token retry failed, redirecting to login...');

				// Update auth store to show user is no longer authenticated
				authStore.set({
					isLoading: false,
					isAuthenticated: false,
					user: null,
					error: 'Session expired. Please log in again.'
				});

				// Redirect to login after a short delay
				setTimeout(() => {
					login();
				}, 1000);

				return null;
			}
		}

		return null;
	}
}

// Refresh user data from Auth0
export async function refreshUser(): Promise<void> {
	if (!auth0Client) {
		throw new Error('Auth0 client not initialized');
	}

	try {
		const isAuthenticated = await auth0Client.isAuthenticated();

		if (isAuthenticated) {
			// Force Auth0 to re-authenticate silently to get fresh user data
			try {
				// Get a fresh token which forces user data refresh
				await auth0Client.getTokenSilently({
					cacheMode: 'off',
					ignoreCache: true
				});

				// Add a small delay to allow Auth0 internal state to update
				await new Promise((resolve) => setTimeout(resolve, 500));

				// Get fresh user data
				const user = (await auth0Client.getUser()) || null;
				authStore.update((state) => ({
					...state,
					user
				}));
			} catch (error) {
				// If refresh fails, force a complete re-initialization
				console.warn('Token refresh failed, forcing re-initialization:', error);
				await initAuth0();
			}
		}
	} catch (error) {
		console.error('Error refreshing user data:', error);
		throw error;
	}
}

// Clear error
export function clearError() {
	authStore.update((state) => ({ ...state, error: null }));
}
