import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 CAPA Website - Environment Check\n');

// Check if .env file exists
const envPath = join(__dirname, '.env');
const envExists = existsSync(envPath);

console.log(`📁 .env file check:`);
console.log(`   Path: ${envPath}`);
console.log(`   Exists: ${envExists ? '✅ Yes' : '❌ No'}\n`);

if (!envExists) {
    console.log('❌ ISSUE: .env file not found!');
    console.log('\n🔧 TO FIX:');
    console.log('1. Create a .env file in the client folder');
    console.log('2. Add these lines:');
    console.log('   PUBLIC_AUTH0_DOMAIN=dev-0liox5crqklfjp87.us.auth0.com');
    console.log('   PUBLIC_AUTH0_CLIENT_ID=your-actual-client-id');
    console.log('\n📍 Get your Client ID from: https://manage.auth0.com');
    process.exit(1);
}

// Read and parse .env file
try {
    const envContent = readFileSync(envPath, 'utf8');
    console.log('📄 .env file contents:');
    console.log('---');
    console.log(envContent);
    console.log('---\n');

    // Parse environment variables
    const envVars = {};
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });

    // Check required variables
    const requiredVars = ['PUBLIC_AUTH0_DOMAIN', 'PUBLIC_AUTH0_CLIENT_ID'];
    let allPresent = true;

    console.log('🔑 Environment Variables Check:');
    requiredVars.forEach(varName => {
        const value = envVars[varName];
        const present = !!value;
        const masked = present ? value.substring(0, 10) + '...' : 'MISSING';

        console.log(`   ${varName}: ${present ? '✅' : '❌'} ${masked}`);

        if (!present) {
            allPresent = false;
        }
    });

    console.log('');

    if (allPresent) {
        console.log('✅ SUCCESS: All required environment variables are present!');
        console.log('\n🚀 Next steps:');
        console.log('1. Restart your dev server: npm run dev');
        console.log('2. Go to: http://localhost:5173/auth-test');
        console.log('3. In Auth0 dashboard, add this URL to all allowed URLs:');
        console.log('   http://localhost:5173');
    } else {
        console.log('❌ ISSUE: Missing required environment variables!');
        console.log('\n🔧 TO FIX:');
        console.log('1. Add the missing variables to your .env file');
        console.log('2. Get your Client ID from Auth0 dashboard');
        console.log('3. Restart your dev server');
    }

} catch (error) {
    console.log('❌ ERROR reading .env file:', error.message);
}

console.log('\n📚 Need help?');
console.log('- Auth0 Dashboard: https://manage.auth0.com');
console.log('- Setup Guide: AUTH0_SETUP.md');
console.log('- Test Page: http://localhost:5173/auth-test');
