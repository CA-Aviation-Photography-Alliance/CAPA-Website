import { Client, Account, Databases, Storage, Teams, ID } from 'appwrite';
import { browser } from '$app/environment';

// Appwrite configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
const APPWRITE_FORUM_DATABASE_ID =
	import.meta.env.VITE_APPWRITE_FORUM_DATABASE_ID || '695566410019a3850388';

// Collection IDs
export const COLLECTIONS = {
	EVENTS: import.meta.env.VITE_APPWRITE_EVENTS_COLLECTION_ID || '',
	AIRPORTS: import.meta.env.VITE_APPWRITE_AIRPORTS_COLLECTION_ID || '',
	FORUM_CATEGORIES: import.meta.env.VITE_APPWRITE_FORUM_CATEGORIES_COLLECTION_ID || '',
	FORUM_POSTS: import.meta.env.VITE_APPWRITE_FORUM_POSTS_COLLECTION_ID || '',
	FORUM_COMMENTS: import.meta.env.VITE_APPWRITE_FORUM_COMMENTS_COLLECTION_ID || '',
	MODERATION_ACTIONS: import.meta.env.VITE_APPWRITE_MODERATION_ACTIONS_COLLECTION_ID || '',
	USER_REPORTS: import.meta.env.VITE_APPWRITE_USER_REPORTS_COLLECTION_ID || ''
} as const;

// Storage bucket IDs
export const STORAGE_BUCKETS = {
	EVENT_ATTACHMENTS: import.meta.env.VITE_APPWRITE_EVENT_ATTACHMENTS_BUCKET_ID || '',
	FORUM_ATTACHMENTS: import.meta.env.VITE_APPWRITE_FORUM_ATTACHMENTS_BUCKET_ID || ''
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

// Validate collection IDs
export function validateForumConfiguration(): {
	valid: boolean;
	missing: string[];
} {
	const missing: string[] = [];

	if (!COLLECTIONS.FORUM_CATEGORIES) missing.push('VITE_APPWRITE_FORUM_CATEGORIES_COLLECTION_ID');
	if (!COLLECTIONS.FORUM_POSTS) missing.push('VITE_APPWRITE_FORUM_POSTS_COLLECTION_ID');
	if (!COLLECTIONS.FORUM_COMMENTS) missing.push('VITE_APPWRITE_FORUM_COMMENTS_COLLECTION_ID');
	if (!COLLECTIONS.MODERATION_ACTIONS)
		missing.push('VITE_APPWRITE_MODERATION_ACTIONS_COLLECTION_ID');
	if (!COLLECTIONS.USER_REPORTS) missing.push('VITE_APPWRITE_USER_REPORTS_COLLECTION_ID');

	return {
		valid: missing.length === 0,
		missing
	};
}

// Database helper functions
export const getDatabase = () => APPWRITE_DATABASE_ID;
export const getForumDatabase = () => APPWRITE_FORUM_DATABASE_ID;

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
