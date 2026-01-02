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

export class CloudinaryService {
	private readonly cloudName: string;
	private readonly uploadPreset: string;
	private readonly apiUrl: string;
	private readonly maxFileSize = 10 * 1024 * 1024; // 10MB (reasonable limit)
	private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

	constructor() {
		this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
		this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
		this.apiUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

		if (!this.cloudName || !this.uploadPreset) {
			console.warn('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file');
		}
	}

	/**
	 * Upload an image to Cloudinary
	 */
	async uploadImage(file: File): Promise<UploadedImage> {
		if (!browser) {
			throw new Error('Image upload can only be performed in browser environment');
		}

		if (!this.cloudName || !this.uploadPreset) {
			throw new Error('Cloudinary not configured. Please set cloud name and upload preset.');
		}

		// Validate file
		this.validateFile(file);

		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('upload_preset', this.uploadPreset);
			formData.append('folder', 'forum'); // Optional: organize uploads in folders

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

			return {
				id: data.public_id,
				url: data.secure_url,
				deleteHash: data.public_id, // Use public_id for deletion
				width: data.width,
				height: data.height,
				size: data.bytes,
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
	 * Delete an image from Cloudinary (requires API key - use with caution)
	 */
	async deleteImage(publicId?: string): Promise<boolean> {
		// Note: Deletion requires API secret which should not be exposed to frontend
		// This would need to be implemented as a server-side endpoint
		console.warn('Image deletion should be implemented server-side for security');
		return Promise.resolve(false);
	}

	/**
	 * Get image info from Cloudinary
	 */
	async getImageInfo(publicId: string): Promise<{
		exists: boolean;
		id?: string;
		url?: string;
		width?: number;
		height?: number;
		format?: string;
	}> {
		try {
			// Use Cloudinary's info endpoint (no authentication required for basic info)
			const response = await fetch(`https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`, {
				method: 'HEAD'
			});

			return {
				exists: response.ok,
				id: publicId,
				url: response.ok ? `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}` : undefined
			};
		} catch (error) {
			return { exists: false };
		}
	}

	/**
	 * Create a thumbnail URL for an image using Cloudinary transformations
	 */
	createThumbnailUrl(imageUrl: string, size?: 's' | 'm' | 'l' | 'h'): string {
		const publicId = this.extractPublicId(imageUrl);
		if (!publicId) return imageUrl;

		// Define thumbnail transformations
		const transformations = {
			s: 'c_fill,w_150,h_150,q_auto,f_auto',
			m: 'c_fill,w_300,h_300,q_auto,f_auto',
			l: 'c_fill,w_600,h_600,q_auto,f_auto',
			h: 'c_fill,w_1200,h_1200,q_auto,f_auto'
		};

		const transform = transformations[size || 'm'];
		return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transform}/${publicId}`;
	}

	/**
	 * Create optimized URL with custom transformations
	 */
	createOptimizedUrl(imageUrl: string, options?: {
		width?: number;
		height?: number;
		crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb';
		quality?: 'auto' | number;
		format?: 'auto' | 'webp' | 'jpg' | 'png';
	}): string {
		const publicId = this.extractPublicId(imageUrl);
		if (!publicId) return imageUrl;

		const transformParts = [];

		if (options?.crop) transformParts.push(`c_${options.crop}`);
		if (options?.width) transformParts.push(`w_${options.width}`);
		if (options?.height) transformParts.push(`h_${options.height}`);
		if (options?.quality) transformParts.push(`q_${options.quality}`);
		if (options?.format) transformParts.push(`f_${options.format}`);

		const transform = transformParts.length > 0 ? transformParts.join(',') + '/' : '';
		return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transform}${publicId}`;
	}

	/**
	 * Check if a URL is a Cloudinary image
	 */
	isCloudinaryImage(url: string): boolean {
		return url.includes('cloudinary.com') && url.includes('/image/upload/');
	}

	/**
	 * Extract public ID from Cloudinary URL
	 */
	extractPublicId(url: string): string | null {
		// Cloudinary URLs: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
		// or with transformations: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
		const match = url.match(/\/image\/upload\/(?:v\d+\/)?(?:[^/]+\/)*([^/.]+)(?:\.[^.]+)?$/);
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
	 * Get upload rate limits and service info
	 */
	getRateLimits(): {
		uploads: { perHour: number; perDay: number; perMonth: number };
		fileSize: string;
		allowedTypes: string[];
		features: string[];
	} {
		return {
			uploads: {
				perHour: 500, // Cloudinary is quite generous
				perDay: 2000,
				perMonth: 25000 // Based on free tier
			},
			fileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			allowedTypes: this.allowedTypes,
			features: [
				'25GB free storage',
				'25GB free bandwidth/month',
				'Advanced transformations',
				'CDN delivery',
				'Auto-optimization',
				'CORS support',
				'99.9% uptime'
			]
		};
	}

	/**
	 * Check if service is configured
	 */
	isConfigured(): boolean {
		return !!(this.cloudName && this.uploadPreset);
	}

	/**
	 * Get service configuration status
	 */
	getConfigStatus(): {
		configured: boolean;
		cloudName: boolean;
		uploadPreset: boolean;
		missingVars: string[];
	} {
		const missingVars = [];
		if (!this.cloudName) missingVars.push('VITE_CLOUDINARY_CLOUD_NAME');
		if (!this.uploadPreset) missingVars.push('VITE_CLOUDINARY_UPLOAD_PRESET');

		return {
			configured: missingVars.length === 0,
			cloudName: !!this.cloudName,
			uploadPreset: !!this.uploadPreset,
			missingVars
		};
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
		freeTier: {
			storage: string;
			bandwidth: string;
			transformations: string;
		};
	} {
		return {
			name: 'Cloudinary',
			website: 'https://cloudinary.com',
			maxFileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
			supportedFormats: this.allowedTypes,
			features: [
				'Generous free tier',
				'Advanced image transformations',
				'Global CDN',
				'Automatic optimization',
				'CORS enabled',
				'Real-time resizing',
				'Format conversion',
				'Quality optimization'
			],
			freeTier: {
				storage: '25GB',
				bandwidth: '25GB/month',
				transformations: '25,000/month'
			}
		};
	}
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();

// Keep backwards compatibility
export const imgurService = cloudinaryService;
