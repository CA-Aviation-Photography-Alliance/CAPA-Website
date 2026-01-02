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

export class ProxyCatboxService {
	private readonly apiUrl = '/api/upload-image';
	private readonly maxFileSize = 200 * 1024 * 1024; // 200MB (Catbox limit)
	private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

	/**
	 * Upload an image via our server proxy (avoids CORS)
	 */
	async uploadImage(file: File): Promise<UploadedImage> {
		if (!browser) {
			throw new Error('Image upload can only be performed in browser environment');
		}

		// Validate file
		this.validateFile(file);

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const errorMessage = errorData?.message || `HTTP ${response.status}`;
				throw new Error(`Upload failed: ${errorMessage}`);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(`Upload failed: ${result.message || 'Unknown error'}`);
			}

			const data = result.data;

			return {
				id: data.id,
				url: data.url,
				deleteHash: undefined, // Catbox doesn't support deletion for anonymous uploads
				width: data.width,
				height: data.height,
				size: data.size,
				type: data.type,
				filename: data.filename
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
	 * Delete an image from Catbox (not supported for anonymous uploads)
	 */
	async deleteImage(deleteHash?: string): Promise<boolean> {
		// Catbox doesn't support deletion of anonymous uploads
		// Images uploaded without a user account cannot be deleted
		return Promise.resolve(false);
	}

	/**
	 * Get image info from Catbox (limited info available)
	 */
	async getImageInfo(imageId: string): Promise<{
		exists: boolean;
		url?: string;
	}> {
		// Catbox doesn't provide an API to get image metadata
		// We can only verify if the image exists by trying to fetch it
		try {
			const response = await fetch(`https://files.catbox.moe/${imageId}`, { method: 'HEAD' });
			return {
				exists: response.ok,
				url: response.ok ? `https://files.catbox.moe/${imageId}` : undefined
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
		features: string[];
	} {
		return {
			uploads: {
				perHour: Infinity, // No rate limits on Catbox
				perDay: Infinity,
				perMonth: Infinity
			},
			fileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			allowedTypes: this.allowedTypes,
			features: [
				'Free hosting',
				'200MB file limit',
				'No bandwidth limits',
				'No registration required',
				'Direct linking allowed',
				'Anonymous uploads'
			]
		};
	}

	/**
	 * Check if service is available
	 */
	async checkStatus(): Promise<boolean> {
		try {
			const response = await fetch('/api/upload-image', { method: 'OPTIONS' });
			return response.ok;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get service info
	 */
	getServiceInfo(): {
		name: string;
		website: string;
		maxFileSize: string;
		supportedFormats: string[];
		features: string[];
		note: string;
	} {
		return {
			name: 'Catbox (Proxy)',
			website: 'https://catbox.moe',
			maxFileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			supportedFormats: this.allowedTypes,
			features: [
				'Completely free',
				'No registration required',
				'Large file support (200MB)',
				'No bandwidth limits',
				'Direct image links',
				'Anonymous uploads',
				'99%+ uptime'
			],
			note: 'Uses server proxy to avoid CORS issues'
		};
	}
}

// Export singleton instance
export const proxyCatboxService = new ProxyCatboxService();

// Keep backwards compatibility
export const catboxService = proxyCatboxService;
export const imgurService = proxyCatboxService;
