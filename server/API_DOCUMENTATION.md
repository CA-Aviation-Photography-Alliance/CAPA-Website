# Events API Documentation

This document describes the Events API endpoints for the CAPA Website server. The API allows you to create, read, update, and delete events stored in MongoDB Atlas.

## API Versions

There are two event APIs available:

1. **Complex Events API** (`/api/events`) - Full-featured events with location, organizer, pricing, etc.
2. **Simple Events API** (`/api/simple-events`) - Simplified events with basic fields only

---

# Complex Events API

## Base URL

```
http://localhost:3003/api/events
```

## Authentication

Currently, no authentication is required. In production, consider implementing proper authentication and authorization.

## Data Models

### Event Schema

```json
{
  "_id": "ObjectId",
  "title": "string (required, 3-200 chars)",
  "description": "string (required, 10-2000 chars)",
  "startDate": "ISO 8601 date (required)",
  "endDate": "ISO 8601 date (required)",
  "location": {
    "venue": "string (required)",
    "address": "string (required)",
    "city": "string (required)",
    "state": "string (optional)",
    "country": "string (required)",
    "coordinates": {
      "latitude": "number (-90 to 90)",
      "longitude": "number (-180 to 180)"
    }
  },
  "category": "enum (required): conference|workshop|webinar|networking|seminar|training|other",
  "organizer": {
    "name": "string (required)",
    "email": "string (required, valid email)",
    "phone": "string (optional, valid phone)"
  },
  "capacity": "number (1-10000, optional)",
  "registrationDeadline": "ISO 8601 date (optional)",
  "price": {
    "amount": "number (>=0, default: 0)",
    "currency": "enum (USD|EUR|GBP|CAD|AUD, default: USD)"
  },
  "tags": ["string array (optional)"],
  "status": "enum (draft|published|cancelled|completed, default: draft)",
  "isVirtual": "boolean (default: false)",
  "virtualLink": "string (URL, required if isVirtual=true)",
  "registrationCount": "number (>=0, default: 0)",
  "attachments": [
    {
      "filename": "string",
      "url": "string (URL)",
      "type": "enum (image|document|video|other)"
    }
  ],
  "createdAt": "ISO 8601 date (auto-generated)",
  "updatedAt": "ISO 8601 date (auto-generated)"
}
```

### Virtual Fields

These fields are computed and included in responses:

- `durationHours`: Event duration in hours
- `isRegistrationOpen`: Whether registration is currently open
- `isUpcoming`: Whether the event is in the future
- `isFull`: Whether the event has reached capacity

## Endpoints

### 1. Get All Events

**GET** `/api/events`

Retrieve a paginated list of events with optional filtering.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number (>=1) | 1 |
| `limit` | integer | Items per page (1-100) | 10 |
| `status` | string | Filter by status | - |
| `category` | string | Filter by category | - |
| `city` | string | Filter by city (case-insensitive) | - |
| `country` | string | Filter by country (case-insensitive) | - |
| `upcoming` | boolean | Show only upcoming events | - |
| `virtual` | boolean | Filter virtual/physical events | - |
| `search` | string | Search in title, description, tags, organizer | - |
| `startDate` | ISO date | Filter events starting from this date | - |
| `endDate` | ISO date | Filter events ending before this date | - |
| `sortBy` | string | Sort field (startDate, endDate, createdAt, title, registrationCount) | startDate |
| `sortOrder` | string | Sort direction (asc, desc) | asc |

#### Example Request

