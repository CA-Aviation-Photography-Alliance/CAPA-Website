import { databases, client, COLLECTIONS, generateId, getForumDatabase } from '$lib/config/appwrite';
import { Query } from 'appwrite';
import type {
	ModerationAction,
	UserReport,
	ForumPost,
	ForumComment,
	UserRole,
	UserPermissions
} from '$lib/types';
import { authService } from '../auth';
import { forumService } from './forumService';

export class ModerationService {
	private databaseId = getForumDatabase();

	/**
	 * Check if current user has moderator permissions
	 */
	async hasModeratorPermissions(): Promise<boolean> {
		const user = authService.getCurrentUserSync();
		if (!user) return false;

		// Check if user has moderator role in preferences
		const roles = user.prefs?.roles || [];
		return roles.includes('moderator') || roles.includes('admin');
	}

	/**
	 * Get user permissions based on their role
	 */
	async getUserPermissions(userId?: string): Promise<UserPermissions> {
		const targetUserId = userId || authService.getCurrentUserSync()?.$id;
		if (!targetUserId) {
			return {
				canModerate: false,
				canPin: false,
				canLock: false,
				canDelete: false,
				canEditAnyPost: false,
				canManageUsers: false
			};
		}

		const user = authService.getCurrentUserSync();
		const roles = user?.prefs?.roles || [];
		const isAdmin = roles.includes('admin');
		const isModerator = roles.includes('moderator') || isAdmin;

		return {
			canModerate: isModerator,
			canPin: isModerator,
			canLock: isModerator,
			canDelete: isModerator,
			canEditAnyPost: isModerator,
			canManageUsers: isAdmin
		};
	}

