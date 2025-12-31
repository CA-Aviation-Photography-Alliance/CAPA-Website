import {
	databases,
	client,
	COLLECTIONS,
	generateId,
	STORAGE_BUCKETS,
	getForumDatabase
} from '$lib/config/appwrite';
import { Query } from 'appwrite';
import type {
	ForumCategory,
	ForumPost,
	ForumComment,
	CreateForumPostData,
	UpdateForumPostData,
	CreateForumCommentData,
	ForumFilters,
	Creator,
	ForumStats
} from '$lib/types';
import { authService } from '../auth';

export class ForumService {
	private databaseId = getForumDatabase();

	/**
	 * Get all forum categories
	 */
	async getCategories(): Promise<ForumCategory[]> {
		try {
			const response = await databases.listDocuments(
				this.databaseId,
				COLLECTIONS.FORUM_CATEGORIES,
				[Query.equal('isActive', true), Query.orderAsc('order')]
			);

			return response.documents as ForumCategory[];
		} catch (error) {
			throw new Error('Failed to fetch forum categories');
		}
	}

	/**
	 * Get category by slug
	 */
	async getCategoryBySlug(slug: string): Promise<ForumCategory | null> {
		try {
			const response = await databases.listDocuments(
				this.databaseId,
				COLLECTIONS.FORUM_CATEGORIES,
				[Query.equal('slug', slug), Query.equal('isActive', true)]
			);

			return (response.documents[0] as ForumCategory) || null;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Get posts with filtering and pagination
	 */
	async getPosts(filters: ForumFilters = {}): Promise<{
		posts: ForumPost[];
		total: number;
		hasMore: boolean;
	}> {
		try {
			const {
				page = 1,
				limit = 20,
				categoryId,
				authorId,
				search,
				sortBy = 'lastActivity',
				sortOrder = 'desc',
				isPinned
			} = filters;

			const queries = [];

			// Add filters
			if (categoryId) {
				queries.push(Query.equal('categoryId', categoryId));
			}

			if (authorId) {
				queries.push(Query.equal('authorId', authorId));
			}

			if (search) {
				queries.push(Query.search('title', search));
			}

			if (isPinned !== undefined) {
				queries.push(Query.equal('isPinned', isPinned));
			}

			// Add sorting
			const sortQuery = sortOrder === 'desc' ? Query.orderDesc(sortBy) : Query.orderAsc(sortBy);
			queries.push(sortQuery);

			// Add pagination
			queries.push(Query.limit(limit));
			queries.push(Query.offset((page - 1) * limit));

			const response = await databases.listDocuments(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				queries
			);

			const posts = response.documents as ForumPost[];
			const total = response.total;
			const hasMore = page * limit < total;

			return { posts, total, hasMore };
		} catch (error) {
			throw new Error('Failed to fetch posts');
		}
	}

	/**
	 * Get a single post by ID
	 */
	async getPost(postId: string): Promise<ForumPost | null> {
		try {
			const post = (await databases.getDocument(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				postId
			)) as ForumPost;

			// Try to increment view count (ignore errors if unauthorized)
			this.incrementPostViews(postId).catch(() => {
				// Silently ignore view count increment errors
			});

			return post;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Create a new post
	 */
	async createPost(data: CreateForumPostData): Promise<ForumPost> {
		try {
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				throw new Error('User must be authenticated to create posts');
			}

			const postData = {
				title: data.title,
				content: data.content,
				excerpt: this.generateExcerpt(data.content),
				categoryId: data.categoryId,
				authorId: currentUser.userId,
				authorName: currentUser.username,
				authorEmail: currentUser.email,
				isPinned: data.isPinned || false,
				isLocked: false,
				tags: data.tags || [],
				views: 0,
				commentCount: 0,
				lastActivity: new Date().toISOString()
			};

			const response = await databases.createDocument(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				generateId(),
				postData
			);

			return response as ForumPost;
		} catch (error) {
			throw new Error('Failed to create post');
		}
	}

	/**
	 * Update a post
	 */
	async updatePost(data: UpdateForumPostData): Promise<ForumPost> {
		try {
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				throw new Error('User must be authenticated');
			}

			// Get existing post to check ownership
			const existingPost = await this.getPost(data.$id);
			if (!existingPost) {
				throw new Error('Post not found');
			}

			if (existingPost.authorId !== currentUser.userId) {
				throw new Error('You can only edit your own posts');
			}

			const updateData: any = {};

			if (data.title) updateData.title = data.title;
			if (data.content) {
				updateData.content = data.content;
				updateData.excerpt = this.generateExcerpt(data.content);
			}
			if (data.categoryId) updateData.categoryId = data.categoryId;
			if (data.tags) updateData.tags = data.tags;
			if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
			if (data.isLocked !== undefined) updateData.isLocked = data.isLocked;

			const response = await databases.updateDocument(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				data.$id,
				updateData
			);

			return response as ForumPost;
		} catch (error) {
			throw new Error('Failed to update post');
		}
	}

	/**
	 * Delete a post
	 */
	async deletePost(postId: string): Promise<void> {
		try {
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				throw new Error('User must be authenticated');
			}

			// Get existing post to check ownership
			const existingPost = await this.getPost(postId);
			if (!existingPost) {
				throw new Error('Post not found');
			}

			if (existingPost.authorId !== currentUser.userId) {
				throw new Error('You can only delete your own posts');
			}

			await databases.deleteDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId);
		} catch (error) {
			throw new Error('Failed to delete post');
		}
	}

