# 🚀 Quick Start Guide - Local MongoDB Setup

Get your CAPA Events API running locally with MongoDB in just a few minutes!

## ⚡ Super Quick Setup (5 minutes)

### 1. Prerequisites Check
```bash
# Check if you have Node.js (v14+)
node --version

# Check if you're in the right directory
pwd
# Should show: .../CAPA-Website/server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. One-Command Setup
```bash
# This will install MongoDB, configure everything, and test the connection
npm run setup-db
```

**That's it!** If the setup script succeeds, jump to [Step 6](#6-start-your-api-server).

---

## 🔧 Manual Setup (if automated setup fails)

### 4. Install MongoDB Manually

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Ubuntu/Debian:**
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable mongod && sudo systemctl start mongod
```

**Windows:**
1. Download from https://www.mongodb.com/try/download/community
2. Install as Administrator, choose "Complete" setup
3. Install as Windows Service
4. Start: `net start MongoDB`

**Docker (Any OS):**
```bash
docker run -d --name mongodb-local -p 27017:27017 mongo:latest
```

### 5. Configure Environment
Create `.env` file in the server directory:
```env
MONGODB_URI=mongodb://localhost:27017/capa-events
PORT=3003
NODE_ENV=development
```

### 6. Start Your API Server
```bash
npm start
```

You should see:
```
✅ MongoDB Connected Successfully!
   Host: localhost
   Port: 27017
   Database: capa-events
Server running on port 3003
```

---

## 🧪 Test Everything Works

### Test 1: Basic API Test
```bash
# In a new terminal
npm run test-api
```

### Test 2: Manual API Test
```bash
# Check server health
curl http://localhost:3003/health

# Check simple events endpoint
curl http://localhost:3003/api/simple-events
```

### Test 3: Create Sample Data
```bash
npm run create-data
```

---

## 🎯 Your First API Calls

### Create an Event
```bash
curl -X POST http://localhost:3003/api/simple-events \
  -H "Content-Type: application/json" \
  -d '{
    "startdate": "2024-07-25T10:00:00Z",
    "enddate": "2024-07-25T12:00:00Z",
    "type": "meeting",
    "title": "My First Event",
    "description": "Testing the API",
    "creator": "Me"
  }'
```

### Get All Events
```bash
curl http://localhost:3003/api/simple-events
```

### Search Events
```bash
curl "http://localhost:3003/api/simple-events?search=meeting&upcoming=true"
```

---

## 📚 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simple-events` | Get all events (with filters) |
| GET | `/api/simple-events/upcoming` | Get upcoming events |
| GET | `/api/simple-events/:id` | Get specific event |
| POST | `/api/simple-events` | Create new event |
| PUT | `/api/simple-events/:id` | Update entire event |
| PATCH | `/api/simple-events/:id` | Update specific fields |
| DELETE | `/api/simple-events/:id` | Delete event |
| GET | `/api/simple-events/stats` | Get statistics |

---

## 🛠️ Useful Commands

```bash
# MongoDB Management
npm run db:status    # Check if MongoDB is running
npm run db:start     # Start MongoDB
npm run db:stop      # Stop MongoDB
npm run db:connect   # Connect to database shell

# Development
npm start           # Start the API server
npm run test-api    # Run API tests
npm run create-data # Create sample data

# Database Operations
npm run db:backup   # Backup database
npm run db:restore  # Restore database
```

---

## 🔍 Database Exploration

### Using MongoDB Shell
```bash
# Connect to your database
npm run db:connect

# Inside MongoDB shell:
show collections           # List collections
db.simpleevents.find()     # View all events
db.simpleevents.countDocuments()  # Count events
```

### Using MongoDB Compass (GUI)
1. Download: https://www.mongodb.com/products/compass
2. Connect to: `mongodb://localhost:27017`
3. Navigate to: `capa-events` → `simpleevents`

---

## 🚨 Troubleshooting

### MongoDB Won't Start
```bash
# Check if it's already running
npm run db:status

# Try starting manually
npm run db:start

# Check logs (macOS)
tail -f /opt/homebrew/var/log/mongodb/mongo.log

# Check logs (Linux)
sudo journalctl -u mongod -f
```

### API Connection Issues
```bash
# Check if server is running
curl http://localhost:3003/health

# Check MongoDB connection
node -e "
import('./config/database.js').then(db => 
  db.default().then(() => console.log('✅ DB OK')))
"
```

### Port Conflicts
```bash
# Check what's using port 3003
lsof -i :3003

# Check what's using port 27017
lsof -i :27017
```

---

## 📖 Learn More

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Simple Events Guide**: See `SIMPLE_EVENTS_README.md`
- **MongoDB Setup**: See `MONGODB_LOCAL_SETUP.md`
- **Test All Features**: Run `node test-simple-events.js`

---

## 🎉 You're Ready!

Your local MongoDB + Events API is now running! Here's what you have:

✅ **Local MongoDB** running on port 27017  
✅ **Events API** running on port 3003  
✅ **Simple Events model** with 6 essential fields  
✅ **Full CRUD operations** with validation  
✅ **Search & filtering** capabilities  
✅ **Sample data** for testing  

### Next Steps:
1. 🌐 **Frontend**: Connect your client app to `http://localhost:3003/api/simple-events`
2. 📱 **Mobile**: Use the same API endpoints for mobile apps
3. 🔒 **Production**: When ready, deploy with proper security and MongoDB Atlas
4. ⚡ **Scale**: Add authentication, file uploads, notifications, etc.

**Happy coding!** 🚀

---

## 📞 Need Help?

1. **Check the logs** for error details
2. **Verify MongoDB** is running: `npm run db:status`
3. **Test the API** with: `npm run test-api`
4. **Review docs** in the other markdown files
5. **Clear browser cache** if testing via browser

**Common Solutions:**
- Restart MongoDB: `npm run db:stop && npm run db:start`
- Restart API server: Stop (Ctrl+C) and `npm start`
- Clear database: `npm run db:connect` then `db.simpleevents.deleteMany({})`
- Recreate data: `npm run create-data`
