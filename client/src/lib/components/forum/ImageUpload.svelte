<script lang="ts">
	import { proxyCatboxService } from '$lib/services/proxyCatboxService';
	import type { UploadedImage } from '$lib/services/proxyCatboxService';
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	export let multiple = false;
	export let maxImages = 5;
	export let showThumbnails = true;
	export let autoResize = true;
	export let compact = false;

	const dispatch = createEventDispatcher<{
		imagesUploaded: UploadedImage[];
		imageRemoved: UploadedImage;
		error: string;
	}>();

	let uploading = false;
	let uploadedImages: UploadedImage[] = [];
	let dragActive = false;
	let fileInput: HTMLInputElement;
	let uploadProgress = new Map<string, number>();

	// Expose uploaded images to parent
	export const getUploadedImages = () => uploadedImages;
	export const clearImages = () => {
		uploadedImages = [];
		dispatch('imagesUploaded', uploadedImages);
	};

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		if (files.length > 0) {
			uploadFiles(files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;

		const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
			file.type.startsWith('image/')
		);

		if (files.length > 0) {
			uploadFiles(files);
		}
	}

	async function uploadFiles(files: File[]) {
		if (uploading) return;

		// Check limits
		if (!multiple && files.length > 1) {
			dispatch('error', 'Only one image allowed');
			return;
		}

		if (uploadedImages.length + files.length > maxImages) {
			dispatch('error', `Maximum ${maxImages} images allowed`);
			return;
		}

		uploading = true;
		const successfulUploads: UploadedImage[] = [];

		try {
			for (const file of files) {
				const fileId = `${file.name}-${Date.now()}`;
				uploadProgress.set(fileId, 0);

				try {
					// Optionally resize image
					const fileToUpload = autoResize ? await proxyCatboxService.resizeImage(file) : file;

					// Simulate progress for UI feedback
					const progressInterval = setInterval(() => {
						const current = uploadProgress.get(fileId) || 0;
						if (current < 90) {
							uploadProgress.set(fileId, current + 10);
							uploadProgress = new Map(uploadProgress);
						}
					}, 200);

					const uploadedImage = await proxyCatboxService.uploadImage(fileToUpload);

					// Clear interval and show completion
					clearInterval(progressInterval);
					uploadProgress.set(fileId, 100);
					uploadProgress = new Map(uploadProgress);

					// Brief delay to show completion, then remove progress
					setTimeout(() => {
						uploadProgress.delete(fileId);
						uploadProgress = new Map(uploadProgress);
					}, 500);

					successfulUploads.push(uploadedImage);
				} catch (error) {
					uploadProgress.delete(fileId);
					uploadProgress = new Map(uploadProgress);
					throw new Error(`Failed to upload ${file.name}: ${error}`);
				}
			}

			uploadedImages = [...uploadedImages, ...successfulUploads];
			dispatch('imagesUploaded', uploadedImages);
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Upload failed');
		} finally {
			uploading = false;
			if (fileInput) {
				fileInput.value = '';
			}
		}
	}

	async function removeImage(image: UploadedImage) {
		try {
			// Try to delete from Catbox (not supported for anonymous uploads)
			if (image.deleteHash) {
				await proxyCatboxService.deleteImage(image.deleteHash).catch(() => {
					// Ignore deletion errors - image will still be removed from UI
				});
			}

			uploadedImages = uploadedImages.filter((img) => img.id !== image.id);
			dispatch('imageRemoved', image);
			dispatch('imagesUploaded', uploadedImages);
		} catch (error) {
			dispatch(
				'error',
				`Failed to remove image: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	function triggerFileSelect() {
		fileInput?.click();
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function createThumbnail(image: UploadedImage): string {
		return proxyCatboxService.createThumbnailUrl(image.url, compact ? 's' : 'm');
	}
</script>

<div class="image-upload" class:compact>
	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		{multiple}
		onchange={handleFileSelect}
		style="display: none;"
	/>

	<!-- Upload Zone -->
	{#if uploadedImages.length < maxImages}
		<div
			class="upload-zone"
			class:active={dragActive}
			class:uploading
			onclick={triggerFileSelect}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && triggerFileSelect()}
		>
			{#if uploading}
				<div class="upload-status" in:fade>
					<div class="spinner"></div>
					<p>Uploading...</p>
				</div>
			{:else}
				<div class="upload-prompt" in:fade>
					<span class="material-icons">cloud_upload</span>
					<p>
						{compact ? 'Add Image' : 'Click or drag images here'}
					</p>
					{#if !compact}
						<small>
							{multiple ? `Up to ${maxImages} images` : 'Single image only'} • Max 200MB each
						</small>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Upload Progress -->
	{#if uploadProgress.size > 0}
		<div class="progress-section" in:fly={{ y: 20, duration: 300 }}>
			{#each Array.from(uploadProgress.entries()) as [fileId, progress] (fileId)}
				<div class="progress-item" in:fly={{ y: 10, duration: 200 }}>
					<div class="progress-bar">
						<div class="progress-fill" style="width: {progress}%"></div>
					</div>
					<span class="progress-text">{progress}%</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Uploaded Images -->
	{#if showThumbnails && uploadedImages.length > 0}
		<div class="thumbnails" class:compact>
			{#each uploadedImages as image, index (image.id)}
				<div class="thumbnail" in:fly={{ y: 20, duration: 300, delay: index * 50 }}>
					<img src={createThumbnail(image)} alt={image.filename} loading="lazy" />
					<div class="thumbnail-overlay">
						<div class="thumbnail-info">
							<span class="filename">{image.filename}</span>
							<span class="filesize">{formatFileSize(image.size)}</span>
							{#if image.width && image.height}
								<span class="dimensions">{image.width}×{image.height}</span>
							{/if}
						</div>
						<div class="thumbnail-actions">
							<button
								onclick={() => window.open(image.url, '_blank')}
								class="action-btn view-btn"
								title="View full size"
							>
								<span class="material-icons">open_in_new</span>
							</button>
							<button
								onclick={() => removeImage(image)}
								class="action-btn remove-btn"
								title="Remove image"
							>
								<span class="material-icons">delete</span>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Image List (non-thumbnail mode) -->
	{#if !showThumbnails && uploadedImages.length > 0}
		<div class="image-list">
			{#each uploadedImages as image, index (image.id)}
				<div class="image-item" in:fly={{ x: 20, duration: 300, delay: index * 50 }}>
					<span class="material-icons">image</span>
					<div class="image-details">
						<span class="filename">{image.filename}</span>
						<span class="metadata">
							{formatFileSize(image.size)}
							{#if image.width && image.height}
								• {image.width}×{image.height}
							{/if}
						</span>
					</div>
					<div class="image-actions">
						<button
							onclick={() => window.open(image.url, '_blank')}
							class="action-btn"
							title="View image"
						>
							<span class="material-icons">open_in_new</span>
						</button>
						<button onclick={() => removeImage(image)} class="action-btn remove-btn" title="Remove">
							<span class="material-icons">delete</span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.image-upload {
		font-family: 'eurostile', sans-serif;
		color: var(--color-capa-white);
	}

	.upload-zone {
		border: 2px dashed rgba(255, 255, 255, 0.3);
		border-radius: 10px;
		padding: 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		background: rgba(0, 0, 0, 0.3);
		margin-bottom: 1rem;
	}

	.image-upload.compact .upload-zone {
		padding: 1rem;
		border-radius: 6px;
	}

	.upload-zone:hover,
	.upload-zone.active {
		border-color: var(--color-capa-orange);
		background: rgba(188, 48, 17, 0.1);
	}

	.upload-zone.uploading {
		border-color: var(--color-capa-yellow);
		background: rgba(251, 147, 31, 0.1);
		cursor: wait;
	}

	.upload-prompt .material-icons {
		font-size: 3rem;
		color: var(--color-capa-orange);
		margin-bottom: 0.5rem;
	}

	.image-upload.compact .upload-prompt .material-icons {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.upload-prompt p {
		margin: 0 0 0.5rem 0;
		font-weight: bold;
		font-size: 1.1rem;
	}

	.image-upload.compact .upload-prompt p {
		font-size: 0.9rem;
		margin: 0;
	}

	.upload-prompt small {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.85rem;
	}

	.upload-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top: 3px solid var(--color-capa-orange);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.progress-section {
		margin: 1rem 0;
	}

	.progress-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.progress-bar {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-capa-orange), var(--color-capa-yellow));
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		min-width: 35px;
	}

	.thumbnails {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.thumbnails.compact {
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.5rem;
	}

	.thumbnail {
		position: relative;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumbnail-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.8) 0%,
			rgba(0, 0, 0, 0.3) 50%,
			rgba(0, 0, 0, 0) 100%
		);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 0.5rem;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.thumbnail:hover .thumbnail-overlay {
		opacity: 1;
	}

	.thumbnail-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: auto;
	}

	.thumbnail-info span {
		font-size: 0.75rem;
		color: var(--color-capa-white);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
	}

	.filename {
		font-weight: bold;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.thumbnail-actions {
		display: flex;
		gap: 0.25rem;
		align-self: flex-end;
	}

	.action-btn {
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--color-capa-white);
		padding: 0.25rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn .material-icons {
		font-size: 1rem;
	}

	.action-btn:hover {
		background: rgba(0, 0, 0, 0.9);
		border-color: var(--color-capa-orange);
	}

	.remove-btn:hover {
		background: rgba(255, 107, 157, 0.2);
		border-color: #ff6b9d;
		color: #ff6b9d;
	}

	.image-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.image-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}

	.image-item .material-icons {
		color: var(--color-capa-orange);
		font-size: 1.5rem;
	}

	.image-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.image-details .filename {
		font-weight: bold;
		color: var(--color-capa-white);
	}

	.metadata {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.image-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.thumbnails {
			grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		}

		.thumbnails.compact {
			grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
		}

		.upload-zone {
			padding: 1.5rem;
		}

		.image-upload.compact .upload-zone {
			padding: 0.75rem;
		}
	}
</style>
