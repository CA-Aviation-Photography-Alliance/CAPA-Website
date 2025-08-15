import { env } from '$env/dynamic/public';

// Get environment variables with fallbacks
const PUBLIC_AUTH0_DOMAIN = env.PUBLIC_AUTH0_DOMAIN || '';
const PUBLIC_AUTH0_CLIENT_ID = env.PUBLIC_AUTH0_CLIENT_ID || '';

// Get environment-specific redirect URI
const getRedirectUri = (): string => {
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}

	// Fallback for SSR - use production URL in production, localhost in development
	if (import.meta.env.PROD) {
		return 'https://capacommunity.net';
	}

	return 'http://localhost:5173';
};

export const auth0Config = {
	domain: PUBLIC_AUTH0_DOMAIN,
	clientId: PUBLIC_AUTH0_CLIENT_ID,
	authorizationParams: {
		redirect_uri: getRedirectUri(),
		audience: `https://${PUBLIC_AUTH0_DOMAIN}/api/v2/`,
		scope: 'openid profile email'
	},
	cacheLocation: 'localstorage' as const,
	useRefreshTokens: true
};

// Debug logging to help troubleshoot callback URL issues
// if (typeof window !== 'undefined') {
// 	console.log('=== Auth0 Debug Info ===');
// 	console.log('Domain:', PUBLIC_AUTH0_DOMAIN);
// 	console.log('Client ID:', PUBLIC_AUTH0_CLIENT_ID);
// 	console.log('Redirect URI being used:', window.location.origin);
// 	console.log('Current URL:', window.location.href);
// 	console.log('Window location parts:');
// 	console.log('  - protocol:', window.location.protocol);
// 	console.log('  - hostname:', window.location.hostname);
// 	console.log('  - port:', window.location.port);
// 	console.log('  - origin:', window.location.origin);
// 	console.log('=== Copy this exact URL to Auth0 Allowed Callback URLs ===');
// 	console.log(window.location.origin);
// 	console.log('====================================================');
// }