	/**
	 * Get comments for a post
	 */
	async getComments(
		postId: string,
		page = 1,
		limit = 50
	): Promise<{
		comments: ForumComment[];
		total: number;
		hasMore: boolean;
	}> {
		try {
			const response = await databases.listDocuments(this.databaseId, COLLECTIONS.FORUM_COMMENTS, [
				Query.equal('postId', postId),
				Query.orderAsc('$createdAt'),
				Query.limit(limit),
				Query.offset((page - 1) * limit)
			]);

			const comments = response.documents as ForumComment[];
			const total = response.total;
			const hasMore = page * limit < total;

			return { comments, total, hasMore };
		} catch (error) {
			throw new Error('Failed to fetch comments');
		}
	}

	/**
	 * Create a new comment
	 */
	async createComment(data: CreateForumCommentData): Promise<ForumComment> {
		try {
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				throw new Error('User must be authenticated to create comments');
			}

			const commentData = {
				content: data.content,
				postId: data.postId,
				parentId: data.parentId || null,
				authorId: currentUser.userId,
				authorName: currentUser.username,
				authorEmail: currentUser.email,
				isEdited: false
			};

			const response = await databases.createDocument(
				this.databaseId,
				COLLECTIONS.FORUM_COMMENTS,
				generateId(),
				commentData
			);

			// Update post comment count and last activity
			await this.updatePostActivity(data.postId, currentUser);

			return response as ForumComment;
		} catch (error) {
			throw new Error('Failed to create comment');
		}
	}

	/**
	 * Update a comment
	 */
	async updateComment(commentId: string, content: string): Promise<ForumComment> {
		try {
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				throw new Error('User must be authenticated');
			}

			const response = await databases.updateDocument(
				this.databaseId,
				COLLECTIONS.FORUM_COMMENTS,
				commentId,
				{
					content,
					isEdited: true,
					editedAt: new Date().toISOString()
				}
			);

			return response as ForumComment;
		} catch (error) {
			throw new Error('Failed to update comment');
		}
	}

	/**
	 * Delete a comment
	 */
	async deleteComment(commentId: string): Promise<void> {
		try {
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				throw new Error('User must be authenticated');
			}

			await databases.deleteDocument(this.databaseId, COLLECTIONS.FORUM_COMMENTS, commentId);
		} catch (error) {
			throw new Error('Failed to delete comment');
		}
	}

	/**
	 * Get forum statistics
	 */
	async getForumStats(): Promise<ForumStats> {
		try {
			// This would need to be implemented based on your specific needs
			// For now, returning a basic structure
			const recentPostsResponse = await databases.listDocuments(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				[Query.orderDesc('$createdAt'), Query.limit(5)]
			);

			const popularPostsResponse = await databases.listDocuments(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				[Query.orderDesc('views'), Query.limit(5)]
			);

			return {
				totalPosts: recentPostsResponse.total,
				totalComments: 0, // Would need separate query
				totalUsers: 0, // Would need separate query
				recentPosts: recentPostsResponse.documents as ForumPost[],
				popularPosts: popularPostsResponse.documents as ForumPost[],
				activeUsers: [] // Would need separate implementation
			};
		} catch (error) {
			throw new Error('Failed to fetch forum statistics');
		}
	}

	// Helper methods

	/**
	 * Generate excerpt from content
	 */
	private generateExcerpt(content: string, maxLength = 200): string {
		const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
		return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
	}

	/**
	 * Increment post view count
	 */
	private async incrementPostViews(postId: string): Promise<void> {
		try {
			// Only try to increment if user is authenticated
			const currentUser = authService.getCurrentUserForEvents();
			if (!currentUser) {
				return; // Skip view increment for anonymous users
			}

			const post = (await databases.getDocument(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				postId
			)) as ForumPost;

			await databases.updateDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId, {
				views: post.views + 1
			});
		} catch (error) {
			// Silently ignore view increment errors (authorization, etc.)
		}
	}

	/**
	 * Update post activity and comment count
	 */
	private async updatePostActivity(postId: string, user: Creator): Promise<void> {
		try {
			const post = (await databases.getDocument(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				postId
			)) as ForumPost;

			await databases.updateDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId, {
				commentCount: post.commentCount + 1,
				lastActivity: new Date().toISOString()
			});
		} catch (error) {
			// Silently ignore errors
		}
	}
}

// Export singleton instance
export const forumService = new ForumService();