```bash
GET /api/events?page=1&limit=5&category=conference&upcoming=true&search=tech
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Tech Conference 2024",
      "description": "Annual technology conference featuring latest innovations",
      "startDate": "2024-03-15T09:00:00Z",
      "endDate": "2024-03-17T17:00:00Z",
      "location": {
        "venue": "Convention Center",
        "address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "country": "USA"
      },
      "category": "conference",
      "organizer": {
        "name": "Tech Events Inc",
        "email": "contact@techevents.com",
        "phone": "+1-555-0123"
      },
      "capacity": 500,
      "price": {
        "amount": 299,
        "currency": "USD"
      },
      "status": "published",
      "isVirtual": false,
      "registrationCount": 234,
      "tags": ["technology", "innovation", "networking"],
      "durationHours": 56,
      "isRegistrationOpen": true,
      "isUpcoming": true,
      "isFull": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalEvents": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Upcoming Events

**GET** `/api/events/upcoming`

Get upcoming published events.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Maximum number of events | 10 |

#### Example Response

```json
{
  "success": true,
  "data": [
    // Array of upcoming events
  ],
  "count": 5
}
```

### 3. Get Events by Category

**GET** `/api/events/categories/:category`

Get events filtered by category.

#### Path Parameters

- `category`: One of `conference`, `workshop`, `webinar`, `networking`, `seminar`, `training`, `other`

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Maximum number of events | 10 |

#### Example Request

```bash
GET /api/events/categories/workshop?limit=5
```

### 4. Get Event Statistics

**GET** `/api/events/stats`

Get comprehensive event statistics.

#### Example Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalEvents": 156,
      "publishedEvents": 89,
      "upcomingEvents": 23,
      "virtualEvents": 34
    },
    "categories": [
      { "_id": "conference", "count": 45 },
      { "_id": "workshop", "count": 32 },
      { "_id": "webinar", "count": 28 }
    ],
    "monthly": [
      { "_id": 1, "count": 12 },
      { "_id": 2, "count": 8 }
    ]
  }
}
```

### 5. Get Single Event

**GET** `/api/events/:id`

Retrieve a specific event by ID.

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Example Request

```bash
GET /api/events/64f1a2b3c4d5e6f7a8b9c0d1
```

#### Example Response

```json
{
  "success": true,
  "data": {
    // Single event object
  }
}
```

### 6. Create Event

**POST** `/api/events`

Create a new event.

#### Request Body

```json
{
  "title": "New Tech Workshop",
  "description": "Learn the latest web development technologies",
  "startDate": "2024-04-15T14:00:00Z",
  "endDate": "2024-04-15T18:00:00Z",
  "location": {
    "venue": "Tech Hub",
    "address": "456 Innovation Blvd",
    "city": "Austin",
    "state": "TX",
    "country": "USA",
    "coordinates": {
      "latitude": 30.2672,
      "longitude": -97.7431
    }
  },
  "category": "workshop",
  "organizer": {
    "name": "Web Dev Academy",
    "email": "info@webdevacademy.com",
    "phone": "+1-555-0456"
  },
  "capacity": 50,
  "registrationDeadline": "2024-04-10T23:59:59Z",
  "price": {
    "amount": 149,
    "currency": "USD"
  },
  "tags": ["web development", "javascript", "react"],
  "status": "draft",
  "isVirtual": false
}
```

#### Example Response

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    // Created event object with generated _id
  }
}
```

### 7. Update Event

**PUT** `/api/events/:id`

Update an existing event. All fields are optional in the request body.

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Request Body

```json
{
  "title": "Updated Event Title",
  "capacity": 75,
  "status": "published"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    // Updated event object
  }
}
```

### 8. Update Event Status

**PATCH** `/api/events/:id/status`

Update only the status of an event.

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Request Body

```json
{
  "status": "published"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "Event status updated to published",
  "data": {
    // Updated event object
  }
}
```

### 9. Register for Event

**PATCH** `/api/events/:id/register`

Increment the registration count for an event (simulates user registration).

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Example Response

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "eventId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "registrationCount": 235,
    "capacity": 500,
    "spotsRemaining": 265
  }
}
```

### 10. Delete Event

**DELETE** `/api/events/:id`

Delete an event permanently.

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Example Response

```json
{
  "success": true,
  "message": "Event deleted successfully",
  "data": {
    "deletedEvent": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Deleted Event Title"
    }
  }
}
```

## Error Responses

All endpoints return errors in a consistent format:

### Validation Error (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required",
      "value": ""
    }
  ]
}
```

### Not Found Error (404)

```json
{
  "success": false,
  "error": "Event not found"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Failed to fetch events",
  "message": "Detailed error message"
}
```

## Setup and Configuration

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure MongoDB Atlas

1. Create a MongoDB Atlas account at https://cloud.mongodb.com/
2. Create a cluster
3. Get your connection string
4. Update the `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/capa-events?retryWrites=true&w=majority
PORT=3003
NODE_ENV=development
```

### 3. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3003` and automatically connect to MongoDB Atlas.

## Testing with curl

### Create an Event

