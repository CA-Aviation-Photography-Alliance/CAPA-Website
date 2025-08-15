import { browser } from '$app/environment';

// Get the API URL from environment variables
const getApiUrl = (): string => {
	// In production, use the production server
	if (import.meta.env.PROD) {
		return 'https://server.capacommunity.net';
	}

	// In development, check for custom VITE_API_URL first, then fallback to localhost
	return import.meta.env.VITE_API_URL || 'http://localhost:3003';
};

export const API_CONFIG = {
	baseUrl: getApiUrl(),
	endpoints: {
		events: '/api/simple-events',
		authEvents: '/api/auth-events',
		airports: '/api/airports',
		health: '/health'
	}
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
	return `${API_CONFIG.baseUrl}${endpoint}`;
};

// Helper function for making API requests with consistent error handling
export const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
	const url = buildApiUrl(endpoint);

	const defaultOptions: RequestInit = {
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		...options
	};

	try {
		const response = await fetch(url, defaultOptions);
		return response;
	} catch (error) {
		console.error(`API request failed for ${url}:`, error);
		throw error;
	}
};

// Log current configuration for debugging
if (browser) {
	console.log('🔧 API Configuration:', {
		environment: import.meta.env.MODE,
		baseUrl: API_CONFIG.baseUrl,
		isProduction: import.meta.env.PROD
	});
}