	/**
	 * Pin or unpin a post
	 */
	async togglePinPost(postId: string, pin: boolean, reason?: string): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canPin) {
			throw new Error('You do not have permission to pin posts');
		}

		try {
			// Update the post
			await databases.updateDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId, {
				isPinned: pin
			});

			// Log the moderation action
			await this.logModerationAction({
				actionType: pin ? 'pin' : 'unpin',
				targetType: 'post',
				targetId: postId,
				reason
			});
		} catch (error) {
			throw new Error('Failed to update post pin status');
		}
	}

	/**
	 * Lock or unlock a post
	 */
	async toggleLockPost(postId: string, lock: boolean, reason?: string): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canLock) {
			throw new Error('You do not have permission to lock posts');
		}

		try {
			// Update the post
			await databases.updateDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId, {
				isLocked: lock
			});

			// Log the moderation action
			await this.logModerationAction({
				actionType: lock ? 'lock' : 'unlock',
				targetType: 'post',
				targetId: postId,
				reason
			});
		} catch (error) {
			throw new Error('Failed to update post lock status');
		}
	}

	/**
	 * Delete a post (moderator override)
	 */
	async deletePost(postId: string, reason: string): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canDelete) {
			throw new Error('You do not have permission to delete posts');
		}

		try {
			// Log the moderation action before deletion
			await this.logModerationAction({
				actionType: 'delete',
				targetType: 'post',
				targetId: postId,
				reason
			});

			// Delete the post
			await databases.deleteDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId);

			// Note: In a production system, you might want to soft-delete instead
		} catch (error) {
			throw new Error('Failed to delete post');
		}
	}

	/**
	 * Delete a comment (moderator override)
	 */
	async deleteComment(commentId: string, reason: string): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canDelete) {
			throw new Error('You do not have permission to delete comments');
		}

		try {
			// Log the moderation action before deletion
			await this.logModerationAction({
				actionType: 'delete',
				targetType: 'comment',
				targetId: commentId,
				reason
			});

			// Delete the comment
			await databases.deleteDocument(this.databaseId, COLLECTIONS.FORUM_COMMENTS, commentId);
		} catch (error) {
			throw new Error('Failed to delete comment');
		}
	}

	/**
	 * Edit any post (moderator override)
	 */
	async editPost(postId: string, updates: Partial<ForumPost>, reason?: string): Promise<ForumPost> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canEditAnyPost) {
			throw new Error('You do not have permission to edit posts');
		}

		try {
			// Update the post
			const updatedPost = await databases.updateDocument(
				this.databaseId,
				COLLECTIONS.FORUM_POSTS,
				postId,
				updates
			);

			// Log the moderation action
			await this.logModerationAction({
				actionType: 'edit',
				targetType: 'post',
				targetId: postId,
				reason,
				details: updates
			});

			return updatedPost as ForumPost;
		} catch (error) {
			throw new Error('Failed to edit post');
		}
	}

	/**
	 * Move post to different category
	 */
	async movePost(postId: string, newCategoryId: string, reason?: string): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canModerate) {
			throw new Error('You do not have permission to move posts');
		}

		try {
			// Update the post category
			await databases.updateDocument(this.databaseId, COLLECTIONS.FORUM_POSTS, postId, {
				categoryId: newCategoryId
			});

			// Log the moderation action
			await this.logModerationAction({
				actionType: 'move',
				targetType: 'post',
				targetId: postId,
				reason,
				details: { newCategoryId }
			});
		} catch (error) {
			throw new Error('Failed to move post');
		}
	}

	/**
	 * Submit a user report
	 */
	async submitReport(
		targetType: 'post' | 'comment' | 'user',
		targetId: string,
		reason: string,
		description: string
	): Promise<UserReport> {
		const user = authService.getCurrentUserSync();
		if (!user) {
			throw new Error('You must be logged in to submit reports');
		}

		try {
			const reportData = {
				reporterId: user.$id!,
				reporterName: user.username,
				targetType,
				targetId,
				reason,
				description,
				status: 'pending' as const
			};

			const report = await databases.createDocument(
				this.databaseId,
				COLLECTIONS.USER_REPORTS,
				generateId(),
				reportData
			);

			return report as UserReport;
		} catch (error) {
			throw new Error('Failed to submit report');
		}
	}

	/**
	 * Get pending reports (moderators only)
	 */
	async getPendingReports(): Promise<UserReport[]> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canModerate) {
			throw new Error('You do not have permission to view reports');
		}

		try {
			const response = await databases.listDocuments(this.databaseId, COLLECTIONS.USER_REPORTS, [
				Query.equal('status', 'pending'),
				Query.orderDesc('$createdAt'),
				Query.limit(50)
			]);

			return response.documents as UserReport[];
		} catch (error) {
			throw new Error('Failed to fetch reports');
		}
	}

	/**
	 * Resolve a report
	 */
	async resolveReport(
		reportId: string,
		status: 'resolved' | 'dismissed',
		resolution: string
	): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canModerate) {
			throw new Error('You do not have permission to resolve reports');
		}

		const user = authService.getCurrentUserSync();
		if (!user) {
			throw new Error('You must be logged in');
		}

		try {
			await databases.updateDocument(this.databaseId, COLLECTIONS.USER_REPORTS, reportId, {
				status,
				resolution,
				reviewedBy: user.$id,
				reviewedAt: new Date().toISOString()
			});
		} catch (error) {
			throw new Error('Failed to resolve report');
		}
	}

	/**
	 * Get moderation history
	 */
	async getModerationHistory(limit = 50): Promise<ModerationAction[]> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canModerate) {
			throw new Error('You do not have permission to view moderation history');
		}

		try {
			const response = await databases.listDocuments(
				this.databaseId,
				COLLECTIONS.MODERATION_ACTIONS,
				[Query.orderDesc('$createdAt'), Query.limit(limit)]
			);

			return response.documents as ModerationAction[];
		} catch (error) {
			throw new Error('Failed to fetch moderation history');
		}
	}

	/**
	 * Add or remove user role
	 */
	async updateUserRole(userId: string, role: UserRole, add: boolean): Promise<void> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canManageUsers) {
			throw new Error('You do not have permission to manage user roles');
		}

		try {
			// In a real implementation, this would update the user's account
			// For now, we'll use the user preferences system
			const user = await authService.getCurrentUser();
			if (!user) throw new Error('User not found');

			const currentRoles = user.prefs?.roles || [];
			let newRoles;

			if (add) {
				newRoles = [...new Set([...currentRoles, role])];
			} else {
				newRoles = currentRoles.filter((r: string) => r !== role);
			}

			// Update user preferences
			await authService.updatePreferences({ roles: newRoles });

			// Log the action
			await this.logModerationAction({
				actionType: add ? 'add_role' : 'remove_role',
				targetType: 'user',
				targetId: userId,
				details: { role }
			});
		} catch (error) {
			throw new Error('Failed to update user role');
		}
	}

	/**
	 * Check if user can moderate specific category
	 */
	async canModerateCategory(categoryId: string): Promise<boolean> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canModerate) return false;

		// Admins can moderate all categories
		const user = authService.getCurrentUserSync();
		const roles = user?.prefs?.roles || [];
		if (roles.includes('admin')) return true;

		// Check if user is assigned as moderator for this specific category
		try {
			const category = await databases.getDocument(
				this.databaseId,
				COLLECTIONS.FORUM_CATEGORIES,
				categoryId
			);

			const moderators = category.moderators || [];
			return moderators.includes(user?.$id);
		} catch (error) {
			return false;
		}
	}

	/**
	 * Log moderation action
	 */
	private async logModerationAction(
		action: Omit<ModerationAction, '$id' | '$createdAt' | 'moderatorId' | 'moderatorName'>
	): Promise<void> {
		const user = authService.getCurrentUserSync();
		if (!user) return;

		try {
			const actionData = {
				...action,
				moderatorId: user.$id!,
				moderatorName: user.username
			};

			await databases.createDocument(
				this.databaseId,
				COLLECTIONS.MODERATION_ACTIONS,
				generateId(),
				actionData
			);
		} catch (error) {
			// Don't throw here as this is just logging
		}
	}

	/**
	 * Get moderation stats
	 */
	async getModerationStats(): Promise<{
		pendingReports: number;
		actionsToday: number;
		totalPosts: number;
		totalComments: number;
	}> {
		const permissions = await this.getUserPermissions();
		if (!permissions.canModerate) {
			throw new Error('You do not have permission to view moderation stats');
		}

		try {
			const today = new Date().toISOString().split('T')[0];

			const [pendingReportsRes, actionsTodayRes, postsRes, commentsRes] = await Promise.all([
				databases.listDocuments(this.databaseId, COLLECTIONS.USER_REPORTS, [
					Query.equal('status', 'pending'),
					Query.limit(1)
				]),
				databases.listDocuments(this.databaseId, COLLECTIONS.MODERATION_ACTIONS, [
					Query.greaterThanEqual('$createdAt', today),
					Query.limit(1)
				]),
				databases.listDocuments(this.databaseId, COLLECTIONS.FORUM_POSTS, [Query.limit(1)]),
				databases.listDocuments(this.databaseId, COLLECTIONS.FORUM_COMMENTS, [Query.limit(1)])
			]);

			return {
				pendingReports: pendingReportsRes.total,
				actionsToday: actionsTodayRes.total,
				totalPosts: postsRes.total,
				totalComments: commentsRes.total
			};
		} catch (error) {
			throw new Error('Failed to fetch moderation stats');
		}
	}
}

// Export singleton instance
export const moderationService = new ModerationService();
