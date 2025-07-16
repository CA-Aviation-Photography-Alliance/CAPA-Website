# Auth0 Management API Setup Guide

This guide will help you set up Auth0 Management API access so users can edit their nicknames and profiles.

## Prerequisites

You should already have:
- An Auth0 account
- A Single Page Web Application configured in Auth0
- Your current app working with Auth0 authentication

## Step 1: Create a Machine-to-Machine Application

1. Go to your [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications**
3. Click **+ Create Application**
4. Choose a name like "CAPA Website Management API"
5. Select **Machine to Machine Applications**
6. Click **Create**

## Step 2: Authorize the Management API

1. In the application creation flow, you'll be asked which API to authorize
2. Select **Auth0 Management API**
3. Click **Authorize**

## Step 3: Configure Scopes

1. In the scopes section, enable these permissions:
   - `read:users` - to read user profiles
   - `update:users` - to update user profiles
   - `read:user_idp_tokens` - (optional, for social login tokens)

2. Click **Authorize**

## Step 4: Get Your Credentials

1. Go to the **Settings** tab of your new Machine-to-Machine application
2. Copy the following values:
   - **Client ID** (this will be your `AUTH0_MANAGEMENT_CLIENT_ID`)
   - **Client Secret** (this will be your `AUTH0_MANAGEMENT_CLIENT_SECRET`)

## Step 5: Create Environment Variables

1. In your project root (`CAPA-Website/client/`), create a `.env` file:

```env
# Your existing Auth0 config
PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
PUBLIC_AUTH0_CLIENT_ID=your-spa-client-id

# New Management API credentials
AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret
```

2. Replace the values with your actual Auth0 credentials:
   - `PUBLIC_AUTH0_DOMAIN`: Your Auth0 domain (e.g., `dev-12345.us.auth0.com`)
   - `PUBLIC_AUTH0_CLIENT_ID`: Your Single Page Application Client ID
   - `AUTH0_MANAGEMENT_CLIENT_ID`: The Machine-to-Machine app Client ID from Step 4
   - `AUTH0_MANAGEMENT_CLIENT_SECRET`: The Machine-to-Machine app Client Secret from Step 4

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log into your application
3. Look for the "Edit Profile" button in your user profile
4. Try changing your username/nickname
5. Save and verify the changes took effect

## Troubleshooting

### Error: "Insufficient scope"
- Make sure your Machine-to-Machine app has `read:users` and `update:users` scopes enabled
- Re-authorize the Auth0 Management API if needed

### Error: "Access denied"
- Verify your Management API credentials are correct in the `.env` file
- Make sure the `.env` file is in the correct location (`CAPA-Website/client/.env`)

### Error: "Username already taken"
- Auth0 requires unique nicknames across your tenant
- Try a different username

### Error: "Invalid characters in username"
- Usernames can only contain letters, numbers, underscores, and hyphens
- No spaces or special characters allowed

## Security Notes

- Never commit your `.env` file to version control
- Add `.env` to your `.gitignore` file
- Use different credentials for development and production
- The Management API credentials should be kept secure and only used server-side

## Production Deployment

When deploying to production:

1. Create a separate Machine-to-Machine application for production
2. Use production Auth0 domain and credentials
3. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
4. Never hardcode credentials in your source code

## Additional Features

With the Management API set up, you can extend this to:
- Update user email addresses
- Manage user metadata
- Handle user roles and permissions
- Bulk user operations

## Support

If you encounter issues:
1. Check the Auth0 logs in your dashboard
2. Verify API permissions and scopes
3. Test with Auth0's Management API explorer
4. Contact Auth0 support if needed