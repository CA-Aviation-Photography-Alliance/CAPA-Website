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

interface GitHubFile {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: string;
	content: string;
	encoding: string;
}

interface GitHubCommit {
	sha: string;
	commit: {
		author: {
			name: string;
			email: string;
			date: string;
		};
		message: string;
	};
	author: {
		login: string;
		avatar_url: string;
	};
}

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
	createdAt: string;
	updatedAt: string;
	excerpt: string;
}

class GitHubWikiService {
	private owner: string;
	private repo: string;
	private token: string;
	private baseUrl: string;
	private wikiPath: string = 'wiki';
	private categoriesFile: string = 'wiki/_categories.json';
	private indexFile: string = 'wiki/_index.json';

	constructor() {
		// These should be set via environment variables
		this.owner = import.meta.env.VITE_GITHUB_OWNER || '';
		this.repo = import.meta.env.VITE_GITHUB_REPO || '';
		this.token = import.meta.env.VITE_GITHUB_TOKEN || '';
		this.baseUrl = 'https://api.github.com';

		if (!this.owner || !this.repo || !this.token) {
			console.warn('GitHub configuration missing. Please set VITE_GITHUB_OWNER, VITE_GITHUB_REPO, and VITE_GITHUB_TOKEN');
		}
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

	// GitHub API helpers
	private async githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
		const url = `${this.baseUrl}${endpoint}`;
		const response = await fetch(url, {
			...options,
			headers: {
				'Authorization': `token ${this.token}`,
				'Accept': 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || `GitHub API error: ${response.status}`);
		}

		return response.json();
	}

	private async getFile(path: string): Promise<GitHubFile | null> {
		try {
			return await this.githubRequest(`/repos/${this.owner}/${this.repo}/contents/${path}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	private async createOrUpdateFile(
		path: string,
		content: string,
		message: string,
		sha?: string
	): Promise<void> {
		const body: any = {
			message,
			content: btoa(unescape(encodeURIComponent(content)))
		};

		if (sha) {
			body.sha = sha;
		}

		await this.githubRequest(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		});
	}

	private async deleteFile(path: string, sha: string, message: string): Promise<void> {
		await this.githubRequest(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: 'DELETE',
			body: JSON.stringify({
				message,
				sha
			})
		});
	}

	private decodeContent(encodedContent: string): string {
		return decodeURIComponent(escape(atob(encodedContent.replace(/\s/g, ''))));
	}

	// Index management
	private async getIndex(): Promise<Record<string, WikiFileMetadata>> {
		try {
			const file = await this.getFile(this.indexFile);
			if (!file) return {};
			const content = this.decodeContent(file.content);
			return JSON.parse(content);
		} catch (error) {
			console.warn('Could not load wiki index:', error);
			return {};
		}
	}

	private async updateIndex(index: Record<string, WikiFileMetadata>): Promise<void> {
		const content = JSON.stringify(index, null, 2);
		const existingFile = await this.getFile(this.indexFile);
		await this.createOrUpdateFile(
			this.indexFile,
			content,
			'Update wiki index',
			existingFile?.sha
		);
	}

	// Convert metadata + content to WikiPage
	private formatPage(slug: string, metadata: WikiFileMetadata, content: string): WikiPage {
		return {
			$id: slug,
			$createdAt: metadata.createdAt,
			$updatedAt: metadata.updatedAt,
			title: metadata.title,
			slug: metadata.slug,
			content: content,
			excerpt: metadata.excerpt,
			categoryId: metadata.categoryId || null,
			authorId: metadata.authorId,
			authorName: metadata.authorName,
			lastEditedBy: metadata.lastEditedBy,
			lastEditedByName: metadata.lastEditedByName,
			version: metadata.version,
			isPublished: metadata.isPublished,
			isLocked: metadata.isLocked,
			tags: metadata.tags,
			attachments: [], // GitHub doesn't store attachments in this implementation
			metadata: {}
		};
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
createdAt: "${metadata.createdAt}"
updatedAt: "${metadata.updatedAt}"
excerpt: "${metadata.excerpt.replace(/"/g, '\\"')}"
---

${content}`;
		return frontmatter;
	}

	// Parse frontmatter from markdown
	private parseMarkdownWithFrontmatter(fileContent: string): { metadata: WikiFileMetadata; content: string } {
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
		const match = fileContent.match(frontmatterRegex);

		if (!match) {
			throw new Error('Invalid markdown file format');
		}

		const frontmatter = match[1];
		const content = match[2];

		// Parse YAML-like frontmatter manually (simple implementation)
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
			metadata: metadata as WikiFileMetadata,
			content: content.trim()
		};
	}

	// Wiki Pages CRUD
	async createPage(data: CreateWikiPageData): Promise<ApiResponse<WikiPage>> {
		try {
			const user = this.getCurrentUser();
			if (!user) {
				throw new Error('User must be authenticated to create pages');
			}

			const slug = this.createSlug(data.title);
			const filePath = `${this.wikiPath}/${slug}.md`;

			// Check if file already exists
			const existingFile = await this.getFile(filePath);
			if (existingFile) {
				throw new Error('A page with this title already exists');
			}

			const now = new Date().toISOString();
			const metadata: WikiFileMetadata = {
				title: data.title,
				slug,
				categoryId: data.categoryId || undefined,
				tags: data.tags || [],
				isPublished: data.isPublished ?? true,
				isLocked: false,
				authorId: user.$id!,
				authorName: user.username || user.name || 'Unknown',
				lastEditedBy: user.$id!,
				lastEditedByName: user.username || user.name || 'Unknown',
				version: 1,
				createdAt: now,
				updatedAt: now,
				excerpt: data.content.substring(0, 200)
			};

			const markdownContent = this.createMarkdownWithFrontmatter(metadata, data.content);

			// Create the file
			await this.createOrUpdateFile(
				filePath,
				markdownContent,
				`Create wiki page: ${data.title}`
			);

			// Update index
			const index = await this.getIndex();
			index[slug] = metadata;
			await this.updateIndex(index);

			const page = this.formatPage(slug, metadata, data.content);
			return {
				success: true,
				data: page
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
		return this.getPageBySlug(pageId);
	}

	async getPageBySlug(slug: string): Promise<ApiResponse<WikiPage>> {
		try {
			const filePath = `${this.wikiPath}/${slug}.md`;
			const file = await this.getFile(filePath);

			if (!file) {
				return {
					success: false,
					error: 'Page not found'
				};
			}

			const fileContent = this.decodeContent(file.content);
			const { metadata, content } = this.parseMarkdownWithFrontmatter(fileContent);
			const page = this.formatPage(slug, metadata, content);

			return {
				success: true,
				data: page
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

			const slug = pageId;
			const filePath = `${this.wikiPath}/${slug}.md`;
			const existingFile = await this.getFile(filePath);

			if (!existingFile) {
				throw new Error('Page not found');
			}

			const fileContent = this.decodeContent(existingFile.content);
			const { metadata: currentMetadata, content: currentContent } = this.parseMarkdownWithFrontmatter(fileContent);

			// Create updated metadata
			const updatedMetadata: WikiFileMetadata = {
				...currentMetadata,
				lastEditedBy: user.$id!,
				lastEditedByName: user.username || user.name || 'Unknown',
				version: currentMetadata.version + 1,
				updatedAt: new Date().toISOString()
			};

			if (data.title) {
				const newSlug = this.createSlug(data.title);
				if (newSlug !== slug) {
					// Handle slug change - would need to move file and update index
					throw new Error('Changing page titles that affect slugs is not yet supported');
				}
				updatedMetadata.title = data.title;
			}
			if (data.content) {
				updatedMetadata.excerpt = data.content.substring(0, 200);
			}
			if (data.categoryId !== undefined) updatedMetadata.categoryId = data.categoryId;
			if (data.tags) updatedMetadata.tags = data.tags;
			if (data.isPublished !== undefined) updatedMetadata.isPublished = data.isPublished;
			if (data.isLocked !== undefined) updatedMetadata.isLocked = data.isLocked;

			const newContent = data.content || currentContent;
			const markdownContent = this.createMarkdownWithFrontmatter(updatedMetadata, newContent);

			// Update the file
			await this.createOrUpdateFile(
				filePath,
				markdownContent,
				`Update wiki page: ${updatedMetadata.title}${data.changeDescription ? ` - ${data.changeDescription}` : ''}`,
				existingFile.sha
			);

			// Update index
			const index = await this.getIndex();
			index[slug] = updatedMetadata;
			await this.updateIndex(index);

			const page = this.formatPage(slug, updatedMetadata, newContent);
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
			const slug = pageId;
			const filePath = `${this.wikiPath}/${slug}.md`;
			const existingFile = await this.getFile(filePath);

			if (!existingFile) {
				throw new Error('Page not found');
			}

			// Delete the file
			await this.deleteFile(filePath, existingFile.sha, `Delete wiki page: ${slug}`);

			// Update index
			const index = await this.getIndex();
			delete index[slug];
			await this.updateIndex(index);

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
			const index = await this.getIndex();
			let pages = Object.entries(index);

			// Apply filters
			if (filters.categoryId) {
				pages = pages.filter(([_, metadata]) => metadata.categoryId === filters.categoryId);
			}
			if (filters.authorId) {
				pages = pages.filter(([_, metadata]) => metadata.authorId === filters.authorId);
			}
			if (filters.isPublished !== undefined) {
				pages = pages.filter(([_, metadata]) => metadata.isPublished === filters.isPublished);
			}
			if (filters.search) {
				const searchLower = filters.search.toLowerCase();
				pages = pages.filter(([_, metadata]) =>
					metadata.title.toLowerCase().includes(searchLower) ||
					metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
				);
			}

			// Apply sorting
			const sortBy = filters.sortBy || 'updatedAt';
			const sortOrder = filters.sortOrder || 'desc';
			pages.sort(([_, a], [__, b]) => {
				const aValue = a[sortBy as keyof WikiFileMetadata];
				const bValue = b[sortBy as keyof WikiFileMetadata];

				if (sortOrder === 'desc') {
					return aValue > bValue ? -1 : 1;
				} else {
					return aValue < bValue ? -1 : 1;
				}
			});

			// Apply pagination
			const limit = Math.min(filters.limit || 20, 100);
			const page = filters.page || 1;
			const offset = (page - 1) * limit;
			const paginatedPages = pages.slice(offset, offset + limit);

			// Load content for paginated results
			const wikiPages: WikiPage[] = [];
			for (const [slug, metadata] of paginatedPages) {
				try {
					const result = await this.getPageBySlug(slug);
					if (result.success && result.data) {
						wikiPages.push(result.data);
					}
				} catch (error) {
					console.warn(`Failed to load page ${slug}:`, error);
				}
			}

			const totalPages = Math.ceil(pages.length / limit);

			return {
				success: true,
				data: wikiPages,
				pagination: {
					currentPage: page,
					totalPages,
					totalEvents: pages.length,
					hasNext: page < totalPages,
					hasPrev: page > 1
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
			const index = await this.getIndex();
			const results: WikiSearchResult[] = [];
			const queryLower = query.toLowerCase();

			for (const [slug, metadata] of Object.entries(index)) {
				if (!metadata.isPublished) continue;

				let relevanceScore = 0;
				let matchedContent = '';

				// Check title match
				if (metadata.title.toLowerCase().includes(queryLower)) {
					relevanceScore += 10;
					matchedContent = metadata.title;
				}

				// Check tags match
				const matchedTags = metadata.tags.filter(tag => tag.toLowerCase().includes(queryLower));
				if (matchedTags.length > 0) {
					relevanceScore += 5 * matchedTags.length;
					if (!matchedContent) matchedContent = matchedTags.join(', ');
				}

				// Check excerpt match
				if (metadata.excerpt.toLowerCase().includes(queryLower)) {
					relevanceScore += 3;
					if (!matchedContent) matchedContent = this.extractMatchedContent(metadata.excerpt, query);
				}

				if (relevanceScore > 0) {
					const pageResult = await this.getPageBySlug(slug);
					if (pageResult.success && pageResult.data) {
						results.push({
							page: pageResult.data,
							relevanceScore,
							matchedContent: matchedContent || metadata.excerpt.substring(0, 100)
						});
					}
				}
			}

			// Sort by relevance score
			results.sort((a, b) => b.relevanceScore - a.relevanceScore);

			return {
				success: true,
				data: results.slice(0, 50) // Limit to top 50 results
			};
		} catch (error) {
			console.error('Error searching wiki pages:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Search failed'
			};
		}
	}

	// Page Versions (Git history)
	async getPageVersions(pageId: string): Promise<ApiResponse<WikiPageVersion[]>> {
		try {
			const slug = pageId;
			const filePath = `${this.wikiPath}/${slug}.md`;

			const commits: GitHubCommit[] = await this.githubRequest(
				`/repos/${this.owner}/${this.repo}/commits?path=${filePath}&per_page=50`
			);

			const versions: WikiPageVersion[] = commits.map((commit, index) => ({
				$id: commit.sha,
				$createdAt: commit.commit.author.date,
				pageId: slug,
				version: commits.length - index,
				title: '', // Would need to parse content to get title
				content: '', // Would need to fetch content for each commit
				authorId: commit.author?.login || 'unknown',
				authorName: commit.commit.author.name,
				changeDescription: commit.commit.message
			}));

			return {
				success: true,
				data: versions
			};
		} catch (error) {
			console.error('Error fetching page versions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch versions'
			};
		}
	}

	// Categories
	async getCategories(): Promise<ApiResponse<WikiCategory[]>> {
		try {
			const file = await this.getFile(this.categoriesFile);
			if (!file) {
				// Return default categories if file doesn't exist
				const defaultCategories: WikiCategory[] = [
					{
						$id: 'getting-started',
						$createdAt: new Date().toISOString(),
						name: 'Getting Started',
						description: 'Basic guides for new members',
						slug: 'getting-started',
						isActive: true,
						order: 1
					},
					{
						$id: 'flight-operations',
						$createdAt: new Date().toISOString(),
						name: 'Flight Operations',
						description: 'Procedures and operations',
						slug: 'flight-operations',
						isActive: true,
						order: 2
					}
				];
				return { success: true, data: defaultCategories };
			}

			const content = this.decodeContent(file.content);
			const categories: WikiCategory[] = JSON.parse(content);

			return {
				success: true,
				data: categories.filter(cat => cat.isActive)
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
			const index = await this.getIndex();
			const publishedPages = Object.values(index).filter(metadata => metadata.isPublished);

			const categoriesResult = await this.getCategories();
			const categories = categoriesResult.success ? categoriesResult.data || [] : [];

			// Get recent pages
			const recentPagesMetadata = publishedPages
				.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
				.slice(0, 5);

			const recentPages: WikiPage[] = [];
			for (const metadata of recentPagesMetadata) {
				const pageResult = await this.getPageBySlug(metadata.slug);
				if (pageResult.success && pageResult.data) {
					recentPages.push(pageResult.data);
				}
			}

			const stats: WikiStats = {
				totalPages: publishedPages.length,
				totalCategories: categories.length,
				recentPages,
				topContributors: [] // Would need additional logic to calculate
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

export const githubWikiService = new GitHubWikiService();
