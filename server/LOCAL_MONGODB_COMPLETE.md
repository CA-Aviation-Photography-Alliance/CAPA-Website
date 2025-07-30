# 🎉 Local MongoDB Events API - Complete Setup

Your CAPA Events API is now fully configured with local MongoDB! This document summarizes everything that's been set up and how to use it.

## ✅ What's Been Completed

### 🗄️ Database Setup
- **Local MongoDB** installed and running on port 27017
- **Database name**: `capa-events`
- **Collection**: `simpleevents`
- **Sample data**: 10 test events created
- **Environment**: Configured for local development

### 🚀 API Implementation
- **Simple Events Model** with 6 core fields:
  - `startdate` - Event start date/time
  - `enddate` - Event end date/time
  - `type` - Event category/type
  - `title` - Event name
  - `description` - Event details
  - `creator` - Who created the event

### 🔌 Available Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simple-events` | Get all events (with filtering & pagination) |
| GET | `/api/simple-events/upcoming` | Get upcoming events |
| GET | `/api/simple-events/by-type/:type` | Get events by type |
| GET | `/api/simple-events/by-creator/:creator` | Get events by creator |
| GET | `/api/simple-events/stats` | Get event statistics |
| GET | `/api/simple-events/:id` | Get specific event |
| POST | `/api/simple-events` | Create new event |
| PUT | `/api/simple-events/:id` | Update entire event |
| PATCH | `/api/simple-events/:id` | Partially update event |
| DELETE | `/api/simple-events/:id` | Delete event |

## 🚀 Quick Start Commands

### Start Your Server
```bash
cd CAPA-Website/server
npm start
```

You should see:
```
Using local MongoDB connection
✅ MongoDB Connected Successfully!
   Host: localhost
   Port: 27017
   Database: capa-events
Server running on port 3001
```

### Test the API
```bash
# In a new terminal
npm run test-api
```

### View Your Data
```bash
# Get all events
curl http://localhost:3001/api/simple-events

# Get upcoming events
curl http://localhost:3001/api/simple-events/upcoming

# Get statistics
curl http://localhost:3001/api/simple-events/stats
```

## 📊 Sample Data Overview

Your database now contains 10 sample events:

1. **Introduction to Web Development** (workshop)
2. **Annual Tech Conference 2024** (conference)
3. **Team Planning Session** (meeting)
4. **Data Science Fundamentals** (seminar)
5. **Innovation Hackathon 2024** (hackathon)
6. **Remote Work Best Practices** (webinar)
7. **Advanced React Development** (training)
8. **Tech Professionals Networking Event** (networking)
9. **Women in Tech Panel Discussion** (panel)
10. **Weekly Team Standup** (standup)

## 🛠️ Management Commands

```bash
# MongoDB Management
npm run db:status    # Check if MongoDB is running
npm run db:start     # Start MongoDB service
npm run db:stop      # Stop MongoDB service
npm run db:connect   # Open MongoDB shell

# Development
npm start           # Start API server
npm run test-api    # Run comprehensive API tests
npm run create-data # Create fresh sample data

# Configuration
npm run config-local # Switch to local MongoDB (already done)
npm run setup-db    # Full MongoDB setup (if needed)
```

## 🔍 Example API Usage

### Create a New Event
```bash
curl -X POST http://localhost:3001/api/simple-events \
  -H "Content-Type: application/json" \
  -d '{
    "startdate": "2025-01-15T14:00:00Z",
    "enddate": "2025-01-15T16:00:00Z",
    "type": "workshop",
    "title": "My New Workshop",
    "description": "Learning something new and exciting",
    "creator": "Your Name"
  }'
```

### Search and Filter Events
```bash
# Search for workshops
curl "http://localhost:3001/api/simple-events?type=workshop"

# Search by creator
curl "http://localhost:3001/api/simple-events?creator=Tech%20Academy"

# Search upcoming events
curl "http://localhost:3001/api/simple-events?upcoming=true"

# Full text search
curl "http://localhost:3001/api/simple-events?search=development"

# Pagination
curl "http://localhost:3001/api/simple-events?page=1&limit=5"
```

### Update an Event
```bash
# Get an event ID first
EVENT_ID=$(curl -s http://localhost:3001/api/simple-events | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

# Update the event (must include creator field for verification)
curl -X PATCH http://localhost:3001/api/simple-events/$EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Event Title",
    "type": "seminar",
    "creator": "OriginalCreatorName"
  }'
```

### Delete an Event
```bash
# Delete requires creator parameter in URL for verification
curl -X DELETE "http://localhost:3001/api/simple-events/$EVENT_ID?creator=OriginalCreatorName"
```

## 🔧 Configuration Details

### Environment Variables (.env)
```env
MONGODB_URI=mongodb://localhost:27017/capa-events
PORT=3001
NODE_ENV=development
```

### Database Connection
- **Host**: localhost
- **Port**: 27017
- **Database**: capa-events
- **Collection**: simpleevents
- **Authentication**: None (local development)

## 📈 Database Schema

