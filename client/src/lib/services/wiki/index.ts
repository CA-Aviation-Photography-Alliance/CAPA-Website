import type {
	WikiPage,
	WikiCategory,
	WikiPageVersion,
	WikiTemplate,
	WikiStats,
	CreateWikiPageData,
	UpdateWikiPageData,
	WikiFilters,
	WikiSearchResult,
	PaginatedResponse,
	ApiResponse
} from '$lib/types';

// Import all service implementations
import { wikiService as appwriteWikiService } from './wikiService';
import { githubWikiService } from './githubWikiService';
import { appwriteStorageWikiService } from './appwriteStorageWikiService';

/**
 * Wiki Service Interface
 *
 * This interface defines the contract that all wiki service implementations must follow.
 * It ensures consistency between different backend implementations (Appwrite, GitHub, etc.).
 */
export interface IWikiService {
	// Page CRUD operations
	createPage(data: CreateWikiPageData): Promise<ApiResponse<WikiPage>>;
	getPage(pageId: string): Promise<ApiResponse<WikiPage>>;
	getPageBySlug(slug: string): Promise<ApiResponse<WikiPage>>;
	updatePage(pageId: string, data: UpdateWikiPageData): Promise<ApiResponse<WikiPage>>;
	deletePage(pageId: string): Promise<ApiResponse<void>>;

	// Page listing and search
	listPages(filters?: WikiFilters): Promise<PaginatedResponse<WikiPage>>;
	searchPages(query: string): Promise<ApiResponse<WikiSearchResult[]>>;

	// Version control
	getPageVersions(pageId: string): Promise<ApiResponse<WikiPageVersion[]>>;

	// Categories
	getCategories(): Promise<ApiResponse<WikiCategory[]>>;

	// Statistics
	getStats(): Promise<ApiResponse<WikiStats>>;
}

/**
 * Wiki Service Configuration
 */
export type WikiBackend = 'appwrite' | 'github' | 'appwrite-storage';

/**
 * Wiki Service Factory
 *
 * Creates and returns the appropriate wiki service implementation based on configuration.
 * This allows for easy switching between different storage backends.
 */
class WikiServiceFactory {
	private static instance: IWikiService | null = null;
	private static currentBackend: WikiBackend | null = null;

	/**
	 * Get the configured wiki service instance
	 */
	static getService(backend?: WikiBackend): IWikiService {
		const selectedBackend = backend || this.getConfiguredBackend();

		// Return cached instance if backend hasn't changed
		if (this.instance && this.currentBackend === selectedBackend) {
			return this.instance;
		}

		// Create new service instance
		switch (selectedBackend) {
			case 'github':
				this.instance = githubWikiService;
				break;
			case 'appwrite-storage':
				this.instance = appwriteStorageWikiService;
				break;
			case 'appwrite':
			default:
				this.instance = appwriteWikiService;
				break;
		}

		this.currentBackend = selectedBackend;
		console.log(`📚 Wiki service initialized with ${selectedBackend} backend`);

		return this.instance;
	}

	/**
	 * Get the configured backend from environment variables
	 */
	private static getConfiguredBackend(): WikiBackend {
		const configuredBackend = import.meta.env.VITE_WIKI_BACKEND as WikiBackend;

		// Auto-detect backend based on available configuration
		if (!configuredBackend) {
			const hasGitHubConfig =
				import.meta.env.VITE_GITHUB_OWNER &&
				import.meta.env.VITE_GITHUB_REPO &&
				import.meta.env.VITE_GITHUB_TOKEN;

			const hasAppwriteStorageConfig =
				import.meta.env.VITE_APPWRITE_ENDPOINT &&
				import.meta.env.VITE_APPWRITE_PROJECT_ID &&
				import.meta.env.VITE_APPWRITE_WIKI_BUCKET_ID;

			if (hasGitHubConfig) return 'github';
			if (hasAppwriteStorageConfig) return 'appwrite-storage';
			return 'appwrite';
		}

		return configuredBackend;
	}

	/**
	 * Switch to a different backend (useful for testing or configuration changes)
	 */
	static switchBackend(backend: WikiBackend): IWikiService {
		this.instance = null; // Clear cached instance
		return this.getService(backend);
	}

	/**
	 * Get information about available backends and their configuration status
	 */
	static getBackendInfo() {
		const appwriteConfigured = !!(
			import.meta.env.VITE_APPWRITE_ENDPOINT && import.meta.env.VITE_APPWRITE_PROJECT_ID
		);

		const githubConfigured = !!(
			import.meta.env.VITE_GITHUB_OWNER &&
			import.meta.env.VITE_GITHUB_REPO &&
			import.meta.env.VITE_GITHUB_TOKEN
		);

		const appwriteStorageConfigured = !!(
			import.meta.env.VITE_APPWRITE_ENDPOINT &&
			import.meta.env.VITE_APPWRITE_PROJECT_ID &&
			import.meta.env.VITE_APPWRITE_WIKI_BUCKET_ID
		);

		return {
			current: this.getConfiguredBackend(),
			available: {
				appwrite: {
					configured: appwriteConfigured,
					description: 'Appwrite database backend with real-time features'
				},
				'appwrite-storage': {
					configured: appwriteStorageConfigured,
					description: 'Appwrite Storage backend with markdown files'
				},
				github: {
					configured: githubConfigured,
					description: 'GitHub repository storage with Git version control'
				}
			}
		};
	}
}

/**
 * Main wiki service export
 *
 * This is the primary export that should be used throughout the application.
 * It automatically selects the appropriate backend based on configuration.
 */
export const wikiService: IWikiService = WikiServiceFactory.getService();

/**
 * Backend-specific exports (for advanced usage)
 */
export { appwriteWikiService, appwriteStorageWikiService, githubWikiService, WikiServiceFactory };

/**
 * Utility function to check if a specific backend is available
 */
export function isBackendAvailable(backend: WikiBackend): boolean {
	const info = WikiServiceFactory.getBackendInfo();
	return info.available[backend].configured;
}

/**
 * Utility function to get the current backend type
 */
export function getCurrentBackend(): WikiBackend {
	return WikiServiceFactory.getBackendInfo().current;
}

/**
 * Development helper to log current configuration
 */
if (import.meta.env.DEV) {
	const backendInfo = WikiServiceFactory.getBackendInfo();
	console.log('🔧 Wiki Service Configuration:', {
		current: backendInfo.current,
		appwrite: backendInfo.available.appwrite.configured ? '✅ Configured' : '❌ Missing config',
		'appwrite-storage': backendInfo.available['appwrite-storage'].configured
			? '✅ Configured'
			: '❌ Missing config',
		github: backendInfo.available.github.configured ? '✅ Configured' : '❌ Missing config'
	});
}
