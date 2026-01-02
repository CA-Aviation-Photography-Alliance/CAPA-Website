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

export class ImgBBService {
	private readonly apiUrl = 'https://api.imgbb.com/1/upload';
	private readonly apiKey: string;
	private readonly maxFileSize = 32 * 1024 * 1024; // 32MB (ImgBB limit)
	private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

	constructor(apiKey?: string) {
		this.apiKey = apiKey || import.meta.env.VITE_IMGBB_API_KEY || '';
		if (!this.apiKey) {
			console.warn('ImgBB API key not provided. Image uploads will fail.');
		}
	}

	/**
	 * Upload an image to ImgBB
	 */
	async uploadImage(file: File): Promise<UploadedImage> {
		if (!browser) {
			throw new Error('Image upload can only be performed in browser environment');
		}

		if (!this.apiKey) {
			throw new Error('ImgBB API key not configured');
		}

		// Validate file
		this.validateFile(file);

		try {
			// Convert file to base64
			const base64 = await this.fileToBase64(file);

			// Prepare form data
			const formData = new FormData();
			formData.append('key', this.apiKey);
			formData.append('image', base64.split(',')[1]); // Remove data:image/xxx;base64, prefix
			formData.append('name', file.name);

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
				throw new Error(`Upload failed: ${errorMessage}`);
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(`Upload failed: ${data.error?.message || 'Unknown error'}`);
			}

			const imageData = data.data;

			return {
				id: imageData.id,
				url: imageData.url,
				deleteHash: imageData.delete_url,
				width: imageData.width,
				height: imageData.height,
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
	 * Delete an image from ImgBB (requires delete URL)
	 */
	async deleteImage(deleteUrl?: string): Promise<boolean> {
		if (!deleteUrl) {
			return false;
		}

		try {
			const response = await fetch(deleteUrl, {
				method: 'GET' // ImgBB delete URLs are GET requests
			});
			return response.ok;
		} catch (error) {
			console.error('Failed to delete image:', error);
			return false;
		}
	}

	/**
	 * Get image info (ImgBB doesn't provide an info API, so we return basic info)
	 */
	async getImageInfo(imageId: string): Promise<{
		exists: boolean;
		id?: string;
		url?: string;
	}> {
		// ImgBB doesn't provide an API to get image metadata
		// We can only check if the image exists by trying to fetch it
		try {
			const response = await fetch(`https://i.ibb.co/${imageId}`, { method: 'HEAD' });
			return {
				exists: response.ok,
				id: imageId,
				url: `https://i.ibb.co/${imageId}`
			};
		} catch (error) {
			return { exists: false };
		}
	}

	/**
	 * Create a thumbnail URL for an image
	 */
	createThumbnailUrl(imageUrl: string, size?: 's' | 'm' | 'l' | 'h'): string {
		// ImgBB provides different sized versions by modifying the URL
		// Original: https://i.ibb.co/abc123/image.jpg
		// Thumbnail: https://i.ibb.co/abc123/image.jpg can be resized with URL params

		// For simplicity, return original URL as ImgBB handles optimization automatically
		// You could implement URL manipulation here if needed
		return imageUrl;
	}

	/**
	 * Check if a URL is an ImgBB image
	 */
	isImgBBImage(url: string): boolean {
		return /^https?:\/\/(i\.)?ibb\.co\//.test(url);
	}

	/**
	 * Extract image ID from ImgBB URL
	 */
	extractImageId(url: string): string | null {
		const match = url.match(/ibb\.co\/([a-zA-Z0-9]+)/);
		return match ? match[1] : null;
	}

	/**
	 * Convert file to base64 string
	 */
	private async fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result);
				} else {
					reject(new Error('Failed to convert file to base64'));
				}
			};
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsDataURL(file);
		});
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
	 * Get upload rate limits and API info (for display purposes)
	 */
	getRateLimits(): {
		uploads: { perHour: number; perDay: number; perMonth: number };
		fileSize: string;
		allowedTypes: string[];
		features: string[];
	} {
		return {
			uploads: {
				perHour: 100, // Conservative estimate
				perDay: 500,
				perMonth: 10000
			},
			fileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			allowedTypes: this.allowedTypes,
			features: [
				'Free hosting',
				'No bandwidth limits',
				'Direct linking allowed',
				'CORS support',
				'Automatic optimization'
			]
		};
	}

	/**
	 * Check API key validity
	 */
	async validateApiKey(): Promise<boolean> {
		if (!this.apiKey) return false;

		try {
			// Create a tiny test image (1x1 pixel transparent PNG)
			const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

			const formData = new FormData();
			formData.append('key', this.apiKey);
			formData.append('image', testImage.split(',')[1]);

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				body: formData
			});

			const data = await response.json();
			return data.success === true;
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
	} {
		return {
			name: 'ImgBB',
			website: 'https://imgbb.com',
			maxFileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			supportedFormats: this.allowedTypes,
			features: [
				'Free image hosting',
				'No registration required (with API key)',
				'Direct image links',
				'CORS enabled',
				'Auto-resizing and optimization',
				'Delete functionality',
				'99.9% uptime'
			]
		};
	}
}

// Export singleton instance
export const imgbbService = new ImgBBService();

// Keep backwards compatibility
export const imgurService = imgbbService;
