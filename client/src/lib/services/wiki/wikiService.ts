import { Query, Permission, Role, ID } from 'appwrite';
import type { Databases } from 'appwrite';
import { databases as appwriteDatabases, getDatabase } from '$lib/config/appwrite';
import type {
	WikiPage,
	WikiCategory,
	WikiPageVersion,
	WikiComment,
	WikiTemplate,
	WikiStats,
	CreateWikiPageData,
	UpdateWikiPageData,
	WikiFilters,
	WikiSearchResult,
	PaginatedResponse,
	ApiResponse
} from '$lib/types';
import { authStore } from '$lib/auth/store';
import { get } from 'svelte/store';

class WikiService {
	private databases: Databases;
	private databaseId = (import.meta.env.VITE_APPWRITE_WIKI_DATABASE_ID ||
		getDatabase() ||
		'capa-main') as string;
	private pagesCollectionId =
		import.meta.env.VITE_APPWRITE_WIKI_PAGES_COLLECTION_ID || 'wiki-pages';
	private categoriesCollectionId =
		import.meta.env.VITE_APPWRITE_WIKI_CATEGORIES_COLLECTION_ID || 'wiki-categories';
	private versionsCollectionId =
		import.meta.env.VITE_APPWRITE_WIKI_VERSIONS_COLLECTION_ID || 'wiki-versions';
	private templatesCollectionId =
		import.meta.env.VITE_APPWRITE_WIKI_TEMPLATES_COLLECTION_ID || 'wiki-templates';

	constructor() {
		this.databases = appwriteDatabases;
	}

	// Helper method to get current user
	private getCurrentUser() {
		const auth = get(authStore);
		return auth.user;
	}

