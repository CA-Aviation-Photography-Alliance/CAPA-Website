import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import { env } from '$env/dynamic/private';

// Get management API credentials from environment
const AUTH0_MANAGEMENT_CLIENT_ID = env.AUTH0_MANAGEMENT_CLIENT_ID;
const AUTH0_MANAGEMENT_CLIENT_SECRET = env.AUTH0_MANAGEMENT_CLIENT_SECRET;

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		// Check if Auth0 Management API is configured
		if (!AUTH0_MANAGEMENT_CLIENT_ID || !AUTH0_MANAGEMENT_CLIENT_SECRET) {
			return json(
				{
					error: 'Profile editing is not configured yet',
					setup_required: true,
					instructions: [
						'1. Create a Machine-to-Machine application in Auth0 Dashboard',
						'2. Authorize it for Auth0 Management API with read:users and update:users scopes',
						'3. Add AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET to your .env file',
						'4. See AUTH0_SETUP.md for detailed instructions'
					]
				},
				{ status: 501 }
			);
		}

		const { userId, nickname, name } = await request.json();

		if (!userId) {
			return json({ error: 'Missing user ID' }, { status: 400 });
		}

		// Validate nickname format
		if (nickname && !/^[a-zA-Z0-9_-]+$/.test(nickname)) {
			return json(
				{ error: 'Username can only contain letters, numbers, underscores, and hyphens' },
				{ status: 400 }
			);
		}

		// Get Auth0 Management API token
		const tokenResponse = await fetch(`https://${PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: AUTH0_MANAGEMENT_CLIENT_ID,
				client_secret: AUTH0_MANAGEMENT_CLIENT_SECRET,
				audience: `https://${PUBLIC_AUTH0_DOMAIN}/api/v2/`,
				grant_type: 'client_credentials'
			})
		});

		if (!tokenResponse.ok) {
			const tokenError = await tokenResponse.text();
			console.error('Auth0 management token error:', tokenError);
			return json({ error: 'Failed to get management token' }, { status: 500 });
		}

		const { access_token } = await tokenResponse.json();

		// Prepare update data
		const updateData: Record<string, string> = {};
		if (nickname !== undefined) updateData.nickname = nickname.trim();
		if (name !== undefined) updateData.name = name.trim();

		// Update user via Auth0 Management API
		const updateResponse = await fetch(
			`https://${PUBLIC_AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${access_token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			}
		);

		if (!updateResponse.ok) {
			const error = await updateResponse.json();
			console.error('Auth0 update user error:', error);

			// Handle specific Auth0 errors
			if (error.errorCode === 'invalid_body' && error.message?.includes('nickname')) {
				return json({ error: 'Username is already taken or invalid' }, { status: 400 });
			}

			return json(
				{ error: error.message || 'Failed to update profile' },
				{ status: updateResponse.status }
			);
		}

		const updatedUser = await updateResponse.json();

		return json({
			nickname: updatedUser.nickname,
			name: updatedUser.name,
			updated_at: updatedUser.updated_at
		});
	} catch (error) {
		console.error('Profile update error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
