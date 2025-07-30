import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import connectDB from "./config/database.js";
import eventRoutes from "./routes/events.js";
import simpleEventRoutes from "./routes/simpleEvents.js";
import authEventRoutes from "./routes/authEvents.js";
import { auth0ErrorHandler } from "./middleware/auth0.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Load airports data
let airportsData;
try {
  const airportsPath = join(__dirname, "data", "airports.json");
  airportsData = JSON.parse(readFileSync(airportsPath, "utf8"));
} catch (error) {
  console.error("Error loading airports data:", error);
  airportsData = [];
}

// Routes
app.get("/api/airports", (req, res) => {
  try {
    // Optional query parameters for filtering
    const { city, code } = req.query;

    let filteredAirports = airportsData;

    if (city) {
      filteredAirports = filteredAirports.filter((airport) =>
        airport.city.toLowerCase().includes(city.toLowerCase()),
      );
    }

    if (code) {
      filteredAirports = filteredAirports.filter(
        (airport) => airport.code.toLowerCase() === code.toLowerCase(),
      );
    }

    res.json({
      success: true,
      count: filteredAirports.length,
      data: filteredAirports,
    });
  } catch (error) {
    console.error("Error serving airports data:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get specific airport by IATA code
app.get("/api/airports/:code", (req, res) => {
  try {
    const { code } = req.params;
    const airport = airportsData.find(
      (airport) => airport.code.toLowerCase() === code.toLowerCase(),
    );

    if (!airport) {
      return res.status(404).json({
        success: false,
        error: "Airport not found",
      });
    }

    res.json({
      success: true,
      data: airport,
    });
  } catch (error) {
    console.error("Error serving airport data:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Event routes
app.use("/api/events", eventRoutes);
app.use("/api/simple-events", simpleEventRoutes);
app.use("/api/auth-events", authEventRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "CAPA Website Server",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Auth0 error handling middleware
app.use(auth0ErrorHandler);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Airports API available at http://localhost:${PORT}/api/airports`,
  );
  console.log(`Loaded ${airportsData.length} airports`);
});

export default app;
