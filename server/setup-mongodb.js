#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { platform } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  colorLog('cyan', `  ${message}`);
  console.log('='.repeat(60));
}

function success(message) {
  colorLog('green', `✅ ${message}`);
}

function error(message) {
  colorLog('red', `❌ ${message}`);
}

function warning(message) {
  colorLog('yellow', `⚠️  ${message}`);
}

function info(message) {
  colorLog('blue', `ℹ️  ${message}`);
}

// Check if a command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute command with error handling
function executeCommand(command, description) {
  try {
    info(`Executing: ${description}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    error(`Failed: ${description}`);
    return false;
  }
}

// Check MongoDB installation
function checkMongoDBInstallation() {
  header('Checking MongoDB Installation');

  const mongoExists = commandExists('mongod');
  const mongoClientExists = commandExists('mongosh') || commandExists('mongo');

  if (mongoExists) {
    success('MongoDB server (mongod) is installed');
  } else {
    warning('MongoDB server (mongod) is not installed');
  }

  if (mongoClientExists) {
    success('MongoDB client is installed');
  } else {
    warning('MongoDB client is not installed');
  }

  return mongoExists && mongoClientExists;
}

// Install MongoDB based on platform
function installMongoDB() {
  header('Installing MongoDB');

  const os = platform();

  switch (os) {
    case 'darwin': // macOS
      return installMongoDBMacOS();
    case 'linux':
      return installMongoDBLinux();
    case 'win32':
      return installMongoDBWindows();
    default:
      error(`Unsupported platform: ${os}`);
      return false;
  }
}

function installMongoDBMacOS() {
  info('Detected macOS');

  // Check if Homebrew is installed
  if (!commandExists('brew')) {
    error('Homebrew is not installed. Please install it first:');
    console.log('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    return false;
  }

  success('Homebrew detected');

  // Add MongoDB tap and install
  const commands = [
    { cmd: 'brew tap mongodb/brew', desc: 'Adding MongoDB tap' },
    { cmd: 'brew install mongodb-community', desc: 'Installing MongoDB Community Edition' }
  ];

  for (const { cmd, desc } of commands) {
    if (!executeCommand(cmd, desc)) {
      return false;
    }
  }

  info('Starting MongoDB service...');
  executeCommand('brew services start mongodb/brew/mongodb-community', 'Starting MongoDB service');

  return true;
}

function installMongoDBLinux() {
  info('Detected Linux');

  // Check which package manager is available
  if (commandExists('apt')) {
    return installMongoDBUbuntu();
  } else if (commandExists('yum')) {
    return installMongoDBCentOS();
  } else if (commandExists('dnf')) {
    return installMongoDBFedora();
  } else {
    error('No supported package manager found (apt, yum, dnf)');
    info('Please install MongoDB manually: https://docs.mongodb.com/manual/installation/');
    return false;
  }
}

function installMongoDBUbuntu() {
  info('Installing MongoDB on Ubuntu/Debian');

  const commands = [
    { cmd: 'sudo apt-get update', desc: 'Updating package list' },
    { cmd: 'sudo apt-get install -y wget curl gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release', desc: 'Installing dependencies' },
    { cmd: 'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg', desc: 'Adding MongoDB GPG key' },
    { cmd: 'echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list', desc: 'Adding MongoDB repository' },
    { cmd: 'sudo apt-get update', desc: 'Updating package list with MongoDB repo' },
    { cmd: 'sudo apt-get install -y mongodb-org', desc: 'Installing MongoDB' },
    { cmd: 'sudo systemctl enable mongod', desc: 'Enabling MongoDB service' },
    { cmd: 'sudo systemctl start mongod', desc: 'Starting MongoDB service' }
  ];

  for (const { cmd, desc } of commands) {
    if (!executeCommand(cmd, desc)) {
      return false;
    }
  }

  return true;
}

function installMongoDBCentOS() {
  info('Installing MongoDB on CentOS/RHEL');

  // Create MongoDB repo file
  const repoContent = `[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc`;

  try {
    writeFileSync('/etc/yum.repos.d/mongodb-org-7.0.repo', repoContent);
    success('Created MongoDB repository file');
  } catch (error) {
    error('Failed to create repository file. Run with sudo?');
    return false;
  }

  const commands = [
    { cmd: 'sudo yum install -y mongodb-org', desc: 'Installing MongoDB' },
    { cmd: 'sudo systemctl enable mongod', desc: 'Enabling MongoDB service' },
    { cmd: 'sudo systemctl start mongod', desc: 'Starting MongoDB service' }
  ];

  for (const { cmd, desc } of commands) {
    if (!executeCommand(cmd, desc)) {
      return false;
    }
  }

  return true;
}

function installMongoDBFedora() {
  info('Installing MongoDB on Fedora');

  const commands = [
    { cmd: 'sudo dnf install -y mongodb mongodb-server', desc: 'Installing MongoDB' },
    { cmd: 'sudo systemctl enable mongod', desc: 'Enabling MongoDB service' },
    { cmd: 'sudo systemctl start mongod', desc: 'Starting MongoDB service' }
  ];

  for (const { cmd, desc } of commands) {
    if (!executeCommand(cmd, desc)) {
      return false;
    }
  }

  return true;
}

function installMongoDBWindows() {
  error('Windows installation requires manual setup');
  info('Please follow these steps:');
  console.log('1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community');
  console.log('2. Run the installer as Administrator');
  console.log('3. Choose "Complete" installation');
  console.log('4. Install MongoDB as a Service');
  console.log('5. Install MongoDB Compass (optional GUI)');
  console.log('6. Start MongoDB service: net start MongoDB');

  return false;
}

// Check if MongoDB is running
function checkMongoDBStatus() {
  header('Checking MongoDB Status');

  try {
    // Try to connect to MongoDB
    execSync('mongosh --eval "db.runCommand({ ping: 1 })" --quiet', { stdio: 'ignore', timeout: 5000 });
    success('MongoDB is running and accessible');
    return true;
  } catch {
    // Try with legacy mongo client
    try {
      execSync('mongo --eval "db.runCommand({ ping: 1 })" --quiet', { stdio: 'ignore', timeout: 5000 });
      success('MongoDB is running and accessible');
      return true;
    } catch {
      warning('MongoDB is not running or not accessible');
      return false;
    }
  }
}

// Start MongoDB service
function startMongoDB() {
  header('Starting MongoDB');

  const os = platform();

  switch (os) {
    case 'darwin': // macOS
      return executeCommand('brew services start mongodb/brew/mongodb-community', 'Starting MongoDB with Homebrew');
    case 'linux':
      return executeCommand('sudo systemctl start mongod', 'Starting MongoDB service');
    case 'win32':
      return executeCommand('net start MongoDB', 'Starting MongoDB service');
    default:
      error(`Don't know how to start MongoDB on ${os}`);
      return false;
  }
}

// Create .env file with MongoDB configuration
function createEnvFile() {
  header('Creating Environment Configuration');

  const envPath = join(__dirname, '.env');
  const envExamplePath = join(__dirname, '.env.example');

  // Check if .env already exists
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    if (envContent.includes('MONGODB_URI')) {
      success('.env file already exists with MongoDB configuration');
      return true;
    }
  }

  // Create .env file
  const envContent = `# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/capa-events

# Server Configuration
PORT=3001
NODE_ENV=development

# Add other environment variables below
`;

  try {
    writeFileSync(envPath, envContent);
    success('Created .env file with local MongoDB configuration');

    // Also update .env.example if it exists
    if (existsSync(envExamplePath)) {
      writeFileSync(envExamplePath, envContent);
      success('Updated .env.example file');
    }

    return true;
  } catch (error) {
    error(`Failed to create .env file: ${error.message}`);
    return false;
  }
}

// Test database connection
async function testConnection() {
  header('Testing Database Connection');

  try {
    // Import the database connection
    const { default: connectDB } = await import('./config/database.js');

    info('Testing MongoDB connection...');
    await connectDB();
    success('Successfully connected to MongoDB!');

    // Close the connection
    const mongoose = await import('mongoose');
    await mongoose.default.connection.close();
    success('Connection test completed');

    return true;
  } catch (error) {
    error(`Connection test failed: ${error.message}`);
    return false;
  }
}

// Create initial data
function createInitialData() {
  header('Creating Initial Test Data');

  const testScript = `
import mongoose from 'mongoose';
import SimpleEvent from './models/SimpleEvent.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capa-events';

async function createTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await SimpleEvent.deleteMany({});
    console.log('Cleared existing events');

    // Create sample events
    const sampleEvents = [
      {
        startdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        enddate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        type: 'workshop',
        title: 'Introduction to Web Development',
        description: 'Learn the basics of HTML, CSS, and JavaScript',
        creator: 'Tech Academy'
      },
      {
        startdate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        enddate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        type: 'conference',
        title: 'Annual Tech Conference 2024',
        description: 'Join us for the biggest tech event of the year',
        creator: 'Tech Events Inc'
      },
      {
        startdate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        enddate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        type: 'meeting',
        title: 'Team Planning Session',
        description: 'Monthly team planning and review meeting',
        creator: 'Project Manager'
      }
    ];

    const createdEvents = await SimpleEvent.insertMany(sampleEvents);
    console.log(\`Created \${createdEvents.length} sample events\`);

    // Display created events
    createdEvents.forEach((event, index) => {
      console.log(\`\${index + 1}. \${event.title} - \${event.type}\`);
    });

    await mongoose.connection.close();
    console.log('✅ Initial data creation completed');

  } catch (error) {
    console.error('❌ Error creating initial data:', error.message);
    process.exit(1);
  }
}

createTestData();
`;

  try {
    writeFileSync(join(__dirname, 'create-test-data.js'), testScript);
    success('Created test data script');

    info('You can run the test data script with: node create-test-data.js');
    return true;
  } catch (error) {
    error(`Failed to create test data script: ${error.message}`);
    return false;
  }
}

// Main setup function
async function main() {
  console.clear();
  header('🚀 MongoDB Local Setup Script for CAPA Events API');

  info('This script will help you set up MongoDB locally for the CAPA Events API');

  // Step 1: Check current installation
  const isInstalled = checkMongoDBInstallation();

  // Step 2: Install if needed
  if (!isInstalled) {
    warning('MongoDB is not installed. Attempting to install...');
    const installSuccess = installMongoDB();

    if (!installSuccess) {
      error('Failed to install MongoDB automatically');
      info('Please install MongoDB manually and run this script again');
      process.exit(1);
    }
  }

  // Step 3: Check if MongoDB is running
  const isRunning = checkMongoDBStatus();

  // Step 4: Start MongoDB if not running
  if (!isRunning) {
    warning('MongoDB is not running. Attempting to start...');
    const startSuccess = startMongoDB();

    if (!startSuccess) {
      error('Failed to start MongoDB');
      info('Please start MongoDB manually and run this script again');
      process.exit(1);
    }

    // Wait a moment for MongoDB to fully start
    info('Waiting for MongoDB to fully start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Step 5: Create environment configuration
  createEnvFile();

  // Step 6: Test the connection
  const connectionSuccess = await testConnection();

  if (!connectionSuccess) {
    error('Database connection test failed');
    process.exit(1);
  }

  // Step 7: Create initial test data
  createInitialData();

  // Final success message
  header('🎉 Setup Complete!');
  success('MongoDB is installed, running, and configured');
  success('Environment file created');
  success('Database connection verified');

  console.log('\n📋 Next Steps:');
  console.log('1. Start your server: npm start');
  console.log('2. Test the API: node test-simple-events.js');
  console.log('3. Create sample data: node create-test-data.js');
  console.log('4. Access your API at: http://localhost:3001/api/simple-events');

  console.log('\n🔧 Useful Commands:');
  console.log('- Check MongoDB status: mongosh --eval "db.runCommand({ ping: 1 })"');
  console.log('- View databases: mongosh --eval "show dbs"');
  console.log('- Connect to your database: mongosh capa-events');

  const os = platform();
  if (os === 'darwin') {
    console.log('- Stop MongoDB: brew services stop mongodb/brew/mongodb-community');
    console.log('- Restart MongoDB: brew services restart mongodb/brew/mongodb-community');
  } else if (os === 'linux') {
    console.log('- Stop MongoDB: sudo systemctl stop mongod');
    console.log('- Restart MongoDB: sudo systemctl restart mongod');
    console.log('- Check status: sudo systemctl status mongod');
  }

  console.log('\n💡 Tips:');
  console.log('- MongoDB data is stored locally on your machine');
  console.log('- Your database name is "capa-events"');
  console.log('- Default connection: mongodb://localhost:27017/capa-events');
  console.log('- For production, consider using MongoDB Atlas or a dedicated server');
}

// Run the setup
main().catch(error => {
  error(`Setup failed: ${error.message}`);
  process.exit(1);
});
