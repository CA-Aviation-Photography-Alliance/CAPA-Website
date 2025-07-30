import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Auth0 Environment Setup');
console.log('============================\n');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Create .env.example with all required variables
const envExampleContent = `# Auth0 Configuration for Server
# Get these values from your Auth0 Dashboard

# Your Auth0 domain (e.g., dev-12345.us.auth0.com)
AUTH0_DOMAIN=your-domain.auth0.com

# Your Auth0 API audience/identifier
# This is the identifier for your API in Auth0 Dashboard > APIs
AUTH0_AUDIENCE=https://your-api-identifier

# Optional: Auth0 Management API credentials (for user management)
AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret

# Development settings
NODE_ENV=development
AUTH_BYPASS=false

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/capa-events

# Server Configuration
PORT=5000
`;

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('📄 .env file already exists');

  // Read current .env file
  const currentEnv = fs.readFileSync(envPath, 'utf8');

  // Check for required variables
  const requiredVars = ['AUTH0_DOMAIN', 'AUTH0_AUDIENCE'];
  const missingVars = [];

  requiredVars.forEach(varName => {
    if (!currentEnv.includes(varName) || currentEnv.includes(`${varName}=your-`) || currentEnv.includes(`${varName}=`)) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log(`❌ Missing or incomplete Auth0 configuration:`);
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n📝 Please update your .env file with the correct values.');
  } else {
    console.log('✅ Auth0 configuration appears to be set up');
  }
} else {
  console.log('📄 Creating .env file...');
  fs.writeFileSync(envPath, envExampleContent);
  console.log('✅ Created .env file');
}

// Always create/update .env.example
console.log('📄 Creating/updating .env.example...');
fs.writeFileSync(envExamplePath, envExampleContent);
console.log('✅ Created .env.example file\n');

console.log('🔍 Next Steps:');
console.log('==============');
console.log('1. Go to your Auth0 Dashboard (https://manage.auth0.com/)');
console.log('2. Get your Auth0 domain and audience/API identifier');
console.log('3. Edit the .env file and replace the placeholder values:');
console.log('   - AUTH0_DOMAIN: Your Auth0 domain (without https://)');
console.log('   - AUTH0_AUDIENCE: Your API identifier from Auth0 Dashboard > APIs');
console.log('\n📋 How to find these values:');
console.log('============================');
console.log('AUTH0_DOMAIN:');
console.log('  - Found in Auth0 Dashboard > Applications > [Your App] > Settings');
console.log('  - Example: dev-12345.us.auth0.com');
console.log('');
console.log('AUTH0_AUDIENCE:');
console.log('  - Go to Auth0 Dashboard > APIs');
console.log('  - Create an API if you haven\'t already (name it "CAPA Events API")');
console.log('  - The "Identifier" field is your AUTH0_AUDIENCE');
console.log('  - Example: https://capa-events-api');
console.log('');
console.log('💡 For development, you can also set AUTH_BYPASS=true to skip authentication');
console.log('   (This should NEVER be used in production!)');
console.log('');
console.log('🚀 After setting up the environment variables, run:');
console.log('   npm start');