```bash
curl -X POST http://localhost:3003/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "description": "This is a test event for API demonstration",
    "startDate": "2024-06-01T10:00:00Z",
    "endDate": "2024-06-01T16:00:00Z",
    "location": {
      "venue": "Test Venue",
      "address": "123 Test St",
      "city": "Test City",
      "country": "USA"
    },
    "category": "workshop",
    "organizer": {
      "name": "Test Organizer",
      "email": "test@example.com"
    }
  }'
```

### Get All Events

```bash
curl http://localhost:3003/api/events
```

### Get Event by ID

```bash
curl http://localhost:3003/api/events/YOUR_EVENT_ID
```

## Best Practices

1. **Validation**: All input is validated using express-validator
2. **Error Handling**: Comprehensive error handling with consistent response format
3. **Pagination**: Large datasets are paginated for performance
4. **Indexing**: Database indexes are created for efficient querying
5. **Virtual Fields**: Computed fields provide additional useful information
6. **Flexible Filtering**: Multiple filter options for various use cases

## Security Considerations

For production deployment, consider implementing:

1. Authentication and authorization
2. Rate limiting
3. Input sanitization
4. CORS configuration
5. Environment-specific configurations
6. Logging and monitoring
7. Data encryption
8. API versioning

## Future Enhancements

Potential improvements include:

1. User authentication and event ownership
2. File upload for event attachments
3. Email notifications for registrations
4. Payment integration
5. Calendar integration
6. Event analytics and reporting
7. Advanced search with Elasticsearch
8. Real-time updates with WebSockets

---

# Simple Events API

The Simple Events API provides a streamlined interface for managing basic events with only essential fields.

## Base URL

```
http://localhost:3003/api/simple-events
```

## Data Model

### SimpleEvent Schema

```json
{
  "_id": "ObjectId",
  "startdate": "ISO 8601 date (required)",
  "enddate": "ISO 8601 date (required)",
  "type": "string (required, 1-100 chars)",
  "title": "string (required, 1-200 chars)", 
  "description": "string (required, 1-2000 chars)",
  "creator": "string (required, 1-100 chars)",
  "createdAt": "ISO 8601 date (auto-generated)",
  "updatedAt": "ISO 8601 date (auto-generated)"
}
```

### Virtual Fields

- `durationHours`: Event duration in hours
- `isUpcoming`: Whether the event is in the future

## Endpoints

### 1. Get All Simple Events

**GET** `/api/simple-events`

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number (>=1) | 1 |
| `limit` | integer | Items per page | 10 |
| `type` | string | Filter by type (case-insensitive) | - |
| `creator` | string | Filter by creator (case-insensitive) | - |
| `upcoming` | boolean | Show only upcoming events | - |
| `search` | string | Search in title, description, type, creator | - |
| `startDate` | ISO date | Filter events starting from this date | - |
| `endDate` | ISO date | Filter events ending before this date | - |
| `sortBy` | string | Sort field (startdate, type, creator, createdAt, title) | startdate |
| `sortOrder` | string | Sort direction (asc, desc) | asc |

#### Example Request

```bash
GET /api/simple-events?page=1&limit=5&type=meeting&upcoming=true
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "startdate": "2024-03-15T09:00:00Z",
      "enddate": "2024-03-15T17:00:00Z",
      "type": "meeting",
      "title": "Team Planning Session",
      "description": "Quarterly team planning and goal setting meeting",
      "creator": "John Doe",
      "durationHours": 8,
      "isUpcoming": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalEvents": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Upcoming Simple Events

**GET** `/api/simple-events/upcoming`

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Maximum number of events | 10 |

#### Example Response

```json
{
  "success": true,
  "data": [
    // Array of upcoming events
  ],
  "count": 5
}
```

### 3. Get Simple Events by Type

**GET** `/api/simple-events/by-type/:type`

#### Path Parameters

- `type`: Event type to filter by

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Maximum number of events | 10 |

#### Example Request

```bash
GET /api/simple-events/by-type/workshop?limit=5
```

### 4. Get Simple Events by Creator

**GET** `/api/simple-events/by-creator/:creator`

#### Path Parameters

- `creator`: Creator name to filter by

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Maximum number of events | 10 |

#### Example Request

```bash
GET /api/simple-events/by-creator/john%20doe?limit=5
```

### 5. Get Simple Event Statistics

**GET** `/api/simple-events/stats`

#### Example Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalEvents": 156,
      "upcomingEvents": 23
    },
    "types": [
      { "_id": "meeting", "count": 45 },
      { "_id": "workshop", "count": 32 },
      { "_id": "webinar", "count": 28 }
    ],
    "creators": [
      { "_id": "John Doe", "count": 12 },
      { "_id": "Jane Smith", "count": 8 }
    ],
    "monthly": [
      { "_id": 1, "count": 12 },
      { "_id": 2, "count": 8 }
    ]
  }
}
```

