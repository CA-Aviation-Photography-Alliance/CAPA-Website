import { browser } from '$app/environment';

export interface UploadedImage {
	id: string;
	url: string;
	deleteHash?: string;
	width?: number;
	height?: number;
	size: number;
	type: string;
	filename: string;
}

export class CatboxService {
	private readonly apiUrl = 'https://catbox.moe/user/api.php';
	private readonly maxFileSize = 200 * 1024 * 1024; // 200MB (Catbox limit)
	private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

	constructor() {
		// Catbox doesn't require API keys
	}

	/**
	 * Upload an image to Catbox
	 */
	async uploadImage(file: File): Promise<UploadedImage> {
		if (!browser) {
			throw new Error('Image upload can only be performed in browser environment');
		}

		// Validate file
		this.validateFile(file);

		try {
			const formData = new FormData();
			formData.append('reqtype', 'fileupload');
			formData.append('fileToUpload', file);

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Upload failed: ${response.status} ${errorText}`);
			}

			const url = await response.text();

			if (!url || !url.startsWith('https://files.catbox.moe/')) {
				throw new Error('Upload failed: Invalid response from Catbox');
			}

			// Extract filename from URL
			const urlParts = url.split('/');
			const catboxFilename = urlParts[urlParts.length - 1];

			return {
				id: catboxFilename,
				url: url.trim(),
				size: file.size,
				type: file.type,
				filename: file.name
			};
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Failed to upload image: ${error.message}`);
			}
			throw new Error('Failed to upload image: Unknown error');
		}
	}

	/**
	 * Upload multiple images
	 */
	async uploadImages(files: File[]): Promise<UploadedImage[]> {
		const uploadPromises = files.map((file) => this.uploadImage(file));

		try {
			return await Promise.all(uploadPromises);
		} catch (error) {
			throw new Error(`Failed to upload one or more images: ${error}`);
		}
	}

	/**
	 * Delete an image from Catbox (requires user hash - not supported with anonymous uploads)
	 */
	async deleteImage(deleteHash?: string): Promise<boolean> {
		// Catbox doesn't support deletion of anonymous uploads
		// Images uploaded without a user account cannot be deleted
		return Promise.resolve(false);
	}

	/**
	 * Get image info from Catbox (limited info available)
	 */
	async getImageInfo(imageId: string): Promise<any> {
		// Catbox doesn't provide an API to get image metadata
		// We can only verify if the image exists by trying to fetch it
		try {
			const response = await fetch(`https://files.catbox.moe/${imageId}`, { method: 'HEAD' });
			return {
				exists: response.ok,
				url: `https://files.catbox.moe/${imageId}`
			};
		} catch (error) {
			return { exists: false };
		}
	}

	/**
	 * Create a thumbnail URL for an image (Catbox doesn't support thumbnails, return original)
	 */
	createThumbnailUrl(imageUrl: string, size?: 's' | 'm' | 'l' | 'h'): string {
		// Catbox doesn't provide thumbnail generation
		// Return the original URL
		return imageUrl;
	}

	/**
	 * Check if a URL is a Catbox image
	 */
	isCatboxImage(url: string): boolean {
		return /^https?:\/\/files\.catbox\.moe\/[a-zA-Z0-9]+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
	}

	/**
	 * Extract image ID from Catbox URL
	 */
	extractImageId(url: string): string | null {
		const match = url.match(/files\.catbox\.moe\/([a-zA-Z0-9]+\.[a-z]+)$/);
		return match ? match[1] : null;
	}

	/**
	 * Validate file before upload
	 */
	private validateFile(file: File): void {
		// Check file type
		if (!this.allowedTypes.includes(file.type)) {
			throw new Error(`Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`);
		}

		// Check file size
		if (file.size > this.maxFileSize) {
			const maxSizeMB = this.maxFileSize / (1024 * 1024);
			throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
		}

		// Check if file is empty
		if (file.size === 0) {
			throw new Error('File is empty');
		}
	}

	/**
	 * Create a file input element for image selection
	 */
	createFileInput(multiple: boolean = false, onSelect?: (files: File[]) => void): HTMLInputElement {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = this.allowedTypes.join(',');
		input.multiple = multiple;

		if (onSelect) {
			input.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				const files = Array.from(target.files || []);
				if (files.length > 0) {
					onSelect(files);
				}
			});
		}

		return input;
	}

	/**
	 * Trigger file selection dialog
	 */
	async selectAndUploadImages(multiple: boolean = false): Promise<UploadedImage[]> {
		return new Promise((resolve, reject) => {
			const input = this.createFileInput(multiple, async (files) => {
				try {
					const uploadedImages = await this.uploadImages(files);
					resolve(uploadedImages);
				} catch (error) {
					reject(error);
				}
			});

			input.click();
		});
	}

	/**
	 * Resize image before upload (client-side)
	 */
	async resizeImage(
		file: File,
		maxWidth: number = 1920,
		maxHeight: number = 1080,
		quality: number = 0.8
	): Promise<File> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			if (!ctx) {
				reject(new Error('Canvas context not available'));
				return;
			}

			img.onload = () => {
				// Calculate new dimensions
				let { width, height } = img;

				if (width > maxWidth || height > maxHeight) {
					const ratio = Math.min(maxWidth / width, maxHeight / height);
					width *= ratio;
					height *= ratio;
				}

				// Set canvas dimensions
				canvas.width = width;
				canvas.height = height;

				// Draw and compress
				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (!blob) {
							reject(new Error('Failed to compress image'));
							return;
						}

						const compressedFile = new File([blob], file.name, {
							type: file.type,
							lastModified: Date.now()
						});

						resolve(compressedFile);
					},
					file.type,
					quality
				);
			};

			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = URL.createObjectURL(file);
		});
	}

	/**
	 * Get upload rate limits (for display purposes)
	 */
	getRateLimits(): {
		uploads: { perHour: number; perDay: number; perMonth: number };
		fileSize: string;
		allowedTypes: string[];
	} {
		return {
			uploads: {
				perHour: Infinity, // No rate limits on Catbox
				perDay: Infinity,
				perMonth: Infinity
			},
			fileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			allowedTypes: this.allowedTypes
		};
	}
}

// Export singleton instance
export const catboxService = new CatboxService();

// Keep the old export name for backwards compatibility
export const imgurService = catboxService;
