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
import { authStore } from '$lib/auth/store';
import { get } from 'svelte/store';
import { Permission, Role, Query } from 'appwrite';
import { databases, storage, teams, generateId } from '$lib/config/appwrite';

interface WikiFileMetadata {
	title: string;
	slug: string;
	categoryId?: string;
	tags: string[];
	isPublished: boolean;
	isLocked: boolean;
	authorId: string;
	authorName: string;
	lastEditedBy: string;
	lastEditedByName: string;
	version: number;
	excerpt: string;
	fileId: string;
	fileSize?: number;
}

class AppwriteStorageWikiService {
	private databases: Databases;
	private storage: Storage;
	private databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'capa-main';
	private bucketId = import.meta.env.VITE_APPWRITE_WIKI_BUCKET_ID || 'wiki-files';
	private indexCollectionId = 'wiki-index'; // Collection for metadata and search
	private categoriesCollectionId = 'wiki-categories';
	private versionsCollectionId = 'wiki-versions';

	constructor() {
		this.databases = databases;
		this.storage = storage;
	}

	// Helper method to get current user
	private getCurrentUser() {
		const auth = get(authStore);
		return auth.user;
	}

	// Helper method to check if user is admin
	private async isAdmin(user: any): Promise<boolean> {
		if (!user?.$id) return false;

		try {
			// Check if user is member of admin team
			const memberships = await teams.listMemberships('69556a3e002e55a99bec');
			const isAdminMember = memberships.memberships.some(
				(membership) => membership.userId === user.$id
			);

			console.log('Admin check via team:', {
				userId: user.$id,
				email: user?.email,
				isAdminMember: isAdminMember,
				adminTeamId: '69556a3e002e55a99bec'
			});

			return isAdminMember;
		} catch (error) {
			console.error('Error checking admin team membership:', error);
			// Fallback: allow if user exists but team check fails (for development)
			return false;
		}
	}

