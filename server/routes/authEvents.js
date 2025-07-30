import express from "express";
import { body, validationResult } from "express-validator";
import SimpleEvent from "../models/SimpleEvent.js";
import { verifyToken, optionalAuth, requireAdmin } from "../middleware/auth0.js";

const router = express.Router();

// Validation middleware for creating/updating events
const validateEvent = [
  body("startdate")
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  body("enddate")
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  body("type")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Type is required and must be between 1-100 characters"),
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title is required and must be between 1-200 characters"),
  body("description")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Description is required and must be between 1-2000 characters"),
];

// Helper function to extract user info from Auth0 token
const extractUserInfo = (user) => ({
  userId: user.sub,
  email: user.email,
  name: user.name || user.nickname || user.email,
  nickname: user.nickname,
  picture: user.picture
});

// Helper function to check if user owns an event
const checkEventOwnership = async (eventId, userId) => {
  const event = await SimpleEvent.findById(eventId);
  if (!event) {
    return { found: false, owns: false, event: null };
  }
  return {
    found: true,
    owns: event.creator.userId === userId,
    event: event
  };
};

// GET /api/auth-events - Get all events (public with optional user context)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      creator,
      upcoming,
      search,
      startDate,
      endDate,
      sortBy = "startdate",
      sortOrder = "asc",
      myEvents = false
    } = req.query;

    // Build filter object
    const filter = {};

    if (type) filter.type = new RegExp(type, "i");
    if (creator) filter["creator.name"] = new RegExp(creator, "i");

    // Filter for upcoming events
    if (upcoming === "true") {
      filter.startdate = { $gte: new Date() };
    }

    // Filter for user's own events (requires authentication)
    if (myEvents === "true" && req.user) {
      filter["creator.userId"] = req.user.sub;
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.startdate = {};
      if (startDate) filter.startdate.$gte = new Date(startDate);
      if (endDate) filter.startdate.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { type: new RegExp(search, "i") },
        { "creator.name": new RegExp(search, "i") },
        { "creator.email": new RegExp(search, "i") }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const events = await SimpleEvent.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const total = await SimpleEvent.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
      userContext: req.user ? {
        userId: req.user.sub,
        email: req.user.email,
        name: req.user.name || req.user.nickname
      } : null
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch events",
      message: error.message,
    });
  }
});

// GET /api/auth-events/my - Get current user's events (requires auth)
router.get("/my", verifyToken, async (req, res) => {
  try {
    const { limit = 10, upcoming } = req.query;

    const filter = { "creator.userId": req.user.sub };

    if (upcoming === "true") {
      filter.startdate = { $gte: new Date() };
    }

    const events = await SimpleEvent.find(filter)
      .sort({ startdate: 1 })
      .limit(parseInt(limit))
      .select("-__v");

    res.json({
      success: true,
      data: events,
      count: events.length,
      user: extractUserInfo(req.user)
    });
  } catch (error) {
    console.error("Error fetching user events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch your events",
      message: error.message,
    });
  }
});

// GET /api/auth-events/upcoming - Get upcoming events
router.get("/upcoming", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const events = await SimpleEvent.findUpcoming(parseInt(limit));

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch upcoming events",
      message: error.message,
    });
  }
});

// GET /api/auth-events/by-type/:type - Get events by type
router.get("/by-type/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const events = await SimpleEvent.findByType(type, parseInt(limit));

    res.json({
      success: true,
      data: events,
      type: type,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching events by type:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch events by type",
      message: error.message,
    });
  }
});

// GET /api/auth-events/stats - Get event statistics
router.get("/stats", optionalAuth, async (req, res) => {
  try {
    const totalEvents = await SimpleEvent.countDocuments();
    const upcomingEvents = await SimpleEvent.countDocuments({
      startdate: { $gte: new Date() },
    });

    // Get events by type
    const typeStats = await SimpleEvent.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get events by creator
    const creatorStats = await SimpleEvent.aggregate([
      { $group: { _id: "$creator.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get user-specific stats if authenticated
    let userStats = null;
    if (req.user) {
      const userEventCount = await SimpleEvent.countDocuments({
        "creator.userId": req.user.sub
      });
      const userUpcomingCount = await SimpleEvent.countDocuments({
        "creator.userId": req.user.sub,
        startdate: { $gte: new Date() }
      });

      userStats = {
        totalEvents: userEventCount,
        upcomingEvents: userUpcomingCount
      };
    }

    // Get events by month for the current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await SimpleEvent.aggregate([
      {
        $match: {
          startdate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$startdate" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          upcomingEvents,
        },
        types: typeStats,
        creators: creatorStats,
        monthly: monthlyStats,
        userStats: userStats
      },
    });
  } catch (error) {
    console.error("Error fetching event statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch event statistics",
      message: error.message,
    });
  }
});

// GET /api/auth-events/:id - Get a specific event by ID
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await SimpleEvent.findById(id).select("-__v");

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    // Add ownership info if user is authenticated
    const response = {
      success: true,
      data: event
    };

    if (req.user) {
      response.ownership = {
        isOwner: event.creator.userId === req.user.sub,
        canEdit: event.creator.userId === req.user.sub,
        canDelete: event.creator.userId === req.user.sub
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching event:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch event",
      message: error.message,
    });
  }
});

