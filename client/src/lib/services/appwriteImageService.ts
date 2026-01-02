import { storage, STORAGE_BUCKETS } from '$lib/config/appwrite';
import { ID, ImageGravity } from 'appwrite';
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

export class AppwriteImageService {
	private readonly bucketId: string;
	private readonly maxFileSize = 10 * 1024 * 1024; // 10MB (reasonable for Appwrite)
	private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

	constructor() {
		this.bucketId = STORAGE_BUCKETS.FORUM_ATTACHMENTS || 'forum-attachments';
	}

	/**
	 * Upload an image to Appwrite Storage
	 */
	async uploadImage(file: File): Promise<UploadedImage> {
		if (!browser) {
			throw new Error('Image upload can only be performed in browser environment');
		}

		// Validate file
		this.validateFile(file);

		try {
			// Generate unique file ID
			const fileId = ID.unique();

			// Upload file to Appwrite Storage
			const uploadedFile = await storage.createFile(this.bucketId, fileId, file);

			// Get file preview URL (for images)
			const imageUrl = storage.getFilePreview(
				this.bucketId,
				uploadedFile.$id,
				2048, // max width
				2048, // max height
				ImageGravity.Center, // gravity
				100 // quality
			);

			// Get image dimensions if possible
			const dimensions = await this.getImageDimensions(file);

			return {
				id: uploadedFile.$id,
				url: imageUrl.toString(),
				deleteHash: uploadedFile.$id, // Use file ID for deletion
				width: dimensions.width,
				height: dimensions.height,
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
	 * Delete an image from Appwrite Storage
	 */
	async deleteImage(fileId: string): Promise<boolean> {
		try {
			await storage.deleteFile(this.bucketId, fileId);
			return true;
		} catch (error) {
			console.error('Failed to delete image:', error);
			return false;
		}
	}

	/**
	 * Get image info from Appwrite Storage
	 */
	async getImageInfo(imageId: string): Promise<{
		exists: boolean;
		id?: string;
		name?: string;
		size?: number;
		mimeType?: string;
		url?: string;
		createdAt?: string;
		updatedAt?: string;
	}> {
		try {
			const file = await storage.getFile(this.bucketId, imageId);
			return {
				exists: true,
				id: file.$id,
				name: file.name,
				size: file.sizeOriginal,
				mimeType: file.mimeType,
				url: storage
					.getFilePreview(this.bucketId, imageId, 2048, 2048, ImageGravity.Center, 100)
					.toString(),
				createdAt: file.$createdAt,
				updatedAt: file.$updatedAt
			};
		} catch {
			return { exists: false };
		}
	}

	/**
	 * Create a thumbnail URL for an image
	 */
	createThumbnailUrl(imageUrl: string, size?: 's' | 'm' | 'l' | 'h'): string {
		// Extract file ID from the image URL
		const fileId = this.extractImageId(imageUrl);
		if (!fileId) return imageUrl;

		// Define thumbnail sizes
		const sizes = {
			s: { width: 150, height: 150 },
			m: { width: 300, height: 300 },
			l: { width: 600, height: 600 },
			h: { width: 1200, height: 1200 }
		};

		const thumbnailSize = sizes[size || 'm'];

		return storage
			.getFilePreview(
				this.bucketId,
				fileId,
				thumbnailSize.width,
				thumbnailSize.height,
				ImageGravity.Center,
				85 // slightly lower quality for thumbnails
			)
			.toString();
	}

	/**
	 * Check if a URL is an Appwrite Storage image
	 */
	isAppwriteImage(url: string): boolean {
		return url.includes('/files/') && url.includes('/preview');
	}

	/**
	 * Extract image ID from Appwrite Storage URL
	 */
	extractImageId(url: string): string | null {
		// Appwrite preview URLs have format: .../files/{bucketId}/files/{fileId}/preview
		const match = url.match(/files\/[^/]+\/files\/([^/]+)\/preview/);
		return match ? match[1] : null;
	}

	/**
	 * Get image dimensions from file
	 */
	private async getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
		return new Promise((resolve) => {
			if (!file.type.startsWith('image/')) {
				resolve({});
				return;
			}

			const img = new Image();
			img.onload = () => {
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
				URL.revokeObjectURL(img.src);
			};
			img.onerror = () => {
				resolve({});
				URL.revokeObjectURL(img.src);
			};
			img.src = URL.createObjectURL(file);
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
	 * Get upload rate limits (for display purposes)
	 */
	getRateLimits(): {
		uploads: { perHour: number; perDay: number; perMonth: number };
		fileSize: string;
		allowedTypes: string[];
	} {
		return {
			uploads: {
				perHour: 100, // Reasonable limits for Appwrite
				perDay: 500,
				perMonth: 10000
			},
			fileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			allowedTypes: this.allowedTypes
		};
	}

	/**
	 * Get direct file download URL (bypasses preview)
	 */
	getDirectUrl(fileId: string): string {
		return storage.getFileDownload(this.bucketId, fileId).toString();
	}

	/**
	 * Get file view URL with custom dimensions
	 */
	getCustomPreview(
		fileId: string,
		width: number = 800,
		height: number = 600,
		gravity: ImageGravity = ImageGravity.Center,
		quality: number = 90
	): string {
		return storage
			.getFilePreview(this.bucketId, fileId, width, height, gravity, quality)
			.toString();
	}
}

// Export singleton instance
export const appwriteImageService = new AppwriteImageService();
