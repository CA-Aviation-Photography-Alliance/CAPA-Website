# CAPA Website Deployment Guide

This guide covers how to deploy the CAPA Website to production with proper environment configuration.

## Overview

The CAPA Website consists of two main components:
- **Client (Frontend)**: SvelteKit application deployed to Vercel
- **Server (Backend)**: Node.js/Express API server deployed to your server infrastructure

## Environment Configuration

### Production URLs

In production, the application automatically uses these endpoints:

- **Frontend**: `https://capacommunity.net`
- **Backend API**: `https://server.capacommunity.net`
- **Auth0 Redirect**: `https://capacommunity.net` (auto-detected)

### Development URLs

In development, the application uses:

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend API**: `http://localhost:3003` (Express server)
- **Auth0 Redirect**: `http://localhost:5173` (auto-detected)

## Client Deployment (Frontend)

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Auth0 Setup**: Create Auth0 application (see AUTH0_SETUP.md)
3. **Node.js**: v18, v20, or v22 (v24 works locally but use supported version for deployment)

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy from client directory
   cd client
   vercel
   ```

2. **Set Environment Variables**
   
   In your Vercel dashboard, set these environment variables:
   
   ```bash
   # Auth0 Configuration (Required)
   PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
   PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
   
   # Auth0 Management API (Required for profile editing)
   AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
   AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret
   ```

3. **Deployment Settings**
   
   The application is pre-configured with:
   - **Framework**: SvelteKit
   - **Build Command**: `npm run build`
   - **Output Directory**: `.svelte-kit/output`
   - **Node.js Runtime**: 20.x (configured in svelte.config.js)

### Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to your project settings
   - Add `capacommunity.net` as a custom domain
   - Configure DNS records as instructed

2. **Auth0 Configuration Update**
   - Update Auth0 application settings:
   - **Allowed Callback URLs**: `https://capacommunity.net`
   - **Allowed Logout URLs**: `https://capacommunity.net`
   - **Allowed Web Origins**: `https://capacommunity.net`

## Server Deployment (Backend)

### Prerequisites

1. **Server Infrastructure**: VPS or cloud server with Node.js
2. **Domain Setup**: `server.capacommunity.net` pointing to your server
3. **SSL Certificate**: Let's Encrypt or similar for HTTPS

### Server Configuration

1. **Environment Variables**
   
   Create `.env` file on your server:
   ```bash
   # Database
   MONGODB_URI=mongodb://localhost:27017/capa-events
   
   # Server Configuration
   PORT=3003
   NODE_ENV=production
   
   # CORS Configuration
   CORS_ORIGIN=https://capacommunity.net
   
   # Auth0 Configuration (if using auth endpoints)
   AUTH0_DOMAIN=your-auth0-domain.auth0.com
   AUTH0_AUDIENCE=your-api-identifier
   ```

2. **Reverse Proxy Setup (Nginx)**
   
   ```nginx
   server {
       listen 80;
       server_name server.capacommunity.net;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name server.capacommunity.net;
       
       ssl_certificate /path/to/ssl/cert.pem;
       ssl_certificate_key /path/to/ssl/private.key;
       
       location / {
           proxy_pass http://localhost:3003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Process Management (PM2)**
   
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start server
   cd server
   pm2 start server.js --name "capa-api"
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

## API Configuration Details

### Automatic Environment Detection

The client automatically detects the environment and uses appropriate endpoints:

```typescript
// In production (import.meta.env.PROD === true)
const apiUrl = 'https://server.capacommunity.net';

// In development
const apiUrl = 'http://localhost:3003';

// Custom override (any environment)
const apiUrl = import.meta.env.VITE_API_URL || fallback;
```

### Manual Override

To use a different API endpoint, set the `VITE_API_URL` environment variable:

```bash
# For development testing against production API
VITE_API_URL=https://server.capacommunity.net

# For development testing against staging API
VITE_API_URL=https://staging-server.capacommunity.net
```

## Health Checks

### Client Health Check

Visit `https://capacommunity.net` and verify:
- ✅ Page loads without errors
- ✅ Navigation works
- ✅ Map displays (if API is running)
- ✅ Auth0 login works (if configured)

### Server Health Check

```bash
# Basic health check
curl https://server.capacommunity.net/health

# API endpoints check
curl https://server.capacommunity.net/api/simple-events
curl https://server.capacommunity.net/api/airports
```

## Troubleshooting

### Common Issues

1. **"Failed to fetch" errors**
   - Check if server is running
   - Verify CORS configuration
   - Check SSL certificate validity

2. **Auth0 errors**
   - Verify environment variables are set
   - Check Auth0 application configuration
   - Ensure callback URLs match exactly

3. **Build failures**
   - Check Node.js version compatibility
   - Verify all environment variables are set
   - Review build logs for specific errors

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

This will log API configuration details to the browser console.

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to git
   - Use Vercel environment variables for client secrets
   - Use proper server environment management for backend secrets

2. **CORS Configuration**
   - Ensure CORS is properly configured on the server
   - Only allow trusted origins

3. **SSL/TLS**
   - Always use HTTPS in production
   - Keep SSL certificates updated

## Monitoring

### Recommended Monitoring

1. **Uptime Monitoring**
   - Monitor `https://capacommunity.net`
   - Monitor `https://server.capacommunity.net/health`

2. **Error Tracking**
   - Set up Sentry or similar for client-side errors
   - Monitor server logs for API errors

3. **Performance Monitoring**
   - Use Vercel Analytics for client performance
   - Monitor server resource usage

## Backup and Recovery

1. **Database Backups**
   - Regular MongoDB backups
   - Test restore procedures

2. **Code Deployment**
   - Use Git tags for releases
   - Maintain rollback procedures

3. **Environment Configuration**
   - Document all environment variables
   - Maintain backup of configuration files

---

For detailed Auth0 setup instructions, see [AUTH0_SETUP.md](./AUTH0_SETUP.md).

For development setup, see [README.md](./README.md).