<script lang="ts">
	import { login, register, sendPasswordReset, clearError } from '$lib/auth/store';
	import { authStore } from '$lib/auth/store';
	import { appwriteAuthConfig } from '$lib/auth/config';

	let {
		isOpen = $bindable(false),
		onSuccess = () => {}
	}: {
		isOpen: boolean;
		onSuccess?: () => void;
	} = $props();

	let mode: 'login' | 'register' | 'reset' = $state('login');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let username = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let localError = $state('');
	let successMessage = $state('');

	// Clear form when modal opens/closes
	$effect(() => {
		if (!isOpen) {
			resetForm();
		}
	});

	function resetForm() {
		email = '';
		password = '';
		confirmPassword = '';
		username = '';
		showPassword = false;
		showConfirmPassword = false;
		localError = '';
		successMessage = '';
		mode = 'login';
		clearError();
	}

	function closeModal() {
		isOpen = false;
		resetForm();
	}

	function validateForm(): boolean {
		localError = '';

		if (!email.trim()) {
			localError = 'Email is required';
			return false;
		}

		if (!/\S+@\S+\.\S+/.test(email)) {
			localError = 'Please enter a valid email address';
			return false;
		}

		if (mode === 'reset') {
			return true; // Only email needed for reset
		}

		if (!password.trim()) {
			localError = 'Password is required';
			return false;
		}

		if (password.length < appwriteAuthConfig.passwordRequirements.minLength) {
			localError = `Password must be at least ${appwriteAuthConfig.passwordRequirements.minLength} characters long`;
			return false;
		}

		if (mode === 'register') {
			if (!username.trim()) {
				localError = 'Username is required';
				return false;
			}

			if (password !== confirmPassword) {
				localError = 'Passwords do not match';
				return false;
			}
		}

		return true;
	}

	async function handleLogin() {
		if (!validateForm()) return;

		try {
			await login(email, password);
			successMessage = 'Successfully logged in!';
			setTimeout(() => {
				onSuccess();
				closeModal();
			}, 1000);
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Login failed';
		}
	}

	async function handleRegister() {
		if (!validateForm()) return;

		try {
			await register(email, password, username);
			successMessage = 'Account created successfully! You are now logged in.';
			setTimeout(() => {
				onSuccess();
				closeModal();
			}, 2000);
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Registration failed';
		}
	}

	async function handlePasswordReset() {
		if (!validateForm()) return;

		try {
			await sendPasswordReset(email);
			successMessage = 'Password reset email sent! Check your inbox.';
			setTimeout(() => {
				mode = 'login';
				successMessage = '';
			}, 3000);
		} catch (error) {
			localError = error instanceof Error ? error.message : 'Failed to send reset email';
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (mode === 'login') {
			handleLogin();
		} else if (mode === 'register') {
			handleRegister();
		} else if (mode === 'reset') {
			handlePasswordReset();
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeModal();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Modal Backdrop -->
	<div class="modal-backdrop" on:click={handleBackdropClick} role="presentation">
		<!-- Modal Content -->
		<div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
			<!-- Header -->
			<div class="modal-header">
				<h2 id="modal-title">
					{#if mode === 'login'}
						Sign In
					{:else if mode === 'register'}
						Create Account
					{:else if mode === 'reset'}
						Reset Password
					{/if}
				</h2>
				<button class="close-button" on:click={closeModal} aria-label="Close modal">
					&times;
				</button>
			</div>

			<!-- Content -->
			<div class="modal-body">
				{#if successMessage}
					<div class="success-message">
						{successMessage}
					</div>
				{:else if localError || $authStore.error}
					<div class="error-message">
						{localError || $authStore.error}
					</div>
				{/if}

				<!-- Email/Password Form -->
				<form on:submit={handleSubmit}>
					{#if mode === 'register'}
						<div class="form-group">
							<label for="username">Username</label>
							<input
								id="username"
								type="text"
								bind:value={username}
								placeholder="Enter your username"
								required
								disabled={$authStore.isLoading}
							/>
						</div>
					{/if}

					<div class="form-group">
						<label for="email">Email Address</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="Enter your email"
							required
							disabled={$authStore.isLoading}
						/>
					</div>

					{#if mode !== 'reset'}
						<div class="form-group">
							<label for="password">Password</label>
							<div class="password-input">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									placeholder="Enter your password"
									required
									disabled={$authStore.isLoading}
								/>
								<button
									type="button"
									class="password-toggle"
									on:click={() => (showPassword = !showPassword)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									<span class="material-icons">
										{showPassword ? 'visibility_off' : 'visibility'}
									</span>
								</button>
							</div>
						</div>

						{#if mode === 'register'}
							<div class="form-group">
								<label for="confirmPassword">Confirm Password</label>
								<div class="password-input">
									<input
										id="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										bind:value={confirmPassword}
										placeholder="Confirm your password"
										required
										disabled={$authStore.isLoading}
									/>
									<button
										type="button"
										class="password-toggle"
										on:click={() => (showConfirmPassword = !showConfirmPassword)}
										aria-label={showConfirmPassword
											? 'Hide confirm password'
											: 'Show confirm password'}
									>
										<span class="material-icons">
											{showConfirmPassword ? 'visibility_off' : 'visibility'}
										</span>
									</button>
								</div>
							</div>
						{/if}
					{/if}

					<button type="submit" class="submit-button" disabled={$authStore.isLoading}>
						{#if $authStore.isLoading}
							<span class="spinner"></span>
							Processing...
						{:else if mode === 'login'}
							Sign In
						{:else if mode === 'register'}
							Create Account
						{:else if mode === 'reset'}
							Send Reset Email
						{/if}
					</button>
				</form>

				<!-- Footer Links -->
				<div class="modal-footer">
					{#if mode === 'login'}
						<p>
							Don't have an account?
							<button class="link-button" on:click={() => (mode = 'register')}>Sign up</button>
						</p>
						<p>
							Forgot your password?
							<button class="link-button" on:click={() => (mode = 'reset')}>Reset it</button>
						</p>
					{:else if mode === 'register'}
						<p>
							Already have an account?
							<button class="link-button" on:click={() => (mode = 'login')}>Sign in</button>
						</p>
					{:else if mode === 'reset'}
						<p>
							Remember your password?
							<button class="link-button" on:click={() => (mode = 'login')}>Back to sign in</button>
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		max-width: 400px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e5e5;
	}

	.modal-header h2 {
		margin: 0;
		font-family: 'eurostile', sans-serif;
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--color-capa-red);
	}

	.close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem;
		color: #666;
		border-radius: 4px;
	}

	.close-button:hover {
		background-color: #f5f5f5;
		color: #333;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.success-message,
	.error-message {
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		text-align: center;
	}

	.success-message {
		background-color: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.error-message {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-capa-red);
		box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
	}

	.form-group input:disabled {
		background-color: #f8f9fa;
		opacity: 0.6;
	}

	.password-input {
		position: relative;
	}

	.password-toggle {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		color: #666;
		transition: color 0.2s ease;
	}

	.password-toggle:hover {
		color: var(--color-capa-red);
	}

	.password-toggle .material-icons {
		font-size: 1rem;
	}

	.submit-button {
		width: 100%;
		padding: 0.75rem;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.submit-button:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--color-capa-orange), var(--color-capa-yelorange));
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.modal-footer {
		margin-top: 1.5rem;
		text-align: center;
	}

	.modal-footer p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #666;
	}

	.link-button {
		background: none;
		border: none;
		color: var(--color-capa-red);
		cursor: pointer;
		font-size: inherit;
		text-decoration: underline;
	}

	.link-button:hover {
		color: var(--color-capa-orange);
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
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
</style>