// POST /api/auth-events - Create a new event (requires auth)
router.post("/", verifyToken, validateEvent, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { startdate, enddate, type, title, description } = req.body;

    // Additional validation: end date should be after start date
    if (new Date(startdate) > new Date(enddate)) {
      return res.status(400).json({
        success: false,
        error: "End date must be after or equal to start date",
      });
    }

    // Create new event with authenticated user as creator
    const event = new SimpleEvent({
      startdate,
      enddate,
      type,
      title,
      description,
      creator: extractUserInfo(req.user)
    });

    const savedEvent = await event.save();

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: savedEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create event",
      message: error.message,
    });
  }
});

// PUT /api/auth-events/:id - Update an event (requires auth and ownership)
router.put("/:id", verifyToken, validateEvent, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { startdate, enddate, type, title, description } = req.body;

    // Check ownership
    const { found, owns, event } = await checkEventOwnership(id, req.user.sub);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    if (!owns) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only edit events you created.",
        details: {
          eventCreator: event.creator.name,
          requestUser: req.user.name || req.user.nickname || req.user.email
        }
      });
    }

    // Additional validation: end date should be after start date
    if (new Date(startdate) > new Date(enddate)) {
      return res.status(400).json({
        success: false,
        error: "End date must be after or equal to start date",
      });
    }

    const updateData = {
      startdate,
      enddate,
      type,
      title,
      description,
      // Keep original creator info but update name/picture if changed
      creator: {
        ...event.creator,
        name: req.user.name || req.user.nickname || req.user.email,
        nickname: req.user.nickname,
        picture: req.user.picture
      }
    };

    const updatedEvent = await SimpleEvent.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      select: "-__v",
    });

    res.json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
      });
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update event",
      message: error.message,
    });
  }
});

// PATCH /api/auth-events/:id - Partially update an event (requires auth and ownership)
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check ownership
    const { found, owns, event } = await checkEventOwnership(id, req.user.sub);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    if (!owns) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only edit events you created.",
        details: {
          eventCreator: event.creator.name,
          requestUser: req.user.name || req.user.nickname || req.user.email
        }
      });
    }

    // Remove empty fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === "") {
        delete updateData[key];
      }
    });

    // Don't allow direct creator modification
    delete updateData.creator;

    // Additional validation for dates if both are provided
    if (updateData.startdate && updateData.enddate) {
      if (new Date(updateData.startdate) > new Date(updateData.enddate)) {
        return res.status(400).json({
          success: false,
          error: "End date must be after or equal to start date",
        });
      }
    }

    // Update creator info with latest from token
    updateData.creator = {
      ...event.creator,
      name: req.user.name || req.user.nickname || req.user.email,
      nickname: req.user.nickname,
      picture: req.user.picture
    };

    const updatedEvent = await SimpleEvent.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      select: "-__v",
    });

    res.json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
      });
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update event",
      message: error.message,
    });
  }
});

// DELETE /api/auth-events/:id - Delete an event (requires auth and ownership)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { found, owns, event } = await checkEventOwnership(id, req.user.sub);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    if (!owns) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only delete events you created.",
        details: {
          eventCreator: event.creator.name,
          requestUser: req.user.name || req.user.nickname || req.user.email
        }
      });
    }

    await SimpleEvent.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Event deleted successfully",
      data: {
        deletedEvent: {
          id: event._id,
          title: event.title,
          creator: event.creator.name
        },
      },
    });
  } catch (error) {
    console.error("Error deleting event:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete event",
      message: error.message,
    });
  }
});

// Admin-only route to delete any event
router.delete("/admin/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await SimpleEvent.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }

    res.json({
      success: true,
      message: "Event deleted by admin",
      data: {
        deletedEvent: {
          id: event._id,
          title: event.title,
          creator: event.creator.name
        },
        adminUser: req.user.email
      },
    });
  } catch (error) {
    console.error("Error deleting event (admin):", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete event",
      message: error.message,
    });
  }
});

export default router;