	// Helper method to create slug from title
	private createSlug(title: string): string {
		if (!title || title.trim() === '') {
			throw new Error('Title cannot be empty');
		}

		const slug = title
			.toLowerCase()
			.replace(/[^a-z0-9 -]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

		if (!slug || slug === '') {
			throw new Error('Title must contain at least one alphanumeric character');
		}

		return slug;
	}

	// Create frontmatter for markdown files
	private createMarkdownWithFrontmatter(metadata: WikiFileMetadata, content: string): string {
		const frontmatter = `---
title: "${metadata.title}"
slug: "${metadata.slug}"
categoryId: ${metadata.categoryId || 'null'}
tags: ${JSON.stringify(metadata.tags)}
isPublished: ${metadata.isPublished}
isLocked: ${metadata.isLocked}
authorId: "${metadata.authorId}"
authorName: "${metadata.authorName}"
lastEditedBy: "${metadata.lastEditedBy}"
lastEditedByName: "${metadata.lastEditedByName}"
version: ${metadata.version}
excerpt: "${metadata.excerpt.replace(/"/g, '\\"')}"
---

${content}`;
		return frontmatter;
	}

	// Parse frontmatter from markdown
	private parseMarkdownWithFrontmatter(fileContent: string): {
		metadata: Partial<WikiFileMetadata>;
		content: string;
	} {
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
		const match = fileContent.match(frontmatterRegex);

		if (!match) {
			throw new Error('Invalid markdown file format');
		}

		const frontmatter = match[1];
		const content = match[2];

		// Parse YAML-like frontmatter manually
		const metadata: Partial<WikiFileMetadata> = {};
		const lines = frontmatter.split('\n');

		for (const line of lines) {
			const [key, ...valueParts] = line.split(':');
			if (key && valueParts.length > 0) {
				const value = valueParts.join(':').trim();
				const cleanKey = key.trim();

				if (cleanKey === 'tags') {
					metadata.tags = JSON.parse(value);
				} else if (cleanKey === 'isPublished' || cleanKey === 'isLocked') {
					metadata[cleanKey] = value === 'true';
				} else if (cleanKey === 'version') {
					metadata.version = parseInt(value);
				} else if (value.startsWith('"') && value.endsWith('"')) {
					metadata[cleanKey as keyof WikiFileMetadata] = value.slice(1, -1) as any;
				} else if (value !== 'null') {
					metadata[cleanKey as keyof WikiFileMetadata] = value as any;
				}
			}
		}

		return {
			metadata,
			content: content.trim()
		};
	}

	// Convert metadata + content to WikiPage
	private formatPage(indexDoc: any, content?: string): WikiPage {
		return {
			$id: indexDoc.$id,
			$createdAt: indexDoc.$createdAt,
			$updatedAt: indexDoc.$updatedAt,
			title: indexDoc.title,
			slug: indexDoc.slug,
			content: content || '',
			excerpt: indexDoc.excerpt,
			categoryId: indexDoc.categoryId || null,
			authorId: indexDoc.authorId,
			authorName: indexDoc.authorName,
			lastEditedBy: indexDoc.lastEditedBy,
			lastEditedByName: indexDoc.lastEditedByName,
			version: indexDoc.version,
			isPublished: indexDoc.isPublished,
			isLocked: indexDoc.isLocked,
			tags: indexDoc.tags ? indexDoc.tags.split(',').filter((tag: string) => tag.trim()) : [],
			attachments: [],
			metadata: {
				fileId: indexDoc.fileId,
				fileSize: indexDoc.fileSize || undefined
			}
		};
	}

	// File operations
	private async uploadMarkdownFile(
		fileName: string,
		content: string
	): Promise<{ fileId: string; fileSize?: number }> {
		const blob = new Blob([content], { type: 'text/markdown' });
		const file = new File([blob], fileName, { type: 'text/markdown' });

		const user = this.getCurrentUser();
		const permissions = [Permission.read(Role.any())];

		// Admins can create/delete, all users can update
		if (user && (await this.isAdmin(user))) {
			permissions.push(
				Permission.write(Role.user(user.$id!)),
				Permission.update(Role.users()),
				Permission.delete(Role.user(user.$id!))
			);
		} else if (user) {
			permissions.push(Permission.update(Role.users()));
		}

		const response = await this.storage.createFile(this.bucketId, generateId(), file, permissions);

		return {
			fileId: response.$id
		};
	}

	private async updateMarkdownFile(
		fileId: string,
		fileName: string,
		content: string
	): Promise<{ fileId: string; fileSize?: number }> {
		// Delete old file (gracefully ignore not-found errors)
		try {
			await this.storage.deleteFile(this.bucketId, fileId);
		} catch (err: any) {
			const msg = typeof err?.message === 'string' ? err.message : String(err);
			if (!/requested file could not be found/i.test(msg)) {
				throw err;
			}
		}

		// Upload new file
		return await this.uploadMarkdownFile(fileName, content);
	}

	private async downloadMarkdownFile(fileId: string): Promise<string> {
		const fileUrl = this.storage.getFileDownload(this.bucketId, fileId);
		const response = await fetch(fileUrl);

		if (!response.ok) {
			throw new Error(`Failed to download file: ${response.status}`);
		}

		return await response.text();
	}

	private async deleteMarkdownFile(fileId: string): Promise<void> {
		await this.storage.deleteFile(this.bucketId, fileId);
	}

	// Index operations
	private async createIndexEntry(metadata: WikiFileMetadata): Promise<any> {
		const user = this.getCurrentUser();
		const permissions = [Permission.read(Role.any())];

		// Admins can create/delete, all users can update
		if (user && (await this.isAdmin(user))) {
			permissions.push(
				Permission.write(Role.user(metadata.authorId)),
				Permission.update(Role.users()),
				Permission.delete(Role.user(metadata.authorId))
			);
		} else {
			permissions.push(Permission.update(Role.users()));
		}

		const indexData: any = {
			title: metadata.title,
			slug: metadata.slug,
			excerpt: metadata.excerpt,
			categoryId: metadata.categoryId || null,
			authorId: metadata.authorId,
			authorName: metadata.authorName,
			lastEditedBy: metadata.lastEditedBy,
			lastEditedByName: metadata.lastEditedByName,
			version: metadata.version,
			isPublished: metadata.isPublished,
			isLocked: metadata.isLocked,
			tags: metadata.tags.join(','),
			fileId: metadata.fileId
		};

		// Skip fileSize to avoid schema mismatch - it may not exist in all collections
		// if (metadata.fileSize !== undefined && metadata.fileSize !== null) {
		// 	indexData.fileSize = metadata.fileSize;
		// }

		return await this.databases.createDocument(
			this.databaseId,
			this.indexCollectionId,
			generateId(),
			indexData,
			permissions
		);
	}

	private async updateIndexEntry(
		indexId: string,
		metadata: Partial<WikiFileMetadata>
	): Promise<any> {
		const updateData: any = {};

		if (metadata.title) updateData.title = metadata.title;
		if (metadata.excerpt) updateData.excerpt = metadata.excerpt;
		if (metadata.categoryId !== undefined) updateData.categoryId = metadata.categoryId;
		if (metadata.lastEditedBy) updateData.lastEditedBy = metadata.lastEditedBy;
		if (metadata.lastEditedByName) updateData.lastEditedByName = metadata.lastEditedByName;
		if (metadata.version) updateData.version = metadata.version;
		if (metadata.isPublished !== undefined) updateData.isPublished = metadata.isPublished;
		if (metadata.isLocked !== undefined) updateData.isLocked = metadata.isLocked;
		if (metadata.tags) updateData.tags = metadata.tags.join(',');
		if (metadata.fileId) updateData.fileId = metadata.fileId;
		if (metadata.fileSize !== undefined) updateData.fileSize = metadata.fileSize;

		return await this.databases.updateDocument(
			this.databaseId,
			this.indexCollectionId,
			indexId,
			updateData
		);
	}

	private async getIndexEntryBySlug(slug: string): Promise<any | null> {
		try {
			const result = await this.databases.listDocuments(this.databaseId, this.indexCollectionId, [
				Query.equal('slug', slug)
			]);

			return result.documents.length > 0 ? result.documents[0] : null;
		} catch (error) {
			return null;
		}
	}

	private async deleteIndexEntry(indexId: string): Promise<void> {
		await this.databases.deleteDocument(this.databaseId, this.indexCollectionId, indexId);
	}

	// Version control
	private async createVersion(
		versionData: Omit<WikiPageVersion, '$id' | '$createdAt'>
	): Promise<void> {
		await this.databases.createDocument(
			this.databaseId,
			this.versionsCollectionId,
			generateId(),
			versionData
		);
	}

	// Wiki Pages CRUD
	async createPage(data: CreateWikiPageData): Promise<ApiResponse<WikiPage>> {
		try {
			// Validate input data
			if (!data.title || data.title.trim() === '') {
				throw new Error('Title is required');
			}
			if (!data.content || data.content.trim() === '') {
				throw new Error('Content is required');
			}

			const user = this.getCurrentUser();
			if (!user) {
				throw new Error('User must be authenticated to create pages');
			}

			if (!user.$id) {
				throw new Error('User ID is missing from session');
			}

			console.log('Wiki page creation - User check:', {
				userId: user.$id,
				email: user.email,
				teamCheckInProgress: true
			});

			if (!(await this.isAdmin(user))) {
				throw new Error(
					`Only administrators can create wiki pages. You need to be added to the admin team. Contact an existing admin to add you to the team.`
				);
			}

			const slug = this.createSlug(data.title);

			if (!slug || slug.trim() === '') {
				throw new Error('Invalid title - cannot generate URL slug');
			}

			// Check if slug already exists
			const existingPage = await this.getIndexEntryBySlug(slug);
			if (existingPage) {
				throw new Error('A page with this title already exists');
			}

			const metadata: Omit<WikiFileMetadata, 'fileId' | 'fileSize'> = {
				title: data.title.trim(),
				slug: slug,
				categoryId: data.categoryId || null,
				tags: data.tags || [],
				isPublished: data.isPublished || false,
				isLocked: false,
				authorId: user.$id,
				authorName: user.username || user.name || 'Unknown',
				lastEditedBy: user.$id,
				lastEditedByName: user.username || user.name || 'Unknown',
				version: 1,
				excerpt: data.content.substring(0, 200)
			};

			console.log('Creating page with metadata:', {
				title: metadata.title,
				slug: metadata.slug,
				authorId: metadata.authorId,
				isPublished: metadata.isPublished
			});

			// Create placeholder metadata for markdown generation
			const tempMetadata = { ...metadata, fileId: '' } as WikiFileMetadata;
			const markdownContent = this.createMarkdownWithFrontmatter(tempMetadata, data.content);

			// Upload markdown file
			const fileInfo = await this.uploadMarkdownFile(`${slug}.md`, markdownContent);

			// Update metadata with file info (excluding fileSize to avoid schema issues)
			const finalMetadata = {
				...metadata,
				fileId: fileInfo.fileId
			};

			// Create index entry
			const indexDoc = await this.createIndexEntry(finalMetadata);

			// Create initial version
			await this.createVersion({
				pageId: indexDoc.$id,
				version: 1,
				title: data.title,
				content: data.content,
				authorId: user.$id!,
				authorName: user.username || user.name || 'Unknown',
				changeDescription: 'Initial version'
			});

			const page = this.formatPage(indexDoc, data.content);
			return {
				success: true,
				data: page
			};
		} catch (error) {
			console.error('Error creating wiki page:', error);

			let errorMessage = 'Failed to create page';
			if (error instanceof Error) {
				errorMessage = error.message;

				// Provide helpful error messages for common issues
				if (error.message.includes('Missing required attribute')) {
					errorMessage = `Document validation failed: ${error.message}. Please check that all required fields are provided.`;
				} else if (error.message.includes('Invalid document structure')) {
					errorMessage = `Invalid page structure: ${error.message}. Please try again or contact support.`;
				} else if (error.message.includes('duplicate')) {
					errorMessage = 'A page with this title already exists. Please choose a different title.';
				}
			}

			return {
				success: false,
				error: errorMessage
			};
		}
	}

	async getPage(pageId: string): Promise<ApiResponse<WikiPage>> {
		try {
			const indexDoc = await this.databases.getDocument(
				this.databaseId,
				this.indexCollectionId,
				pageId
			);

			// Download markdown content
			const markdownContent = await this.downloadMarkdownFile(indexDoc.fileId);
			const { content } = this.parseMarkdownWithFrontmatter(markdownContent);

			return {
				success: true,
				data: this.formatPage(indexDoc, content)
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
			const indexDoc = await this.getIndexEntryBySlug(slug);
			if (!indexDoc) {
				return {
					success: false,
					error: 'Page not found'
				};
			}

			// Download markdown content
			const markdownContent = await this.downloadMarkdownFile(indexDoc.fileId);
			const { content } = this.parseMarkdownWithFrontmatter(markdownContent);

			return {
				success: true,
				data: this.formatPage(indexDoc, content)
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

			const indexDoc = await this.databases.getDocument(
				this.databaseId,
				this.indexCollectionId,
				pageId
			);

			// Download current content
			const currentMarkdown = await this.downloadMarkdownFile(indexDoc.fileId);
			const { content: currentContent } = this.parseMarkdownWithFrontmatter(currentMarkdown);

			// Create updated metadata
			const updatedMetadata: Partial<WikiFileMetadata> = {
				lastEditedBy: user.$id!,
				lastEditedByName: user.username || user.name || 'Unknown',
				version: indexDoc.version + 1
			};

			if (data.title) {
				updatedMetadata.title = data.title;
				// Note: Changing slug would require moving the file - for now, we keep the same slug
			}
			if (data.content) {
				updatedMetadata.excerpt = data.content.substring(0, 200);
			}
			if (data.categoryId !== undefined) updatedMetadata.categoryId = data.categoryId;
			if (data.tags) updatedMetadata.tags = data.tags;
			if (data.isPublished !== undefined) updatedMetadata.isPublished = data.isPublished;
			if (data.isLocked !== undefined) updatedMetadata.isLocked = data.isLocked;

			// Merge with existing metadata
			const fullMetadata: WikiFileMetadata = {
				title: updatedMetadata.title || indexDoc.title,
				slug: indexDoc.slug,
				categoryId:
					updatedMetadata.categoryId !== undefined
						? updatedMetadata.categoryId
						: indexDoc.categoryId,
				tags: updatedMetadata.tags || (indexDoc.tags ? indexDoc.tags.split(',') : []),
				isPublished:
					updatedMetadata.isPublished !== undefined
						? updatedMetadata.isPublished
						: indexDoc.isPublished,
				isLocked:
					updatedMetadata.isLocked !== undefined ? updatedMetadata.isLocked : indexDoc.isLocked,
				authorId: indexDoc.authorId,
				authorName: indexDoc.authorName,
				lastEditedBy: updatedMetadata.lastEditedBy!,
				lastEditedByName: updatedMetadata.lastEditedByName!,
				version: updatedMetadata.version!,
				excerpt: updatedMetadata.excerpt || indexDoc.excerpt,
				fileId: indexDoc.fileId
			};

			const newContent = data.content || currentContent;
			const markdownContent = this.createMarkdownWithFrontmatter(fullMetadata, newContent);

			// Update file
			const fileInfo = await this.updateMarkdownFile(
				indexDoc.fileId,
				`${indexDoc.slug}.md`,
				markdownContent
			);

			// Update metadata with new file info
			fullMetadata.fileId = fileInfo.fileId;

			// Update index entry
			const updatedIndexDoc = await this.updateIndexEntry(pageId, fullMetadata);

			// Create version history
			if (data.content || data.title) {
				await this.createVersion({
					pageId,
					version: fullMetadata.version,
					title: fullMetadata.title,
					content: newContent,
					authorId: user.$id!,
					authorName: user.username || user.name || 'Unknown',
					changeDescription: data.changeDescription || 'Updated page'
				});
			}

			const page = this.formatPage(updatedIndexDoc, newContent);
			return {
				success: true,
				data: page
			};
		} catch (error) {
			console.error('Error updating wiki page:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update page'
			};
		}
	}

	async deletePage(pageId: string): Promise<ApiResponse<void>> {
		try {
			const user = this.getCurrentUser();
			if (!user) {
				throw new Error('User must be authenticated to delete pages');
			}

			console.log('Wiki page deletion - User check:', {
				userId: user.$id,
				email: user.email,
				teamCheckInProgress: true
			});

			if (!(await this.isAdmin(user))) {
				throw new Error(
					`Only administrators can delete wiki pages. You need to be added to the admin team. Contact an existing admin to add you to the team.`
				);
			}

			const indexDoc = await this.databases.getDocument(
				this.databaseId,
				this.indexCollectionId,
				pageId
			);

			// Delete markdown file
			await this.deleteMarkdownFile(indexDoc.fileId);

			// Delete index entry
			await this.deleteIndexEntry(pageId);

			// Delete related versions
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

			// Add sorting with fallback for missing attributes
			const sortBy = filters.sortBy || '$createdAt'; // Default to createdAt which should always exist
			const sortOrder = filters.sortOrder || 'desc';

			// Map common sort options to actual schema attributes
			const sortAttributeMap: Record<string, string> = {
				updated: '$createdAt', // Fallback since updatedAt might not exist
				created: '$createdAt',
				title: 'title',
				$updatedAt: '$createdAt', // Fallback
				updatedAt: '$createdAt', // Fallback
				$createdAt: '$createdAt'
			};

			const actualSortBy = sortAttributeMap[sortBy] || '$createdAt';
			queries.push(
				sortOrder === 'desc' ? Query.orderDesc(actualSortBy) : Query.orderAsc(actualSortBy)
			);

			// Add pagination
			const limit = Math.min(filters.limit || 20, 100);
			const offset = ((filters.page || 1) - 1) * limit;
			queries.push(Query.limit(limit), Query.offset(offset));

			const result = await this.databases.listDocuments(
				this.databaseId,
				this.indexCollectionId,
				queries
			);

			// Convert to WikiPage format (without content for performance)
			const pages = result.documents.map((doc) => this.formatPage(doc));
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

			// Handle specific attribute errors
			if (error?.message?.includes('Attribute not found in schema')) {
				console.warn('Schema attribute error detected. Available attributes may have changed.');

				// Try a simple query without sorting as fallback
				try {
					const fallbackResult = await this.databases.listDocuments(
						this.databaseId,
						this.indexCollectionId,
						[Query.equal('isPublished', true), Query.limit(20)]
					);

					return {
						success: true,
						data: fallbackResult.documents.map((doc) => this.formatPage(doc)),
						pagination: {
							currentPage: 1,
							totalPages: Math.ceil(fallbackResult.total / 20),
							totalEvents: fallbackResult.total,
							hasNext: fallbackResult.total > 20,
							hasPrev: false
						}
					};
				} catch (fallbackError) {
					console.error('Fallback query also failed:', fallbackError);
				}
			}

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
			const pages = await this.databases.listDocuments(this.databaseId, this.indexCollectionId, [
				Query.search('title', query),
				Query.equal('isPublished', true),
				Query.limit(50)
			]);

			const results: WikiSearchResult[] = pages.documents.map((doc) => ({
				page: this.formatPage(doc),
				relevanceScore: 1,
				matchedContent: this.extractMatchedContent(doc.excerpt, query)
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
				this.databases.listDocuments(this.databaseId, this.indexCollectionId, [
					Query.equal('isPublished', true)
				]),
				this.databases.listDocuments(this.databaseId, this.categoriesCollectionId, [
					Query.equal('isActive', true)
				])
			]);

			const recentPages = await this.databases.listDocuments(
				this.databaseId,
				this.indexCollectionId,
				[Query.equal('isPublished', true), Query.orderDesc('$createdAt'), Query.limit(5)]
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

export const appwriteStorageWikiService = new AppwriteStorageWikiService();
