import { Client, Account, Databases, Storage, Teams, ID } from 'appwrite';
import { browser } from '$app/environment';

// Appwrite configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';

// Collection IDs
export const COLLECTIONS = {
	EVENTS: import.meta.env.VITE_APPWRITE_EVENTS_COLLECTION_ID || '',
	AIRPORTS: import.meta.env.VITE_APPWRITE_AIRPORTS_COLLECTION_ID || ''
} as const;

// Storage bucket IDs
export const STORAGE_BUCKETS = {
	EVENT_ATTACHMENTS: import.meta.env.VITE_APPWRITE_EVENT_ATTACHMENTS_BUCKET_ID || ''
} as const;

// Initialize Appwrite client
export const client = new Client();

if (browser && APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID) {
	client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
}

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

// Database helper functions
export const getDatabase = () => APPWRITE_DATABASE_ID;

// Configuration validation
export const validateAppwriteConfig = (): boolean => {
	const required = [
		APPWRITE_ENDPOINT,
		APPWRITE_PROJECT_ID,
		APPWRITE_DATABASE_ID,
		COLLECTIONS.EVENTS
	];

	const missing = required.filter((config) => !config);

	if (missing.length > 0) {
		console.error(
			'❌ Missing Appwrite configuration. Please set the following environment variables:'
		);
		if (!APPWRITE_ENDPOINT) console.error('   - VITE_APPWRITE_ENDPOINT');
		if (!APPWRITE_PROJECT_ID) console.error('   - VITE_APPWRITE_PROJECT_ID');
		if (!APPWRITE_DATABASE_ID) console.error('   - VITE_APPWRITE_DATABASE_ID');
		if (!COLLECTIONS.EVENTS) console.error('   - VITE_APPWRITE_EVENTS_COLLECTION_ID');
		return false;
	}

	return true;
};

// Log configuration in development
if (browser && import.meta.env.DEV) {
	console.log('Appwrite Configuration:', {
		endpoint: APPWRITE_ENDPOINT || '❌ NOT SET',
		projectId: APPWRITE_PROJECT_ID || '❌ NOT SET',
		databaseId: APPWRITE_DATABASE_ID || '❌ NOT SET',
		collections: COLLECTIONS,
		isValid: validateAppwriteConfig()
	});

	// Check if client is properly configured
	if (!APPWRITE_PROJECT_ID) {
		console.error('❌ VITE_APPWRITE_PROJECT_ID is not set in .env file');
	}
	if (!APPWRITE_DATABASE_ID) {
		console.error('❌ VITE_APPWRITE_DATABASE_ID is not set in .env file');
	}
	if (!COLLECTIONS.EVENTS) {
		console.error('❌ VITE_APPWRITE_EVENTS_COLLECTION_ID is not set in .env file');
	}

	// Test if client can make requests
	if (APPWRITE_PROJECT_ID && APPWRITE_ENDPOINT) {
		console.log('Appwrite client configured, testing connection...');
		account
			.get()
			.then(() => console.log('Appwrite connection successful'))
			.catch((err) =>
				console.log('No active session (this is normal if not logged in):', err.message)
			);
	}
}

// Export utility function to generate document IDs
export const generateId = () => ID.unique();

// Export query helpers
export const Query = {
	equal: (attribute: string, value: string | number | boolean) =>
		`equal("${attribute}", ${typeof value === 'string' ? `"${value}"` : value})`,
	notEqual: (attribute: string, value: string | number | boolean) =>
		`notEqual("${attribute}", ${typeof value === 'string' ? `"${value}"` : value})`,
	lessThan: (attribute: string, value: string | number) =>
		`lessThan("${attribute}", ${typeof value === 'string' ? `"${value}"` : value})`,
	lessThanEqual: (attribute: string, value: string | number) =>
		`lessThanEqual("${attribute}", ${typeof value === 'string' ? `"${value}"` : value})`,
	greaterThan: (attribute: string, value: string | number) =>
		`greaterThan("${attribute}", ${typeof value === 'string' ? `"${value}"` : value})`,
	greaterThanEqual: (attribute: string, value: string | number) =>
		`greaterThanEqual("${attribute}", ${typeof value === 'string' ? `"${value}"` : value})`,
	search: (attribute: string, value: string) => `search("${attribute}", "${value}")`,
	orderAsc: (attribute: string) => `orderAsc("${attribute}")`,
	orderDesc: (attribute: string) => `orderDesc("${attribute}")`,
	limit: (value: number) => `limit(${value})`,
	offset: (value: number) => `offset(${value})`
};
