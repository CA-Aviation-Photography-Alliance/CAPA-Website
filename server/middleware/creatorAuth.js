import SimpleEvent from "../models/SimpleEvent.js";

/**
 * Middleware to verify that the request creator matches the event creator
 * This protects events from being edited by unauthorized users
 */
const verifyCreator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator } = req.body;

    // Skip verification for certain operations that don't require creator auth
    if (req.method === "GET" || req.method === "DELETE") {
      return next();
    }

    // Check if creator is provided in the request
    if (!creator) {
      return res.status(400).json({
        success: false,
        error: "Creator field is required for event modifications",
        code: "CREATOR_REQUIRED",
      });
    }

    // Find the existing event
    const existingEvent = await SimpleEvent.findById(id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    // Check if the creator matches
    if (existingEvent.creator !== creator) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only edit events you created.",
        details: {
          eventCreator: existingEvent.creator,
          requestCreator: creator,
        },
        code: "CREATOR_MISMATCH",
      });
    }

    // If we get here, the creator is authorized
    next();
  } catch (error) {
    console.error("Creator verification error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      success: false,
      error: "Creator verification failed",
      message: error.message,
      code: "VERIFICATION_ERROR",
    });
  }
};

/**
 * Middleware to optionally verify creator (allows admin override)
 * Use this when you want to allow admin users to edit any event
 */
const optionalCreatorVerify = (adminOverride = false) => {
  return async (req, res, next) => {
    try {
      // If admin override is enabled and request has admin flag, skip verification
      if (adminOverride && req.headers["x-admin-override"] === "true") {
        console.log("Admin override enabled for event modification");
        return next();
      }

      // Otherwise, use normal creator verification
      return verifyCreator(req, res, next);
    } catch (error) {
      return verifyCreator(req, res, next);
    }
  };
};

/**
 * Middleware for creator verification with custom error messages
 */
const strictCreatorVerify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator } = req.body;

    // Always require creator for strict mode
    if (!creator || creator.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Creator identification is required",
        message: "You must provide your creator name to modify this event",
        code: "CREATOR_REQUIRED",
      });
    }

    const existingEvent = await SimpleEvent.findById(id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        message: "The event you are trying to modify does not exist",
        code: "EVENT_NOT_FOUND",
      });
    }

    // Strict comparison (case-sensitive)
    if (existingEvent.creator !== creator.trim()) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized modification attempt",
        message: `Only "${existingEvent.creator}" can modify this event. You identified as "${creator}".`,
        details: {
          eventTitle: existingEvent.title,
          eventCreator: existingEvent.creator,
          requestCreator: creator.trim(),
          eventId: existingEvent._id,
        },
        code: "UNAUTHORIZED_MODIFICATION",
      });
    }

    next();
  } catch (error) {
    console.error("Strict creator verification error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event identifier",
        message: "The provided event ID is not valid",
        code: "INVALID_EVENT_ID",
      });
    }

    res.status(500).json({
      success: false,
      error: "Authorization check failed",
      message: "Unable to verify your permissions for this event",
      code: "AUTH_CHECK_FAILED",
    });
  }
};

/**
 * Case-insensitive creator verification (more flexible)
 */
const flexibleCreatorVerify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator } = req.body;

    if (!creator) {
      return res.status(400).json({
        success: false,
        error: "Creator field is required",
        code: "CREATOR_REQUIRED",
      });
    }

    const existingEvent = await SimpleEvent.findById(id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    // Case-insensitive comparison
    if (existingEvent.creator.toLowerCase() !== creator.trim().toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Creator mismatch",
        message: "You can only modify events you created",
        details: {
          eventCreator: existingEvent.creator,
          requestCreator: creator,
        },
        code: "CREATOR_MISMATCH",
      });
    }

    next();
  } catch (error) {
    console.error("Flexible creator verification error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      success: false,
      error: "Creator verification failed",
      message: error.message,
      code: "VERIFICATION_ERROR",
    });
  }
};

/**
 * Middleware for DELETE operations - verifies creator via query parameter
 * Usage: DELETE /api/simple-events/:id?creator=CreatorName
 */
const verifyCreatorForDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { creator } = req.query;

    // Check if creator is provided in query params
    if (!creator) {
      return res.status(400).json({
        success: false,
        error: "Creator parameter is required for deletion",
        message: "Add ?creator=YourName to the URL to verify ownership",
        example: `/api/simple-events/${id}?creator=YourName`,
        code: "CREATOR_REQUIRED",
      });
    }

    // Find the existing event
    const existingEvent = await SimpleEvent.findById(id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    // Check if the creator matches
    if (existingEvent.creator !== creator.trim()) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only delete events you created.",
        details: {
          eventTitle: existingEvent.title,
          eventCreator: existingEvent.creator,
          requestCreator: creator.trim(),
        },
        code: "DELETE_UNAUTHORIZED",
      });
    }

    // If we get here, the creator is authorized
    next();
  } catch (error) {
    console.error("Creator verification error for DELETE:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID format",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      success: false,
      error: "Creator verification failed",
      message: error.message,
      code: "VERIFICATION_ERROR",
    });
  }
};

export {
  verifyCreator,
  optionalCreatorVerify,
  strictCreatorVerify,
  flexibleCreatorVerify,
  verifyCreatorForDelete,
};
export default verifyCreator;
