<script lang="ts">
	import { PUBLIC_AUTH0_DOMAIN, PUBLIC_AUTH0_CLIENT_ID } from '$env/static/public';

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

<div class="branding-page">
	<div class="container">
		<h1>🎨 Fix Auth0 Login Page Branding</h1>

		<div class="current-issue">
			<h2>❌ Current Issue</h2>
			<div class="issue-display">
				<div class="mock-login">
					<div class="auth0-header">
						<div class="auth0-logo">🔐</div>
						<h3>Log in to dev-0liox5crqklfjp87 to continue to CAPA Website.</h3>
					</div>
					<div class="form-placeholder">
						<div class="input-placeholder"></div>
						<div class="input-placeholder"></div>
						<div class="button-placeholder"></div>
					</div>
				</div>
			</div>
			<p class="issue-description">
				Your login page shows the technical Auth0 domain instead of your app name,
				making it look unprofessional and potentially confusing to users.
			</p>
		</div>

		<div class="solution-section">
			<h2>✨ Solution: Update Application Settings</h2>

			<div class="step">
				<div class="step-number">1</div>
				<div class="step-content">
					<h3>Open Your Auth0 Application Settings</h3>
					<a
						href="https://manage.auth0.com/dashboard/us/dev-0liox5crqklfjp87/applications/{PUBLIC_AUTH0_CLIENT_ID}/settings"
						target="_blank"
						rel="noopener noreferrer"
						class="direct-link">
						🔗 Open Auth0 Application Settings
					</a>
				</div>
			</div>

			<div class="step">
				<div class="step-number">2</div>
				<div class="step-content">
					<h3>Update Basic Information</h3>
					<p>In the "Basic Information" section, update these fields:</p>

					<div class="field-update">
						<label>Name:</label>
						<div class="copy-field">
							<button onclick={() => copyToClipboard('CAPA Website')}>Copy</button>
							<code>CAPA Website</code>
						</div>
					</div>

					<div class="field-update">
						<label>Description:</label>
						<div class="copy-field">
							<button onclick={() => copyToClipboard('California Aviation Photography Alliance - Community platform for aviation photographers')}>Copy</button>
							<code>California Aviation Photography Alliance - Community platform for aviation photographers</code>
						</div>
					</div>

					<div class="field-update">
						<label>Logo URL (optional):</label>
						<div class="copy-field">
							<button onclick={() => copyToClipboard('https://your-domain.com/capa-logo.png')}>Copy</button>
							<code>https://your-domain.com/capa-logo.png</code>
						</div>
						<small>Replace with your actual logo URL when you have one</small>
					</div>
				</div>
			</div>

			<div class="step">
				<div class="step-number">3</div>
				<div class="step-content">
					<h3>Configure Tenant Branding (Optional)</h3>
					<p>For even better branding, go to:</p>
					<a
						href="https://manage.auth0.com/dashboard/us/dev-0liox5crqklfjp87/branding"
						target="_blank"
						rel="noopener noreferrer"
						class="branding-link">
						🎨 Tenant Branding Settings
					</a>

					<div class="branding-options">
						<div class="branding-item">
							<strong>Logo URL:</strong> Upload your CAPA logo
						</div>
						<div class="branding-item">
							<strong>Primary Color:</strong>
							<div class="color-option">
								<button onclick={() => copyToClipboard('#bc3011')}>Copy</button>
								<span class="color-swatch" style="background: #bc3011;"></span>
								<code>#bc3011</code> (CAPA Red)
							</div>
						</div>
						<div class="branding-item">
							<strong>Page Background:</strong>
							<div class="color-option">
								<button onclick={() => copyToClipboard('#00040a')}>Copy</button>
								<span class="color-swatch" style="background: #00040a;"></span>
								<code>#00040a</code> (CAPA Black)
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="step">
				<div class="step-number">4</div>
				<div class="step-content">
					<h3>Save Changes</h3>
					<p>Click "Save Changes" in both sections and wait for the updates to take effect.</p>
				</div>
			</div>
		</div>

		<div class="result-section">
			<h2>🎉 Expected Result</h2>
			<div class="result-display">
				<div class="mock-login improved">
					<div class="auth0-header">
						<div class="capa-logo">📸</div>
						<h3>Log in to CAPA Website</h3>
					</div>
					<div class="form-placeholder">
						<div class="input-placeholder"></div>
						<div class="input-placeholder"></div>
						<div class="button-placeholder capa-styled"></div>
					</div>
				</div>
			</div>
			<p class="result-description">
				Your login page will now show "Log in to CAPA Website" with your custom branding,
				making it look professional and trustworthy.
			</p>
		</div>

		<div class="additional-tips">
			<h2>💡 Additional Branding Tips</h2>
			<div class="tips-grid">
				<div class="tip">
					<h4>🖼️ Logo Requirements</h4>
					<ul>
						<li>Format: PNG or SVG</li>
						<li>Size: 150x150px recommended</li>
						<li>Background: Transparent</li>
						<li>Hosted online (accessible URL)</li>
					</ul>
				</div>
				<div class="tip">
					<h4>🎨 Color Scheme</h4>
					<ul>
						<li>Primary: #bc3011 (CAPA Red)</li>
						<li>Secondary: #df4614 (CAPA Orange)</li>
						<li>Background: #00040a (CAPA Black)</li>
						<li>Text: #f4faff (CAPA White)</li>
					</ul>
				</div>
				<div class="tip">
					<h4>📝 Custom Text</h4>
					<ul>
						<li>Login prompt text</li>
						<li>Password reset text</li>
						<li>Error messages</li>
						<li>Terms and privacy links</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="test-section">
			<h2>🧪 Test Your Changes</h2>
			<p>After making changes, test your new login experience:</p>
			<div class="test-buttons">
				<a href="/auth-test" class="test-btn">🔍 Test Login Flow</a>
				<a href="/" class="home-btn">🏠 Back to Home</a>
			</div>
		</div>
	</div>
