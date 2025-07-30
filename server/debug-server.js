import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Starting debug server...');
console.log('=========================');

// Check environment
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('- PORT:', process.env.PORT || 'undefined');
console.log('- AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN ? 'SET' : 'MISSING');
console.log('- AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE ? 'SET' : 'MISSING');

const app = express();

// Basic middleware
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Debug server is working!',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      auth0Configured: !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE)
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Try different ports
const ports = [3001, 3000, 5000, 8000];
let serverStarted = false;

async function tryStartServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(server);
      }
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function startServer() {
  for (const port of ports) {
    try {
      console.log(`\nTrying port ${port}...`);
      const server = await tryStartServer(port);

      console.log(`✅ Server started successfully!`);
      console.log(`🌐 Listening on port ${port}`);
      console.log(`📍 URL: http://localhost:${port}`);
      console.log(`🔍 Health check: http://localhost:${port}/health`);

      serverStarted = true;

      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT - shutting down gracefully');
        server.close(() => {
          console.log('✅ Server closed');
          process.exit(0);
        });
      });

      break;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`❌ Port ${port} is in use`);
      } else {
        console.log(`❌ Failed to start on port ${port}:`, error.message);
      }
    }
  }

  if (!serverStarted) {
    console.log('\n❌ Could not start server on any port');
    console.log('Ports tried:', ports.join(', '));
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
