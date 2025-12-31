import { client, account } from '$lib/config/appwrite';
import { browser } from '$app/environment';

// Appwrite Auth Configuration
export const appwriteAuthConfig = {
	// Password requirements
	passwordRequirements: {
		minLength: 8,
		requireUppercase: false,
		requireLowercase: false,
		requireNumbers: false,
		requireSpecialChars: false
	},

	// Email verification settings
	emailVerification: {
		required: false,
		redirectUrl: browser ? `${window.location.origin}/verify-email` : '/verify-email'
	},

	// Password reset settings
	passwordReset: {
		redirectUrl: browser ? `${window.location.origin}/reset-password` : '/reset-password'
	}
};

// Helper function to get current origin
export const getCurrentOrigin = (): string => {
	if (browser) {
		return window.location.origin;
	}

	// Fallback for SSR
	if (import.meta.env.PROD) {
		return 'https://capacommunity.net';
	}

	return 'http://localhost:5173';
};

// Validate Appwrite configuration
export const validateAppwriteAuth = (): boolean => {
	try {
		// Check if client is properly configured
		if (!client) {
			console.error('❌ Appwrite client not configured');
			return false;
		}

		// Check if account service is available
		if (!account) {
			console.error('❌ Appwrite account service not available');
			return false;
		}

		return true;
	} catch (error) {
		console.error('❌ Appwrite auth validation failed:', error);
		return false;
	}
};

// Debug logging for development
if (browser && import.meta.env.DEV) {
	console.log('Appwrite Auth Configuration:', {
		passwordRequirements: appwriteAuthConfig.passwordRequirements,
		emailVerification: appwriteAuthConfig.emailVerification.required,
		isValid: validateAppwriteAuth()
	});
}

// Export the configured account service
export { account };
