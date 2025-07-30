import express from 'express';
import dotenv from 'dotenv';
import { verifyToken, devBypass } from './middleware/auth0.js';

dotenv.config();

console.log('🧪 Testing Server Startup');
console.log('=========================\n');

const app = express();

// Test Auth0 configuration
console.log('📋 Environment Variables Check:');
console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN ? '✅ Set' : '❌ Missing');
console.log('AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('AUTH_BYPASS:', process.env.AUTH_BYPASS || 'false');

// Test middleware loading
console.log('\n🔧 Testing Middleware Loading:');
try {
  console.log('Auth0 middleware imported:', '✅ Success');

  // Test a simple route with bypass
  app.get('/test-bypass', devBypass, (req, res) => {
    res.json({
      success: true,
      message: 'Server is working',
      user: req.user || null,
      timestamp: new Date().toISOString()
    });
  });

  // Test a route without auth
  app.get('/test-noauth', (req, res) => {
    res.json({
      success: true,
      message: 'No auth route working',
      timestamp: new Date().toISOString()
    });
  });

  console.log('Routes configured:', '✅ Success');
} catch (error) {
  console.log('Middleware error:', '❌', error.message);
  process.exit(1);
}

// Test server startup
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n🚀 Server Startup Test Results:');
  console.log('================================');
  console.log(`✅ Server started successfully on port ${PORT}`);

  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
    console.log('⚠️  Auth0 not configured - using development mode');
    console.log('📝 To fix: Set AUTH0_DOMAIN and AUTH0_AUDIENCE in .env file');
  } else {
    console.log('✅ Auth0 configuration detected');
  }

  console.log('\n🧪 Test endpoints available:');
  console.log(`   GET http://localhost:${PORT}/test-noauth`);
  console.log(`   GET http://localhost:${PORT}/test-bypass`);

  console.log('\n💡 To test these endpoints, run:');
  console.log(`   curl http://localhost:${PORT}/test-noauth`);
  console.log(`   curl http://localhost:${PORT}/test-bypass`);

  // Auto-shutdown after 30 seconds
  setTimeout(() => {
    console.log('\n🛑 Test complete - shutting down server');
    server.close();
    process.exit(0);
  }, 30000);
});

server.on('error', (error) => {
  console.log('\n❌ Server startup failed:');
  console.error(error.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT - shutting down gracefully');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM - shutting down gracefully');
  server.close();
  process.exit(0);
});
