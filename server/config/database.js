import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    // Check if we have a local MongoDB first, then fallback to Atlas
    let mongoURI;

    // If MONGODB_URI is explicitly set in .env, use it
    if (
      process.env.MONGODB_URI &&
      !process.env.MONGODB_URI.includes("localhost")
    ) {
      mongoURI = process.env.MONGODB_URI;
      console.log("Using MongoDB Atlas connection from .env");
    } else {
      // Default to local MongoDB
      mongoURI = "mongodb://localhost:27017/capa-events";
      console.log("Using local MongoDB connection");
    }

    console.log("Attempting to connect to MongoDB...");
    console.log(`Connection URI: ${mongoURI.replace(/\/\/.*@/, "//***:***@")}`); // Hide credentials in logs

    const conn = await mongoose.connect(mongoURI, {
      // Connection options for local MongoDB
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Port: ${conn.connection.port}`);
    console.log(`   Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n🔄 Gracefully shutting down...");
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);

    // Provide helpful error messages for common issues
    if (error.message.includes("ECONNREFUSED")) {
      console.error(
        "\n💡 MongoDB connection refused - MongoDB is not running locally.",
      );
      console.error("   To start MongoDB locally:");
      console.error(
        "   - macOS: brew services start mongodb/brew/mongodb-community",
      );
      console.error("   - Linux: sudo systemctl start mongod");
      console.error("   - Windows: net start MongoDB");
      console.error(
        "   - Docker: docker run -d -p 27017:27017 --name mongodb mongo",
      );
      console.error("\n   Or run the setup script: npm run setup-db");
    } else if (error.message.includes("authentication failed")) {
      console.error(
        "\n💡 Authentication failed. Check your MongoDB credentials.",
      );
    } else if (
      error.message.includes("ENOTFOUND") ||
      error.message.includes("querySrv")
    ) {
      console.error("\n💡 Cannot resolve MongoDB host. This usually means:");
      console.error(
        "   1. You're trying to connect to MongoDB Atlas but don't have internet",
      );
      console.error("   2. The Atlas connection string is incorrect");
      console.error("   3. You should use local MongoDB instead");
      console.error("\n   To use local MongoDB, update your .env file:");
      console.error("   MONGODB_URI=mongodb://localhost:27017/capa-events");
    }

    console.error("\n🔧 Setup Help:");
    console.error(
      "   1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/",
    );
    console.error("   2. Start MongoDB service");
    console.error(
      "   3. Or set MONGODB_URI in .env file for custom connection",
    );

    process.exit(1);
  }
};

export default connectDB;
