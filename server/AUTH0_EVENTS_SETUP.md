# Auth0 Setup Guide for Events API

This guide will help you integrate Auth0 authentication with your Events API, enabling secure user-based event management.

## Overview

Your Events API now has two authentication approaches:
1. **Simple Events API** (`/api/simple-events`) - Basic creator name protection
2. **Auth0 Events API** (`/api/auth-events`) - Full JWT authentication with Auth0

## Prerequisites

- Auth0 account (free tier works fine)
- Your CAPA Website project
- MongoDB running locally

## Step 1: Set Up Auth0 Application

### 1.1 Create Auth0 Account
1. Go to [Auth0.com](https://auth0.com) and sign up
2. Create a new tenant (e.g., "capa-events")

### 1.2 Create Single Page Application
1. In Auth0 Dashboard, go to **Applications**
2. Click **+ Create Application**
3. Name it "CAPA Events Frontend"
4. Choose **Single Page Web Applications**
5. Select **React** (or your framework)
6. Click **Create**

### 1.3 Configure Application Settings
1. Go to **Settings** tab
2. Note down:
   - **Domain** (e.g., `dev-12345.us.auth0.com`)
   - **Client ID**
3. Set **Allowed Callback URLs**:
   ```
   http://localhost:3000, http://localhost:3000/callback
   ```
4. Set **Allowed Logout URLs**:
   ```
   http://localhost:3000
   ```
5. Set **Allowed Web Origins**:
   ```
   http://localhost:3000
   ```
6. Click **Save Changes**

## Step 2: Create API in Auth0

### 2.1 Create API
1. Go to **APIs** in Auth0 Dashboard
2. Click **+ Create API**
3. Name: "CAPA Events API"
4. Identifier: `https://capa-events-api` (this becomes your audience)
5. Signing Algorithm: **RS256**
6. Click **Create**

### 2.2 Configure API Settings (Optional)
1. Go to **Settings** tab of your API
2. Enable **Allow Offline Access** if you need refresh tokens
3. Set **Token Expiration** (default 24 hours is fine)

## Step 3: Configure Server Environment

### 3.1 Update .env File
1. Copy the example configuration:
   ```bash
   cp .env.auth0-example .env
   ```

2. Edit `.env` with your Auth0 settings:
   ```env
   # MongoDB Configuration (Local)
   MONGODB_URI=mongodb://localhost:27017/capa-events
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Auth0 Configuration
   AUTH0_DOMAIN=dev-12345.us.auth0.com
   AUTH0_AUDIENCE=https://capa-events-api
   AUTH0_CLIENT_ID=your-spa-client-id
   AUTH0_CLIENT_SECRET=your-spa-client-secret
   
   # Development Settings
   AUTH_BYPASS=false
   ```

3. Replace the values:
   - `AUTH0_DOMAIN`: Your Auth0 domain from Step 1.3
   - `AUTH0_AUDIENCE`: Your API identifier from Step 2.1
   - `AUTH0_CLIENT_ID`: Your SPA Client ID from Step 1.3
   - `AUTH0_CLIENT_SECRET`: Your SPA Client Secret (if needed)

## Step 4: Test Server Setup

### 4.1 Start the Server
```bash
cd server
npm install  # Install Auth0 dependencies if not done
npm start
```

### 4.2 Test Endpoints
```bash
# Test public endpoint (should work)
curl http://localhost:3001/api/auth-events

# Test protected endpoint (should fail)
curl http://localhost:3001/api/auth-events/my
```

### 4.3 Run Test Suite
```bash
node test-auth0-api.js
```

## Step 5: Frontend Integration

### 5.1 Install Auth0 SDK
```bash
cd client  # Your frontend directory
npm install @auth0/auth0-react
```

### 5.2 Configure Auth0 Provider
Create or update your main App component:

```jsx
import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <Auth0Provider
      domain="dev-12345.us.auth0.com"
      clientId="your-spa-client-id"
      audience="https://capa-events-api"
      redirectUri={window.location.origin}
      scope="openid profile email"
    >
      <BrowserRouter>
        {/* Your app components */}
      </BrowserRouter>
    </Auth0Provider>
  );
}

export default App;
```

### 5.3 Create Login/Logout Components
```jsx
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginButton = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    return null;
  }

  return (
    <button onClick={() => loginWithRedirect()}>
      Log In
    </button>
  );
};

const LogoutButton = () => {
  const { logout, isAuthenticated } = useAuth0();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button onClick={() => logout({ returnTo: window.location.origin })}>
      Log Out
    </button>
  );
};

const UserProfile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <img src={user.picture} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};

export { LoginButton, LogoutButton, UserProfile };
```

### 5.4 Create Events Service
```jsx
import { useAuth0 } from '@auth0/auth0-react';

const useEventsAPI = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const apiCall = async (endpoint, options = {}) => {
    const url = `http://localhost:3001/api/auth-events${endpoint}`;
    
    let headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add token for protected endpoints
    if (isAuthenticated && options.requireAuth !== false) {
      try {
        const token = await getAccessTokenSilently();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting token:', error);
        throw error;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  };

  const eventsAPI = {
    // Public endpoints
    getAllEvents: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`?${queryString}`, { requireAuth: false });
    },

    getEvent: (id) => {
      return apiCall(`/${id}`, { requireAuth: false });
    },

    getUpcomingEvents: (limit = 10) => {
      return apiCall(`/upcoming?limit=${limit}`, { requireAuth: false });
    },

    // Protected endpoints
    getMyEvents: () => {
      return apiCall('/my');
    },

    createEvent: (eventData) => {
      return apiCall('', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
    },

    updateEvent: (id, eventData) => {
      return apiCall(`/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(eventData)
      });
    },

    deleteEvent: (id) => {
      return apiCall(`/${id}`, {
        method: 'DELETE'
      });
    },

    getStats: () => {
      return apiCall('/stats');
    }
  };

  return eventsAPI;
};

export default useEventsAPI;
```

### 5.5 Example Event Component
```jsx
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import useEventsAPI from './useEventsAPI';

const EventsList = () => {
  const { isAuthenticated, user } = useAuth0();
  const eventsAPI = useEventsAPI();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMyEvents, setShowMyEvents] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = showMyEvents 
          ? await eventsAPI.getMyEvents()
          : await eventsAPI.getAllEvents();
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [showMyEvents]);

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsAPI.deleteEvent(eventId);
        setEvents(events.filter(event => event._id !== eventId));
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
      }
    }
  };

  if (loading) return <div>Loading events...</div>;

  return (
    <div>
      <h2>Events</h2>
      
      {isAuthenticated && (
        <div>
          <button onClick={() => setShowMyEvents(!showMyEvents)}>
            {showMyEvents ? 'Show All Events' : 'Show My Events'}
          </button>
        </div>
      )}

      <div>
        {events.map(event => (
          <div key={event._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
            <h3>{event.title}</h3>
            <p><strong>Type:</strong> {event.type}</p>
            <p><strong>Start:</strong> {new Date(event.startdate).toLocaleString()}</p>
            <p><strong>Creator:</strong> {event.creator.name}</p>
            <p>{event.description}</p>
            
            {isAuthenticated && user.sub === event.creator.userId && (
              <div>
                <button onClick={() => handleDelete(event._id)}>
                  Delete
                </button>
                <button>Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsList;
```

## Step 6: API Endpoints Reference

### Public Endpoints (No Auth Required)
```
GET    /api/auth-events              - Get all events
GET    /api/auth-events/:id          - Get specific event
GET    /api/auth-events/upcoming     - Get upcoming events
GET    /api/auth-events/by-type/:type - Get events by type
GET    /api/auth-events/stats        - Get statistics
```

### Protected Endpoints (Auth Required)
```
POST   /api/auth-events              - Create event
GET    /api/auth-events/my           - Get my events
PUT    /api/auth-events/:id          - Update event (full)
PATCH  /api/auth-events/:id          - Update event (partial)
DELETE /api/auth-events/:id          - Delete event
```

### Admin Endpoints (Admin Role Required)
```
DELETE /api/auth-events/admin/:id    - Admin delete any event
```

## Step 7: Testing & Debugging

### 7.1 Test Authentication Flow
1. Start your frontend and backend
2. Navigate to your app
3. Click "Log In" button
4. Complete Auth0 login
5. Try creating an event
6. Verify ownership by trying to edit/delete

### 7.2 Debug Common Issues

**"Invalid audience" error:**
- Check `AUTH0_AUDIENCE` matches your API identifier exactly

**"Invalid token" error:**
- Verify `AUTH0_DOMAIN` is correct
- Check token expiration
- Ensure frontend and backend use same audience

**"CORS" errors:**
- Add your frontend URL to Auth0 allowed origins
- Check server CORS configuration

**"Insufficient scope" errors:**
- Verify token includes required scopes
- Check API permissions in Auth0

### 7.3 View JWT Token
Use [jwt.io](https://jwt.io) to decode and inspect your tokens for debugging.

## Step 8: Production Deployment

### 8.1 Auth0 Production Setup
1. Create production Auth0 tenant
2. Set production URLs in Auth0 settings
3. Use environment variables for all Auth0 config
4. Enable proper CORS for production domains

### 8.2 Security Best Practices
1. Never expose Auth0 Client Secret in frontend
2. Use HTTPS in production
3. Set appropriate token expiration times
4. Enable brute force protection in Auth0
5. Configure proper logout URLs
6. Use Auth0 Rules for custom claims if needed

### 8.3 Environment Variables for Production
```env
AUTH0_DOMAIN=production-domain.auth0.com
AUTH0_AUDIENCE=https://your-production-api
AUTH0_CLIENT_ID=production-client-id
NODE_ENV=production
```

## Step 9: Advanced Features

### 9.1 Add Custom Claims
Create Auth0 Rules to add custom claims (like roles):

```javascript
function addRolesToToken(user, context, callback) {
  const assignedRoles = (context.authorization || {}).roles;
  const idTokenClaims = context.idToken || {};
  const accessTokenClaims = context.accessToken || {};

  idTokenClaims['https://capa-events.com/roles'] = assignedRoles;
  accessTokenClaims['https://capa-events.com/roles'] = assignedRoles;

  context.idToken = idTokenClaims;
  context.accessToken = accessTokenClaims;

  callback(null, user, context);
}
```

### 9.2 Admin Role Management
1. Go to **User Management > Roles** in Auth0
2. Create "admin" role
3. Assign to specific users
4. Use `requireAdmin` middleware in your routes

### 9.3 Social Login
1. Go to **Authentication > Social** in Auth0
2. Enable providers (Google, Facebook, etc.)
3. Configure with your app credentials

## Troubleshooting

### Common Error Messages

**"jwt malformed"**
- Token format is incorrect
- Check Authorization header format: `Bearer <token>`

**"jwt audience invalid"**
- Audience mismatch between frontend and backend
- Verify AUTH0_AUDIENCE environment variable

**"insufficient_scope"**
- Token doesn't have required permissions
- Check scope in frontend Auth0Provider

**"Access denied"**
- User doesn't own the resource
- Verify user ID in token matches event creator

### Getting Help

1. Check Auth0 logs in dashboard
2. Use browser developer tools to inspect network requests
3. Verify environment variables are loaded correctly
4. Test with Auth0's debugger extension

## Migration from Simple Events

To migrate existing simple events to Auth0 events:

1. Keep both APIs running during transition
2. Create a migration script to convert creator names to user IDs
3. Update frontend to use new Auth0 endpoints
4. Deprecate simple events API when ready

Your Auth0 integration is now complete! Users can securely create, edit, and delete their own events with proper authentication and authorization.