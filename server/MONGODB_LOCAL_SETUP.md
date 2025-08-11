# MongoDB Local Setup Guide

This guide will help you set up MongoDB locally for the CAPA Events API instead of using MongoDB Atlas.

## Quick Setup (Recommended)

### Option 1: Automated Setup Script

Run the automated setup script we've created:

```bash
cd server
node setup-mongodb.js
```

This script will:
- Check if MongoDB is installed
- Install MongoDB if needed (macOS/Linux)
- Start MongoDB service
- Create .env configuration
- Test the connection

### Option 2: Manual Setup

Follow the steps below for your operating system.

## Manual Installation

### macOS (with Homebrew)

1. **Install Homebrew** (if not already installed):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. **Install MongoDB**:
```bash
# Add MongoDB tap
brew tap mongodb/brew

# Install MongoDB Community Edition
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community
```

3. **Verify installation**:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Ubuntu/Debian Linux

1. **Import MongoDB GPG key**:
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
```

2. **Add MongoDB repository**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

3. **Install MongoDB**:
```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
```

4. **Start MongoDB**:
```bash
sudo systemctl enable mongod
sudo systemctl start mongod
```

5. **Verify installation**:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

### CentOS/RHEL Linux

1. **Create repository file**:
```bash
sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
```

2. **Install MongoDB**:
```bash
sudo yum install -y mongodb-org
```

3. **Start MongoDB**:
```bash
sudo systemctl enable mongod
sudo systemctl start mongod
```

### Windows

1. **Download MongoDB**:
   - Go to https://www.mongodb.com/try/download/community
   - Download MongoDB Community Server
   - Choose Windows x64

2. **Install MongoDB**:
   - Run the installer as Administrator
   - Choose "Complete" installation
   - Install MongoDB as a Service
   - Optionally install MongoDB Compass (GUI tool)

3. **Start MongoDB**:
```cmd
net start MongoDB
```

### Docker (All Platforms)

If you prefer using Docker:

```bash
# Run MongoDB container
docker run -d \
  --name mongodb-local \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# Verify it's running
docker ps | grep mongodb-local
```

## Configuration

### Update .env File

Create or update your `.env` file in the server directory:

```env
# MongoDB Configuration (Local)
MONGODB_URI=mongodb://localhost:27017/capa-events

# Server Configuration
PORT=3003
NODE_ENV=development

# Optional: Add other environment variables
```

### Update .env.example

Also update `.env.example` with the same local configuration:

```env
# MongoDB Configuration (Local)
MONGODB_URI=mongodb://localhost:27017/capa-events

# Server Configuration
PORT=3003
NODE_ENV=development
```

## Verification

### 1. Test MongoDB Connection

```bash
# Using mongosh (MongoDB Shell)
mongosh

# Or test with ping
mongosh --eval "db.runCommand({ ping: 1 })"
```

### 2. Test API Connection

```bash
# Start your server
npm start

# In another terminal, test the connection
node test-simple-events.js
```

### 3. Create Sample Data

```bash
node create-test-data.js
```

## Managing MongoDB

### Start/Stop MongoDB

**macOS (Homebrew):**
```bash
# Start
brew services start mongodb/brew/mongodb-community

# Stop
brew services stop mongodb/brew/mongodb-community

# Restart
brew services restart mongodb/brew/mongodb-community
```

**Linux (systemd):**
```bash
# Start
sudo systemctl start mongod

# Stop
sudo systemctl stop mongod

# Restart
sudo systemctl restart mongod

# Check status
sudo systemctl status mongod
```

**Windows:**
```cmd
# Start
net start MongoDB

# Stop
net stop MongoDB
```

**Docker:**
```bash
# Start
docker start mongodb-local

# Stop
docker stop mongodb-local

# Remove (deletes data)
docker rm mongodb-local
```

## Database Management

### Connect to Database

```bash
# Connect to specific database
mongosh capa-events

# List all databases
mongosh --eval "show dbs"

# List collections in current database
mongosh capa-events --eval "show collections"
```

### View Your Data

```bash
# View all events
mongosh capa-events --eval "db.simpleevents.find().pretty()"

# Count events
mongosh capa-events --eval "db.simpleevents.countDocuments()"

# View upcoming events
mongosh capa-events --eval "db.simpleevents.find({startdate: {\$gte: new Date()}}).pretty()"
```

### Clear Data (if needed)

```bash
# Clear all events
mongosh capa-events --eval "db.simpleevents.deleteMany({})"

