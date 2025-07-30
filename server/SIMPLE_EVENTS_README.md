# Simple Events API

A streamlined MongoDB-based API for managing basic events with essential fields only.

## Overview

The Simple Events API provides a clean, minimalist interface for event management. Unlike the complex events API, this focuses on just the essential event information:

- **startdate**: When the event starts
- **enddate**: When the event ends  
- **type**: Category/type of event
- **title**: Event name
- **description**: Event details
- **creator**: Who created the event

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Set up your MongoDB connection in `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
PORT=3001
```

3. Start the server:
```bash
npm start
```

The API will be available at `http://localhost:3001/api/simple-events`

## API Endpoints

### Base URL: `/api/simple-events`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all events (with filtering & pagination) |
| GET | `/upcoming` | Get upcoming events |
| GET | `/by-type/:type` | Get events by type |
| GET | `/by-creator/:creator` | Get events by creator |
| GET | `/stats` | Get event statistics |
| GET | `/:id` | Get specific event |
| POST | `/` | Create new event |
| PUT | `/:id` | Update entire event |
| PATCH | `/:id` | Partially update event |
| DELETE | `/:id` | Delete event |

## Usage Examples

### Create an Event

```bash
curl -X POST http://localhost:3001/api/simple-events \
  -H "Content-Type: application/json" \
  -d '{
    "startdate": "2024-06-01T10:00:00Z",
    "enddate": "2024-06-01T16:00:00Z",
    "type": "workshop",
    "title": "Web Development Basics",
    "description": "Learn HTML, CSS, and JavaScript fundamentals",
    "creator": "Tech Academy"
  }'
```

### Get All Events

```bash
curl http://localhost:3001/api/simple-events
```

### Filter Events

```bash
# Get upcoming workshops
curl "http://localhost:3001/api/simple-events?type=workshop&upcoming=true"

# Search events
curl "http://localhost:3001/api/simple-events?search=web development"

# Get events by creator
curl "http://localhost:3001/api/simple-events/by-creator/Tech%20Academy"
```

### Update an Event

```bash
curl -X PATCH http://localhost:3001/api/simple-events/EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced Web Development",
    "type": "masterclass"
  }'
```

### Delete an Event

```bash
curl -X DELETE http://localhost:3001/api/simple-events/EVENT_ID
```

## Event Object Structure

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "startdate": "2024-06-01T10:00:00.000Z",
  "enddate": "2024-06-01T16:00:00.000Z",
  "type": "workshop",
  "title": "Web Development Basics",
  "description": "Learn HTML, CSS, and JavaScript fundamentals",
  "creator": "Tech Academy",
  "durationHours": 6,
  "isUpcoming": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```

## Validation Rules

- **startdate**: Required, valid ISO 8601 date
- **enddate**: Required, valid ISO 8601 date, must be after startdate
- **type**: Required, 1-100 characters
- **title**: Required, 1-200 characters
- **description**: Required, 1-2000 characters
- **creator**: Required, 1-100 characters

## Query Parameters

### Filtering

- `type` - Filter by event type (case-insensitive)
- `creator` - Filter by creator (case-insensitive)
- `upcoming` - Show only upcoming events (true/false)
- `search` - Search in title, description, type, creator
- `startDate` - Events starting from this date
- `endDate` - Events ending before this date

### Pagination

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Sorting

- `sortBy` - Sort field: startdate, type, creator, title, createdAt (default: startdate)
- `sortOrder` - Sort direction: asc, desc (default: asc)

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalEvents": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [...]
}
```

## Testing

Run the included test script to verify functionality:

```bash
node test-simple-events.js
```

This will:
1. Create a test event
2. Retrieve and update it
3. Test various endpoints
4. Clean up by deleting the test event
5. Test validation errors

## Database Schema

The API uses MongoDB with Mongoose ODM. Events are stored in the `simpleevents` collection with automatic timestamps and validation.

### Indexes

- `startdate` (ascending)
- `type` (ascending)
- `creator` (ascending)
- `createdAt` (descending)

## Virtual Fields

- `durationHours` - Calculated event duration in hours
- `isUpcoming` - Boolean indicating if event is in the future

## Error Handling

The API includes comprehensive error handling for:
- Validation errors (400)
- Not found errors (404)
- Server errors (500)
- Invalid ObjectId format (400)

## Common Use Cases

### Event Calendar
```javascript
// Get all upcoming events for a calendar view
fetch('/api/simple-events?upcoming=true&sortBy=startdate&limit=50')
```

### User's Events
```javascript
// Get all events created by a specific user
fetch('/api/simple-events/by-creator/john-doe')
```

### Event Dashboard
```javascript
// Get statistics for an admin dashboard
fetch('/api/simple-events/stats')
```

### Search Interface
```javascript
// Search events as user types
fetch('/api/simple-events?search=workshop&limit=20')
```

## Differences from Complex Events API

| Feature | Simple Events | Complex Events |
|---------|---------------|----------------|
| Fields | 6 core fields | 20+ fields |
| Location | Not supported | Full location data |
| Pricing | Not supported | Price & currency |
| Registration | Not supported | Registration management |
| Attachments | Not supported | File attachments |
| Status | Not supported | Draft/published/cancelled |
| Virtual events | Not supported | Virtual meeting links |
| Capacity | Not supported | Attendee limits |

## When to Use Simple Events API

✅ **Good for:**
- Basic event scheduling
- Simple calendar applications
- Internal team events
- MVP/prototype development
- When you need minimal complexity

❌ **Not suitable for:**
- Public event platforms
- Paid events requiring registration
- Events needing location data
- Complex event management systems

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all validations work properly

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the API documentation
2. Run the test script to verify setup
3. Review error messages for validation issues
4. Ensure MongoDB connection is working

## Future Enhancements

Potential improvements while maintaining simplicity:
- Event categories/tags
- Timezone support
- Recurring events
- Basic notifications
- CSV import/export
- iCal integration