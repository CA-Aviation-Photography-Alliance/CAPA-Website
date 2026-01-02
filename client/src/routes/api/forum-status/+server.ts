import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { databases, COLLECTIONS, getForumDatabase } from '$lib/config/appwrite';

export const GET: RequestHandler = async () => {
	try {
		const databaseId = getForumDatabase();
		const status: any = {
			timestamp: new Date().toISOString(),
			databaseId,
			collections: {},
			errors: []
		};

		// Check each forum collection
		const collectionsToCheck = {
			categories: COLLECTIONS.FORUM_CATEGORIES,
			posts: COLLECTIONS.FORUM_POSTS,
			comments: COLLECTIONS.FORUM_COMMENTS,
			moderationActions: COLLECTIONS.MODERATION_ACTIONS,
			userReports: COLLECTIONS.USER_REPORTS
		};

		for (const [name, collectionId] of Object.entries(collectionsToCheck)) {
			try {
				if (!collectionId) {
					status.collections[name] = {
						configured: false,
						error: 'Collection ID not set in environment variables'
					};
					status.errors.push(`${name}: Missing environment variable`);
					continue;
				}

				// Try to list documents (this will fail if collection doesn't exist)
				const response = await databases.listDocuments(
					databaseId,
					collectionId,
					undefined,
					1 // Only get 1 document to test connection
				);

				status.collections[name] = {
					configured: true,
					collectionId,
					exists: true,
					documentCount: response.total
				};
			} catch (err: any) {
				status.collections[name] = {
					configured: !!collectionId,
					collectionId,
					exists: false,
					error: err.message
				};
				status.errors.push(`${name}: ${err.message}`);
			}
		}

		// Overall status
		status.healthy = status.errors.length === 0;
		status.configured = Object.values(collectionsToCheck).every(id => !!id);

		return json(status, {
			status: status.healthy ? 200 : 503
		});

	} catch (err: any) {
		return json({
			healthy: false,
			error: err.message,
			timestamp: new Date().toISOString()
		}, {
			status: 500
		});
	}
};