Each event document has this structure:
```json
{
  "_id": "ObjectId",
  "startdate": "2025-01-15T14:00:00.000Z",
  "enddate": "2025-01-15T16:00:00.000Z",
  "type": "workshop",
  "title": "Event Title",
  "description": "Event description...",
  "creator": "Creator Name",
  "createdAt": "2024-07-20T19:32:27.000Z",
  "updatedAt": "2024-07-20T19:32:27.000Z",
  "durationHours": 2,
  "isUpcoming": true
}
```

## 🔍 MongoDB Management

### Using MongoDB Shell
```bash
# Connect to your database
npm run db:connect

# Inside MongoDB shell:
show collections                    # List collections
db.simpleevents.find().pretty()     # View all events
db.simpleevents.countDocuments()    # Count events
db.simpleevents.find({type: "workshop"})  # Find workshops
```

### Using MongoDB Compass (GUI)
1. Download: https://www.mongodb.com/products/compass
2. Connect to: `mongodb://localhost:27017`
3. Navigate to: `capa-events` → `simpleevents`

## 🛡️ Validation & Authorization Rules

All events must have:
- **startdate**: Valid ISO 8601 date
- **enddate**: Valid ISO 8601 date, must be after startdate
- **type**: String, 1-100 characters
- **title**: String, 1-200 characters
- **description**: String, 1-2000 characters
- **creator**: String, 1-100 characters

### Creator Protection
- **UPDATE (PUT/PATCH)**: Requires `creator` field matching original creator
- **DELETE**: Requires `?creator=Name` query parameter matching original creator
- **CREATE/READ**: No restrictions
- **Case-sensitive**: Creator names must match exactly

## 📚 Documentation Files

- `API_DOCUMENTATION.md` - Complete API reference
- `SIMPLE_EVENTS_README.md` - Simple Events API guide
- `MONGODB_LOCAL_SETUP.md` - Detailed MongoDB setup
- `QUICK_START.md` - Getting started guide

## 🔧 Troubleshooting

### Server Won't Start
```bash
# Check MongoDB status
npm run db:status

# If MongoDB isn't running
npm run db:start

# Check if port 3001 is free
lsof -i :3001
```

### Database Connection Issues
```bash
# Test MongoDB connection
mongosh --eval "db.runCommand({ ping: 1 })"

# Check configuration
cat .env | grep MONGODB_URI

# Reconfigure for local MongoDB
npm run config-local
```

### API Errors
```bash
# Check server logs for detailed errors
npm start

# Test basic connectivity
curl http://localhost:3001/health

# Run comprehensive tests (includes creator protection)
npm run test-api
node test-creator-auth.js
```

### Creator Protection Errors
```bash
# 403 Forbidden - Wrong creator
curl -X PATCH http://localhost:3001/api/simple-events/EVENT_ID \
  -d '{"title": "New Title", "creator": "WrongPerson"}'

# 400 Bad Request - Missing creator
curl -X DELETE http://localhost:3001/api/simple-events/EVENT_ID

# 400 Bad Request - Missing creator in body
curl -X PATCH http://localhost:3001/api/simple-events/EVENT_ID \
  -d '{"title": "New Title"}'
```

## 🚀 Next Steps

### Development
1. **Connect your frontend** to `http://localhost:3001/api/simple-events`
2. **Add authentication** when ready for production
3. **Customize validation** in `models/SimpleEvent.js`
4. **Add new endpoints** in `routes/simpleEvents.js`

### Production Deployment
1. **Use MongoDB Atlas** or dedicated MongoDB server
2. **Add authentication middleware** (JWT, Auth0, etc.)
3. **Set up environment variables** for production
4. **Configure CORS** for your domain
5. **Add rate limiting** and security headers

### Enhancements
- File upload for event attachments
- Email notifications
- Calendar integration (iCal)
- Event categories and tags
- User management
- Event registration system

## 🎯 Success Checklist

- ✅ MongoDB installed and running locally
- ✅ Environment configured for local development
- ✅ Simple Events API with 6 core fields
- ✅ Complete CRUD operations with creator protection
- ✅ Search and filtering capabilities
- ✅ Input validation and error handling
- ✅ Creator authorization for updates/deletes
- ✅ Sample data for testing
- ✅ Comprehensive documentation
- ✅ Test scripts and management commands

## 📞 Support

If you need help:
1. **Check the logs** when starting the server
2. **Verify MongoDB** is running: `npm run db:status`
3. **Test the API** with: `npm run test-api`
4. **Review documentation** in the other markdown files
5. **Check MongoDB Compass** for visual database inspection

Your Local MongoDB Events API is ready for development! 🎉

## 🔄 Daily Workflow

```bash
# Start your development session
cd CAPA-Website/server
npm run db:status      # Ensure MongoDB is running
npm start             # Start your API server

# During development
npm run test-api      # Test basic functionality
node test-creator-auth.js  # Test creator protection
npm run create-data   # Refresh sample data if needed

# View your data
npm run db:connect    # Open MongoDB shell
# or use MongoDB Compass GUI

# Remember: Updates/deletes require creator verification!
```

Happy coding! 🚀