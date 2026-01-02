import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get the form data from the request
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			throw error(400, 'No file provided');
		}

		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			throw error(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
		}

		// Validate file size (200MB limit for Catbox)
		const maxSize = 200 * 1024 * 1024; // 200MB
		if (file.size > maxSize) {
			throw error(400, `File too large. Maximum size: 200MB`);
		}

		// Create form data for Catbox
		const catboxFormData = new FormData();
		catboxFormData.append('reqtype', 'fileupload');
		catboxFormData.append('fileToUpload', file);

		// Upload to Catbox via server-side request (no CORS issues)
		const response = await fetch('https://catbox.moe/user/api.php', {
			method: 'POST',
			body: catboxFormData
		});

		if (!response.ok) {
			throw error(500, `Catbox upload failed: ${response.status} ${response.statusText}`);
		}

		const catboxUrl = await response.text();

		// Validate the response
		if (!catboxUrl || !catboxUrl.startsWith('https://files.catbox.moe/')) {
			throw error(500, 'Invalid response from Catbox');
		}

		// Extract filename from URL
		const urlParts = catboxUrl.trim().split('/');
		const catboxFilename = urlParts[urlParts.length - 1];

		// Return the same format as the original service
		return json({
			success: true,
			data: {
				id: catboxFilename,
				url: catboxUrl.trim(),
				size: file.size,
				type: file.type,
				filename: file.name,
				width: null, // Catbox doesn't provide dimensions
				height: null
			}
		});

	} catch (err) {
		console.error('Upload error:', err);

		if (err instanceof Response) {
			throw err;
		}

		throw error(500, `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

// Handle CORS for OPTIONS requests
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		},
	});
};