### 6. Get Single Simple Event

**GET** `/api/simple-events/:id`

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Example Response

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "startdate": "2024-03-15T09:00:00Z",
    "enddate": "2024-03-15T17:00:00Z",
    "type": "meeting",
    "title": "Team Planning Session",
    "description": "Quarterly team planning and goal setting meeting",
    "creator": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}
```

### 7. Create Simple Event

**POST** `/api/simple-events`

#### Request Body

```json
{
  "startdate": "2024-04-15T14:00:00Z",
  "enddate": "2024-04-15T18:00:00Z",
  "type": "workshop",
  "title": "Web Development Basics",
  "description": "Introduction to HTML, CSS, and JavaScript",
  "creator": "Tech Academy"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    // Created event object with generated _id
  }
}
```

### 8. Update Simple Event (Full Update)

**PUT** `/api/simple-events/:id`

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Request Body

All fields are required for PUT requests:

```json
{
  "startdate": "2024-04-15T14:00:00Z",
  "enddate": "2024-04-15T18:00:00Z",
  "type": "workshop",
  "title": "Advanced Web Development",
  "description": "Deep dive into React and Node.js",
  "creator": "Tech Academy"
}
```

### 9. Update Simple Event (Partial Update)

**PATCH** `/api/simple-events/:id`

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Request Body

Any subset of fields:

```json
{
  "title": "Updated Event Title",
  "type": "seminar"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    // Updated event object
  }
}
```

### 10. Delete Simple Event

**DELETE** `/api/simple-events/:id`

#### Path Parameters

- `id`: MongoDB ObjectId of the event

#### Example Response

```json
{
  "success": true,
  "message": "Event deleted successfully",
  "data": {
    "deletedEvent": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Deleted Event Title",
      "creator": "Event Creator"
    }
  }
}
```

## Testing Simple Events API with curl

### Create a Simple Event

```bash
curl -X POST http://localhost:3003/api/simple-events \
  -H "Content-Type: application/json" \
  -d '{
    "startdate": "2024-06-01T10:00:00Z",
    "enddate": "2024-06-01T16:00:00Z",
    "type": "workshop",
    "title": "Test Workshop",
    "description": "This is a test workshop for API demonstration",
    "creator": "Test Creator"
  }'
```

### Get All Simple Events

```bash
curl http://localhost:3003/api/simple-events
```

### Get Simple Event by ID

```bash
curl http://localhost:3003/api/simple-events/YOUR_EVENT_ID
```

### Update a Simple Event

```bash
curl -X PATCH http://localhost:3003/api/simple-events/YOUR_EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Workshop Title",
    "type": "seminar"
  }'
```

### Delete a Simple Event

```bash
curl -X DELETE http://localhost:3003/api/simple-events/YOUR_EVENT_ID
```

## Validation

The Simple Events API includes comprehensive validation:

- **startdate**: Must be a valid ISO 8601 date
- **enddate**: Must be a valid ISO 8601 date and after startdate
- **type**: Required, 1-100 characters
- **title**: Required, 1-200 characters
- **description**: Required, 1-2000 characters
- **creator**: Required, 1-100 characters

## Error Handling

All simple events endpoints return errors in the same format as the complex events API:

### Validation Error (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "",
      "msg": "End date must be after or equal to start date",
      "path": "enddate",
      "location": "body"
    }
  ]
}
```

## Choosing Between APIs

**Use Simple Events API when:**
- You need basic event management
- You want minimal complexity
- You don't need location, pricing, or registration features
- You're building a simple calendar or scheduling system

**Use Complex Events API when:**
- You need full event management features
- You require location and venue information
- You need registration and capacity management
- You want pricing and payment features
- You're building a comprehensive event platform