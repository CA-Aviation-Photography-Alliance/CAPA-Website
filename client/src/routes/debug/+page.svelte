<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/auth/store';
	import { PUBLIC_AUTH0_DOMAIN, PUBLIC_AUTH0_CLIENT_ID } from '$env/static/public';

	let debugInfo = {
		domain: '',
		clientId: '',
		currentUrl: '',
		origin: '',
		protocol: '',
		hostname: '',
		port: '',
		redirectUri: ''
	};

	onMount(() => {
		debugInfo = {
			domain: PUBLIC_AUTH0_DOMAIN,
			clientId: PUBLIC_AUTH0_CLIENT_ID,
			currentUrl: window.location.href,
			origin: window.location.origin,
			protocol: window.location.protocol,
			hostname: window.location.hostname,
			port: window.location.port,
			redirectUri: window.location.origin
		};
	});
</script>

<div class="debug-page">
	<div class="container">
		<h1>Auth0 Debug Information</h1>

		<div class="debug-section">
			<h2>Environment Variables</h2>
			<div class="debug-grid">
				<div class="debug-item">
					<label>Auth0 Domain:</label>
					<span class="value">{debugInfo.domain || 'Not set'}</span>
				</div>
				<div class="debug-item">
					<label>Client ID:</label>
					<span class="value">{debugInfo.clientId || 'Not set'}</span>
				</div>
			</div>
		</div>

		<div class="debug-section">
			<h2>Current URL Information</h2>
			<div class="debug-grid">
				<div class="debug-item">
					<label>Current URL:</label>
					<span class="value">{debugInfo.currentUrl}</span>
				</div>
				<div class="debug-item">
					<label>Origin (Callback URL):</label>
					<span class="value highlight">{debugInfo.origin}</span>
				</div>
				<div class="debug-item">
					<label>Protocol:</label>
					<span class="value">{debugInfo.protocol}</span>
				</div>
				<div class="debug-item">
					<label>Hostname:</label>
					<span class="value">{debugInfo.hostname}</span>
				</div>
				<div class="debug-item">
					<label>Port:</label>
					<span class="value">{debugInfo.port || 'Default'}</span>
				</div>
			</div>
		</div>

		<div class="debug-section">
			<h2>Auth State</h2>
			<div class="debug-grid">
				<div class="debug-item">
					<label>Is Loading:</label>
					<span class="value">{$authStore.isLoading}</span>
				</div>
				<div class="debug-item">
					<label>Is Authenticated:</label>
					<span class="value">{$authStore.isAuthenticated}</span>
				</div>
				<div class="debug-item">
					<label>User:</label>
					<span class="value">{$authStore.user ? 'Logged in' : 'Not logged in'}</span>
				</div>
				<div class="debug-item">
					<label>Error:</label>
					<span class="value error">{$authStore.error || 'None'}</span>
				</div>
			</div>
		</div>

		<div class="instructions">
			<h2>🔧 Fix Instructions</h2>
			<ol>
				<li>
					<strong>Copy this exact URL:</strong>
					<div class="copy-url">{debugInfo.origin}</div>
				</li>
				<li>
					Go to your <a href="https://manage.auth0.com" target="_blank" rel="noopener noreferrer">Auth0 Dashboard</a>
				</li>
				<li>Navigate to Applications → Your CAPA App → Settings</li>
				<li>
					In <strong>"Allowed Callback URLs"</strong>, add the URL above
				</li>
				<li>
					Also add it to:
					<ul>
						<li><strong>Allowed Logout URLs</strong></li>
						<li><strong>Allowed Web Origins</strong></li>
						<li><strong>Allowed Origins (CORS)</strong></li>
					</ul>
				</li>
				<li>Click <strong>"Save Changes"</strong></li>
				<li>Try logging in again</li>
			</ol>
		</div>

		<div class="test-section">
			<h2>🧪 Test Configuration</h2>
			<p>Check your browser console for detailed Auth0 debug information.</p>
			<a href="/" class="back-button">← Back to Home</a>
		</div>
	</div>
</div>

<style>
	.debug-page {
		padding-top: 70px;
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-size: 2.5rem;
	}

	h2 {
		color: var(--color-capa-white);
		margin-bottom: 1rem;
		font-size: 1.5rem;
	}

	.debug-section {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.debug-grid {
		display: grid;
		gap: 1rem;
	}

	.debug-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.debug-item label {
		font-weight: bold;
		color: rgba(255, 255, 255, 0.8);
	}

	.debug-item .value {
		color: var(--color-capa-white);
		word-break: break-all;
		text-align: right;
		max-width: 60%;
	}

	.highlight {
		background: rgba(252, 165, 165, 0.2);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		border: 1px solid rgba(252, 165, 165, 0.3);
		font-weight: bold;
	}

	.error {
		color: #ff6b7a !important;
	}

	.instructions {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.instructions h2 {
		color: #4ade80;
		margin-top: 0;
	}

	.instructions ol {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	.instructions li {
		margin-bottom: 0.75rem;
		line-height: 1.5;
	}

	.instructions ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.copy-url {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.75rem;
		border-radius: 4px;
		font-family: monospace;
		margin: 0.5rem 0;
		border: 1px solid rgba(255, 255, 255, 0.2);
		user-select: all;
		cursor: text;
	}

	.instructions a {
		color: #4ade80;
		text-decoration: underline;
	}

	.test-section {
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
	}

	.test-section h2 {
		color: #60a5fa;
		margin-top: 0;
	}

	.back-button {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-weight: bold;
		transition: all 0.2s ease;
	}

	.back-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		.debug-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.debug-item .value {
			text-align: left;
			max-width: 100%;
		}

		h1 {
			font-size: 2rem;
		}
	}
</style>