</div>

<style>
	.branding-page {
		padding-top: 70px;
		min-height: 100vh;
		background: var(--color-capa-black);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
	}

	.container {
		max-width: 1000px;
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
		margin-bottom: 1.5rem;
		font-size: 1.8rem;
		border-bottom: 2px solid var(--color-capa-red);
		padding-bottom: 0.5rem;
	}

	.current-issue {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.issue-display {
		display: flex;
		justify-content: center;
		margin: 1.5rem 0;
	}

	.mock-login {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		max-width: 400px;
		width: 100%;
	}

	.auth0-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.auth0-logo, .capa-logo {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.auth0-header h3 {
		color: #333;
		margin: 0;
		font-size: 1.1rem;
		line-height: 1.4;
	}

	.form-placeholder {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-placeholder {
		height: 40px;
		background: #f5f5f5;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.button-placeholder {
		height: 40px;
		background: #007bff;
		border-radius: 4px;
	}

	.button-placeholder.capa-styled {
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
	}

	.issue-description, .result-description {
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
		margin-top: 1rem;
	}

	.solution-section {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.step {
		display: flex;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 1.5rem;
	}

	.step-number {
		background: var(--color-capa-red);
		color: white;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 1.2rem;
		flex-shrink: 0;
	}

	.step-content {
		flex: 1;
	}

	.step-content h3 {
		margin: 0 0 1rem 0;
		color: var(--color-capa-orange);
		font-size: 1.3rem;
	}

	.direct-link, .branding-link {
		display: inline-block;
		background: linear-gradient(135deg, var(--color-capa-red), var(--color-capa-orange));
		color: white;
		padding: 0.75rem 1.5rem;
		text-decoration: none;
		border-radius: 6px;
		font-weight: bold;
		margin: 0.5rem 0;
		transition: transform 0.2s ease;
	}

	.direct-link:hover, .branding-link:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.field-update {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.field-update label {
		display: block;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: var(--color-capa-yellow);
	}

	.copy-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.copy-field button {
		background: var(--color-capa-orange);
		color: white;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.copy-field code {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.5rem;
		border-radius: 4px;
		font-family: monospace;
		border: 1px solid rgba(255, 255, 255, 0.2);
		flex: 1;
	}

	.copy-field small {
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
	}

	.branding-options {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 6px;
	}

	.branding-item {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.branding-item:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.color-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.color-swatch {
		width: 30px;
		height: 30px;
		border-radius: 4px;
		border: 2px solid rgba(255, 255, 255, 0.3);
	}

	.result-section {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.result-display {
		display: flex;
		justify-content: center;
		margin: 1.5rem 0;
	}

	.mock-login.improved .auth0-header h3 {
		color: #333;
	}

	.additional-tips {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.tips-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.tip {
		background: rgba(255, 255, 255, 0.03);
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.tip h4 {
		margin: 0 0 1rem 0;
		color: var(--color-capa-orange);
		font-size: 1.1rem;
	}

	.tip ul {
		margin: 0;
		padding-left: 1.5rem;
		line-height: 1.6;
	}

	.tip li {
		margin-bottom: 0.5rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.test-section {
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
	}

	.test-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.test-btn, .home-btn {
		padding: 1rem 1.5rem;
		text-decoration: none;
		border-radius: 8px;
		font-weight: bold;
		transition: transform 0.2s ease;
	}

	.test-btn {
		background: var(--color-capa-orange);
		color: white;
	}

	.home-btn {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.test-btn:hover, .home-btn:hover {
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		h1 {
			font-size: 2rem;
		}

		.step {
			flex-direction: column;
			align-items: flex-start;
		}

		.copy-field {
			flex-direction: column;
			align-items: stretch;
		}

		.color-option {
			flex-wrap: wrap;
		}

		.test-buttons {
			flex-direction: column;
		}

		.tips-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
