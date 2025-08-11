#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function configureLocalDB() {
  console.log("\n" + "=".repeat(60));
  colorLog("cyan", "  🔧 Configure Local MongoDB");
  console.log("=".repeat(60));

  const envPath = join(__dirname, ".env");
  const envExamplePath = join(__dirname, ".env.example");

  // Local MongoDB configuration
  const localConfig = `# MongoDB Configuration (Local)
MONGODB_URI=mongodb://localhost:27017/capa-events

# Server Configuration
PORT=3003
NODE_ENV=development

# Optional: Add other environment variables below
`;

  try {
    let currentEnv = "";
    let envExists = false;

    // Read current .env if it exists
    if (existsSync(envPath)) {
      currentEnv = readFileSync(envPath, "utf8");
      envExists = true;
      colorLog("blue", "📄 Found existing .env file");
    }

    // Check if already configured for local MongoDB
    if (currentEnv.includes("mongodb://localhost:27017/capa-events")) {
      colorLog("green", "✅ .env file already configured for local MongoDB");
      return true;
    }

    // Check if it has Atlas configuration
    const hasAtlasConfig =
      currentEnv.includes("mongodb+srv://") ||
      currentEnv.includes("@cluster") ||
      currentEnv.includes("mongodb.net");

    if (hasAtlasConfig) {
      colorLog("yellow", "⚠️  Found MongoDB Atlas configuration");
      console.log("   Switching to local MongoDB...");

      // Replace Atlas URI with local URI
      const updatedEnv = currentEnv.replace(
        /MONGODB_URI=mongodb\+srv:\/\/[^\n]+/g,
        "MONGODB_URI=mongodb://localhost:27017/capa-events",
      );

      writeFileSync(envPath, updatedEnv);
      colorLog("green", "✅ Updated .env to use local MongoDB");
    } else {
      // Create new .env file or add missing MONGODB_URI
      if (envExists) {
        // Add MONGODB_URI to existing .env
        const lines = currentEnv.split("\n");
        const hasMongoUri = lines.some((line) =>
          line.startsWith("MONGODB_URI="),
        );

        if (!hasMongoUri) {
          const updatedEnv =
            currentEnv +
            "\n# MongoDB Configuration\nMONGODB_URI=mongodb://localhost:27017/capa-events\n";
          writeFileSync(envPath, updatedEnv);
          colorLog("green", "✅ Added local MongoDB URI to existing .env");
        }
      } else {
        // Create new .env file
        writeFileSync(envPath, localConfig);
        colorLog(
          "green",
          "✅ Created new .env file with local MongoDB configuration",
        );
      }
    }

    // Also update .env.example
    if (existsSync(envExamplePath)) {
      const exampleContent = readFileSync(envExamplePath, "utf8");
      if (!exampleContent.includes("mongodb://localhost:27017/capa-events")) {
        writeFileSync(envExamplePath, localConfig);
        colorLog(
          "green",
          "✅ Updated .env.example with local MongoDB configuration",
        );
      }
    } else {
      writeFileSync(envExamplePath, localConfig);
      colorLog(
        "green",
        "✅ Created .env.example with local MongoDB configuration",
      );
    }

    console.log("\n📋 Configuration Summary:");
    console.log("   Database: capa-events");
    console.log("   Host: localhost");
    console.log("   Port: 27017");
    console.log("   Full URI: mongodb://localhost:27017/capa-events");

    console.log("\n🚀 Next Steps:");
    console.log("   1. Make sure MongoDB is running: npm run db:status");
    console.log("   2. Start your server: npm start");
    console.log("   3. Test the API: npm run test-api");

    return true;
  } catch (error) {
    console.error(`❌ Error configuring .env: ${error.message}`);
    return false;
  }
}

// Check MongoDB status
function checkMongoStatus() {
  try {
    execSync('mongosh --eval "db.runCommand({ ping: 1 })" --quiet', {
      stdio: "ignore",
      timeout: 3000,
    });
    colorLog("green", "✅ MongoDB is running and accessible");
    return true;
  } catch {
    colorLog("yellow", "⚠️  MongoDB is not running or not accessible");
    console.log("   Start MongoDB with: npm run db:start");
    return false;
  }
}

// Main function
function main() {
  console.clear();

  const success = configureLocalDB();

  if (success) {
    console.log("\n" + "=".repeat(60));
    colorLog("cyan", "  🔍 Checking MongoDB Status");
    console.log("=".repeat(60));

    checkMongoStatus();

    console.log("\n🎉 Configuration completed successfully!");
    console.log("\nYour API is now configured to use local MongoDB.");
    console.log('Run "npm start" to start your server.');
  } else {
    console.error("\n❌ Configuration failed");
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error("❌ Script failed:", error.message);
  process.exit(1);
}