	// Helper method to create slug from title
	private createSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9 -]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim('-');
	}

	// Wiki Pages CRUD
	async createPage(data: CreateWikiPageData): Promise<ApiResponse<WikiPage>> {
		try {
			const user = this.getCurrentUser();
			if (!user) {
				throw new Error('User must be authenticated to create pages');
			}

			const slug = this.createSlug(data.title);

			// Check if slug already exists
			const existingPages = await this.databases.listDocuments(
				this.databaseId,
				this.pagesCollectionId,
				[Query.equal('slug', slug)]
			);

			if (existingPages.documents.length > 0) {
				throw new Error('A page with this title already exists');
			}

			const pageData = {
				title: data.title,
				slug,
				content: data.content,
				excerpt: data.content.substring(0, 200),
				categoryId: data.categoryId || null,
				authorId: user.$id!,
				authorName: user.username,
				lastEditedBy: user.$id!,
				lastEditedByName: user.username,
				version: 1,
				isPublished: data.isPublished ?? true,
				isLocked: false,
				tags: data.tags?.join(',') || '',
				thumbnailUrl: data.thumbnailUrl || null,
				metadata: JSON.stringify(data.metadata || {})
			};

			const page = await this.databases.createDocument(
				this.databaseId,
				this.pagesCollectionId,
				ID.unique(),
				pageData,
				[
					Permission.read(Role.any()),
					Permission.write(Role.user(user.$id!)),
					Permission.update(Role.user(user.$id!)),
					Permission.delete(Role.user(user.$id!))
				]
			);

			// Create initial version
			await this.createVersion({
				pageId: page.$id,
				version: 1,
				title: data.title,
				content: data.content,
				authorId: user.$id!,
				authorName: user.username,
				changeDescription: 'Initial version'
			});

			return {
				success: true,
				data: this.formatPage(page as any)
			};
		} catch (error) {
			console.error('Error creating wiki page:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to create page'
			};
		}
	}

	async getPage(pageId: string): Promise<ApiResponse<WikiPage>> {
		try {
			const page = await this.databases.getDocument(
				this.databaseId,
				this.pagesCollectionId,
				pageId
			);

			return {
				success: true,
				data: this.formatPage(page as any)
			};
		} catch (error) {
			console.error('Error fetching wiki page:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Page not found'
			};
		}
	}

	async getPageBySlug(slug: string): Promise<ApiResponse<WikiPage>> {
		try {
			const pages = await this.databases.listDocuments(this.databaseId, this.pagesCollectionId, [
				Query.equal('slug', slug)
			]);

			if (pages.documents.length === 0) {
				return {
					success: false,
					error: 'Page not found'
				};
			}

			const page = pages.documents[0];

			return {
				success: true,
				data: this.formatPage(page as any)
			};
		} catch (error) {
			console.error('Error fetching wiki page by slug:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Page not found'
			};
		}
	}

	async updatePage(pageId: string, data: UpdateWikiPageData): Promise<ApiResponse<WikiPage>> {
		try {
			const user = this.getCurrentUser();
			if (!user) {
				throw new Error('User must be authenticated to update pages');
			}

			const currentPage = await this.databases.getDocument(
				this.databaseId,
				this.pagesCollectionId,
				pageId
			);

			const updateData: any = {
				lastEditedBy: user.$id!,
				lastEditedByName: user.username,
				version: (currentPage.version || 1) + 1
			};

			if (data.title) {
				updateData.title = data.title;
				updateData.slug = this.createSlug(data.title);
			}
			if (data.content) {
				updateData.content = data.content;
				updateData.excerpt = data.content.substring(0, 200);
			}
			if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
			if (data.tags) updateData.tags = data.tags.join(',');
			if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
			if (data.isLocked !== undefined) updateData.isLocked = data.isLocked;
			if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
			if (data.metadata) updateData.metadata = JSON.stringify(data.metadata);

			const page = await this.databases.updateDocument(
				this.databaseId,
				this.pagesCollectionId,
				pageId,
				updateData
			);

			// Create version history
			if (data.content || data.title) {
				try {
					await this.createVersion({
						pageId,
						version: updateData.version,
						title: data.title || currentPage.title,
						content: data.content || currentPage.content,
						authorId: user.$id!,
						authorName: user.username,
						changeDescription: data.changeDescription || 'Updated page'
					});
				} catch (err) {
					console.error('Failed to create wiki page version:', err);
					// Do not fail the page update if version creation fails
				}
			}

			return {
				success: true,
				data: this.formatPage(page as any)
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('Error updating wiki page:', {
				pageId,
				updateData: {
					hasTitle: !!data.title,
					hasContent: !!data.content,
					hasCategoryId: data.categoryId !== undefined,
					tagsCount: data.tags ? data.tags.length : 0,
					isPublished: data.isPublished,
					isLocked: data.isLocked
				},
				error: message
			});
			return {
				success: false,
				error: message || 'Failed to update page'
			};
		}
	}

	async deletePage(pageId: string): Promise<ApiResponse<void>> {
		try {
			await this.databases.deleteDocument(this.databaseId, this.pagesCollectionId, pageId);

			// Also delete related versions
			await this.deletePageVersions(pageId);

			return { success: true };
		} catch (error) {
			console.error('Error deleting wiki page:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete page'
			};
		}
	}

	async listPages(filters: WikiFilters = {}): Promise<PaginatedResponse<WikiPage>> {
		try {
			const queries = [];

			if (filters.categoryId) {
				queries.push(Query.equal('categoryId', filters.categoryId));
			}
			if (filters.authorId) {
				queries.push(Query.equal('authorId', filters.authorId));
			}
			if (filters.isPublished !== undefined) {
				queries.push(Query.equal('isPublished', filters.isPublished));
			}
			if (filters.search) {
				queries.push(Query.search('title', filters.search));
			}

			// Add sorting (map to Appwrite system attributes when needed)
			const sortBy = filters.sortBy || 'updatedAt';
			const sortOrder = filters.sortOrder || 'desc';
			const sortAttr =
				(sortBy === 'updatedAt' && '$updatedAt') ||
				(sortBy === 'createdAt' && '$createdAt') ||
				sortBy;
			queries.push(sortOrder === 'desc' ? Query.orderDesc(sortAttr) : Query.orderAsc(sortAttr));

			// Add pagination
			const limit = Math.min(filters.limit || 20, 100);
			const offset = ((filters.page || 1) - 1) * limit;
			queries.push(Query.limit(limit), Query.offset(offset));

			const result = await this.databases.listDocuments(
				this.databaseId,
				this.pagesCollectionId,
				queries
			);

			const pages = result.documents.map((doc) => this.formatPage(doc as any));
			const totalPages = Math.ceil(result.total / limit);
			const currentPage = filters.page || 1;

			return {
				success: true,
				data: pages,
				pagination: {
					currentPage,
					totalPages,
					totalEvents: result.total,
					hasNext: currentPage < totalPages,
					hasPrev: currentPage > 1
				}
			};
		} catch (error) {
			console.error('Error listing wiki pages:', error);
			return {
				success: false,
				data: [],
				pagination: {
					currentPage: 1,
					totalPages: 0,
					totalEvents: 0,
					hasNext: false,
					hasPrev: false
				}
			};
		}
	}

	async searchPages(query: string): Promise<ApiResponse<WikiSearchResult[]>> {
		try {
			const pages = await this.databases.listDocuments(this.databaseId, this.pagesCollectionId, [
				Query.search('title', query),
				Query.equal('isPublished', true),
				Query.limit(50)
			]);

			const results: WikiSearchResult[] = pages.documents.map((doc) => ({
				page: this.formatPage(doc as any),
				relevanceScore: 1,
				matchedContent: this.extractMatchedContent(doc.content, query)
			}));

			return {
				success: true,
				data: results
			};
		} catch (error) {
			console.error('Error searching wiki pages:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Search failed'
			};
		}
	}

	// Page Versions
	private async createVersion(
		versionData: Omit<WikiPageVersion, '$id' | '$createdAt'>
	): Promise<void> {
		await this.databases.createDocument(
			this.databaseId,
			this.versionsCollectionId,
			ID.unique(),
			versionData
		);
	}

	async getPageVersions(pageId: string): Promise<ApiResponse<WikiPageVersion[]>> {
		try {
			const versions = await this.databases.listDocuments(
				this.databaseId,
				this.versionsCollectionId,
				[Query.equal('pageId', pageId), Query.orderDesc('version'), Query.limit(50)]
			);

			return {
				success: true,
				data: versions.documents as WikiPageVersion[]
			};
		} catch (error) {
			console.error('Error fetching page versions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch versions'
			};
		}
	}

	private async deletePageVersions(pageId: string): Promise<void> {
		const versions = await this.databases.listDocuments(
			this.databaseId,
			this.versionsCollectionId,
			[Query.equal('pageId', pageId)]
		);

		for (const version of versions.documents) {
			await this.databases.deleteDocument(this.databaseId, this.versionsCollectionId, version.$id);
		}
	}

	// Categories
	async getCategories(): Promise<ApiResponse<WikiCategory[]>> {
		try {
			const categories = await this.databases.listDocuments(
				this.databaseId,
				this.categoriesCollectionId,
				[Query.equal('isActive', true), Query.orderAsc('order')]
			);

			return {
				success: true,
				data: categories.documents as WikiCategory[]
			};
		} catch (error) {
			console.error('Error fetching wiki categories:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch categories'
			};
		}
	}

	// Utility methods
	private formatPage(doc: any): WikiPage {
		return {
			...doc,
			tags: doc.tags ? doc.tags.split(',').filter((tag: string) => tag.trim()) : [],
			attachments: doc.attachments ? JSON.parse(doc.attachments) : [],
			thumbnailUrl: doc.thumbnailUrl || undefined,
			metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
		};
	}

	private extractMatchedContent(content: string, query: string): string {
		const index = content.toLowerCase().indexOf(query.toLowerCase());
		if (index === -1) return '';

		const start = Math.max(0, index - 50);
		const end = Math.min(content.length, index + query.length + 50);
		return '...' + content.substring(start, end) + '...';
	}

	async getStats(): Promise<ApiResponse<WikiStats>> {
		try {
			const [pagesResult, categoriesResult] = await Promise.all([
				this.databases.listDocuments(this.databaseId, this.pagesCollectionId, [
					Query.equal('isPublished', true)
				]),
				this.databases.listDocuments(this.databaseId, this.categoriesCollectionId, [
					Query.equal('isActive', true)
				])
			]);

			const recentPages = await this.databases.listDocuments(
				this.databaseId,
				this.pagesCollectionId,
				[Query.equal('isPublished', true), Query.orderDesc('$updatedAt'), Query.limit(5)]
			);

			const stats: WikiStats = {
				totalPages: pagesResult.total,
				totalCategories: categoriesResult.total,
				recentPages: recentPages.documents.map((doc) => this.formatPage(doc)),
				topContributors: [] // Would need additional query to get contributors
			};

			return {
				success: true,
				data: stats
			};
		} catch (error) {
			console.error('Error fetching wiki stats:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch stats'
			};
		}
	}
}

export const wikiService = new WikiService();
