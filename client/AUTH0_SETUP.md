# Auth0 Setup Instructions

This guide will walk you through setting up Auth0 authentication for the CAPA Website.

## Prerequisites

- An Auth0 account (sign up at [auth0.com](https://auth0.com))
- Admin access to your Auth0 dashboard

## Step 1: Create an Auth0 Application

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com)
2. Click on "Applications" in the left sidebar
3. Click "Create Application"
4. Choose a name for your application (e.g., "CAPA Website")
5. Select "Single Page Web Applications" as the application type
6. Click "Create"

## Step 2: Configure Application Settings

In your application settings, configure the following:

### Allowed Callback URLs
```
http://localhost:5173,
https://your-production-domain.com
```

### Allowed Logout URLs
```
http://localhost:5173,
https://your-production-domain.com
```

### Allowed Web Origins
```
http://localhost:5173,
https://your-production-domain.com
```

### Allowed Origins (CORS)
```
http://localhost:5173,
https://your-production-domain.com
```

**Note:** Replace `https://your-production-domain.com` with your actual production domain.

## Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Auth0 credentials in the `.env` file:
   ```env
   PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
   PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
   ```

You can find these values in your Auth0 application settings:
- **Domain**: Found in the "Basic Information" section
- **Client ID**: Found in the "Basic Information" section

## Step 4: Optional - Customize Login Experience

### Social Connections
1. Go to "Authentication" > "Social" in your Auth0 dashboard
2. Enable desired social providers (Google, GitHub, etc.)
3. Configure each provider with your app credentials

### Branding
1. Go to "Branding" in your Auth0 dashboard
2. Upload your logo and customize colors
3. Customize the login page template if needed

### Rules/Actions (Advanced)
You can create custom rules or actions to:
- Add custom claims to tokens
- Integrate with external APIs
- Implement custom authorization logic

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173`
3. Click the "Sign In" button
4. You should be redirected to Auth0's login page
5. After successful authentication, you'll be redirected back to your app

## Security Best Practices

1. **Never commit your `.env` file** - It's already in `.gitignore`
2. **Use different Auth0 applications** for development and production
3. **Enable MFA** in your Auth0 dashboard for enhanced security
4. **Regularly review your Auth0 logs** for suspicious activity
5. **Keep your Auth0 SDK updated** to the latest version

## Troubleshooting

### Common Issues

1. **"Invalid Callback URL" Error**
   - Ensure your callback URLs are correctly configured in Auth0
   - Check that the URL matches exactly (including protocol)

2. **CORS Errors**
   - Add your domain to "Allowed Web Origins" in Auth0
   - Ensure "Allowed Origins (CORS)" includes your domain

3. **Authentication Not Working**
   - Verify your environment variables are correct
   - Check the browser console for error messages
   - Ensure your Auth0 application type is "Single Page Application"

4. **User Profile Not Loading**
   - Check that the `openid profile email` scopes are included
   - Verify your Auth0 application has the necessary permissions

### Debug Mode

To enable debug mode, you can modify the auth configuration in `src/lib/auth/config.ts`:

```typescript
export const auth0Config = {
  // ... other config
  debug: true  // Add this line for development
};
```

## Production Deployment

When deploying to production:

1. Create a new Auth0 application for production
2. Update your production environment variables
3. Configure the production URLs in Auth0 settings
4. Test the authentication flow thoroughly

## Support

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Community](https://community.auth0.com)
- [Auth0 Support](https://support.auth0.com)

For CAPA Website specific issues, please create an issue in the project repository.