# Drop entire database
mongosh --eval "use capa-events; db.dropDatabase()"
```

## Troubleshooting

### Common Issues

1. **Connection Refused Error**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```
   - **Solution**: MongoDB is not running. Start MongoDB service.

2. **Permission Denied**
   ```
   Error: Permission denied
   ```
   - **Solution**: Run MongoDB commands with proper permissions (sudo on Linux).

3. **Port Already in Use**
   ```
   Error: Port 27017 already in use
   ```
   - **Solution**: Another MongoDB instance is running. Stop it or use a different port.

4. **Database Not Found**
   ```
   Error: Database not found
   ```
   - **Solution**: The database will be created automatically when you first write data.

### Check MongoDB Status

```bash
# Check if MongoDB is listening on port 27017
netstat -an | grep 27017

# Or on macOS/Linux
lsof -i :27017

# Check MongoDB process
ps aux | grep mongod
```

### View MongoDB Logs

**macOS (Homebrew):**
```bash
tail -f /opt/homebrew/var/log/mongodb/mongo.log
```

**Linux:**
```bash
sudo tail -f /var/log/mongodb/mongod.log
```

**Windows:**
```cmd
# Check Windows Event Viewer for MongoDB service logs
```

## Performance Tips

### 1. Index Optimization

The SimpleEvent model already includes useful indexes:
- `startdate` (ascending)
- `type` (ascending) 
- `creator` (ascending)
- `createdAt` (descending)

### 2. Connection Pooling

MongoDB driver automatically handles connection pooling. Default settings work well for development.

### 3. Memory Usage

MongoDB uses memory-mapped files. For development, default settings are fine. Monitor with:

```bash
mongosh --eval "db.serverStatus().mem"
```

## Security Considerations

### Development (Local)

- Local MongoDB runs without authentication by default
- Only accessible from localhost
- Safe for development use

### Production Recommendations

When moving to production:

1. **Enable Authentication**:
```bash
# Create admin user
mongosh admin --eval "db.createUser({user: 'admin', pwd: 'password', roles: ['root']})"
```

2. **Use Environment Variables**:
```env
MONGODB_URI=mongodb://username:password@localhost:27017/capa-events?authSource=admin
```

3. **Configure Firewall**:
   - Block external access to port 27017
   - Use VPN or SSH tunnel for remote access

4. **Enable SSL/TLS**:
   - Configure MongoDB with SSL certificates
   - Update connection string to use SSL

## Backup and Restore

### Backup Database

```bash
# Backup entire database
mongodump --db capa-events --out ./backup

# Backup specific collection
mongodump --db capa-events --collection simpleevents --out ./backup
```

### Restore Database

```bash
# Restore entire database
mongorestore --db capa-events ./backup/capa-events

# Restore specific collection
mongorestore --db capa-events --collection simpleevents ./backup/capa-events/simpleevents.bson
```

## MongoDB Compass (GUI Tool)

For a visual interface to your database:

1. **Download**: https://www.mongodb.com/products/compass
2. **Connect**: `mongodb://localhost:27017`
3. **Navigate**: to `capa-events` database → `simpleevents` collection

## Next Steps

1. ✅ **MongoDB installed and running**
2. ✅ **Environment configured**  
3. ✅ **Connection tested**
4. 🚀 **Start your server**: `npm start`
5. 🧪 **Run tests**: `node test-simple-events.js`
6. 📊 **Create sample data**: `node create-test-data.js`
7. 🌐 **Access API**: http://localhost:3003/api/simple-events

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Verify MongoDB is running: `mongosh --eval "db.runCommand({ ping: 1 })"`
3. Check server logs for detailed error messages
4. Ensure ports 3003 and 27017 are available
5. Review MongoDB official documentation: https://docs.mongodb.com/

## Useful Commands Cheat Sheet

```bash
# MongoDB Service Management
brew services start mongodb/brew/mongodb-community  # macOS start
sudo systemctl start mongod                        # Linux start
net start MongoDB                                  # Windows start

# Database Operations
mongosh capa-events                                # Connect to database
mongosh --eval "show dbs"                         # List databases
mongosh capa-events --eval "show collections"     # List collections
mongosh capa-events --eval "db.simpleevents.find().count()" # Count documents

# Server Operations
npm start                                          # Start API server
node test-simple-events.js                        # Test API
node create-test-data.js                          # Create sample data
curl http://localhost:3003/api/simple-events      # Test API endpoint
```

Happy coding! 🚀