import jwt from "jsonwebtoken";
import jwksClient from "jwks-client";
import dotenv from "dotenv";

dotenv.config();

// Initialize JWKS client only if Auth0 is configured
let client = null;

function initializeJwksClient() {
  if (!process.env.AUTH0_DOMAIN) {
    console.warn(
      "⚠️  AUTH0_DOMAIN not configured - JWKS client not initialized",
    );
    return null;
  }

  return jwksClient({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    requestHeaders: {}, // Optional
    timeout: 30000, // Defaults to 30s
    cache: true,
    cacheMaxEntries: 5, // Default value
    cacheMaxAge: 600 * 1000, // 10 minutes in milliseconds (explicit calculation)
  });
}

// Initialize client
client = initializeJwksClient();

// Function to get the signing key
function getKey(header, callback) {
  if (!client) {
    return callback(
      new Error("JWKS client not initialized - Auth0 configuration missing"),
    );
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// JWT verification options
const jwtOptions = {
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"],
};

/**
 * Middleware to verify Auth0 JWT tokens
 * Adds user information to req.user
 */
export const verifyToken = (req, res, next) => {
  // Check if Auth0 is properly configured
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
    console.error(
      "Auth0 configuration missing. Please set AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.",
    );
    return res.status(500).json({
      success: false,
      error: "Server configuration error",
      message: "Authentication service not properly configured",
      code: "CONFIG_ERROR",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
      message: "Please provide an Authorization header with a valid token",
      code: "MISSING_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1]; // Remove 'Bearer ' prefix

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Invalid token format",
      message: "Authorization header must be in format: Bearer <token>",
      code: "INVALID_TOKEN_FORMAT",
    });
  }

  jwt.verify(token, getKey, jwtOptions, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err.message);

      let errorMessage = "Invalid or expired token";
      let errorCode = "INVALID_TOKEN";

      if (err.name === "TokenExpiredError") {
        errorMessage = "Token has expired";
        errorCode = "TOKEN_EXPIRED";
      } else if (err.name === "JsonWebTokenError") {
        errorMessage = "Invalid token";
        errorCode = "INVALID_TOKEN";
      } else if (err.name === "NotBeforeError") {
        errorMessage = "Token not active yet";
        errorCode = "TOKEN_NOT_ACTIVE";
      }

      return res.status(401).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }

    // Add user information to request object
    req.user = {
      sub: decoded.sub, // Auth0 user ID
      email: decoded.email,
      nickname: decoded.nickname,
      name: decoded.name,
      picture: decoded.picture,
      email_verified: decoded.email_verified,
      aud: decoded.aud,
      iss: decoded.iss,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  });
};

/**
 * Optional middleware - allows both authenticated and unauthenticated requests
 * If token is provided and valid, adds user to req.user
 * If no token or invalid token, continues without req.user
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token provided, continue without authentication
    return next();
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    // Invalid format, continue without authentication
    return next();
  }

  jwt.verify(token, getKey, jwtOptions, (err, decoded) => {
    if (err) {
      // Invalid token, continue without authentication
      console.warn("Optional auth - invalid token:", err.message);
      return next();
    }

    // Valid token, add user information
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      nickname: decoded.nickname,
      name: decoded.name,
      picture: decoded.picture,
      email_verified: decoded.email_verified,
      aud: decoded.aud,
      iss: decoded.iss,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  });
};

/**
 * Middleware to require specific scopes
 * @param {string[]} requiredScopes - Array of required scopes
 */
export const requireScopes = (requiredScopes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const userScopes = req.user.scope ? req.user.scope.split(" ") : [];
    const hasRequiredScopes = requiredScopes.every((scope) =>
      userScopes.includes(scope),
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        message: `Required scopes: ${requiredScopes.join(", ")}`,
        code: "INSUFFICIENT_SCOPE",
      });
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * Compares req.user.sub with event creator or provided user ID
 */
export const requireOwnership = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }

  // This will be used in combination with event lookup
  // The actual ownership check will be done in the route handler
  next();
};

/**
 * Admin check middleware
 * Checks if user has admin role or specific admin claim
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }

  // Check for admin role in user metadata or custom claims
  const isAdmin =
    req.user["https://capa-events.com/roles"]?.includes("admin") ||
    req.user.app_metadata?.roles?.includes("admin") ||
    req.user.user_metadata?.role === "admin";

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
      code: "ADMIN_REQUIRED",
    });
  }

  next();
};

/**
 * Development middleware to bypass authentication
 * Only use in development environment
 */
export const devBypass = (req, res, next) => {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.AUTH_BYPASS === "true"
  ) {
    console.warn("⚠️  AUTH BYPASS ENABLED - DEVELOPMENT ONLY");
    req.user = {
      sub: "dev-user-123",
      email: "dev@example.com",
      nickname: "DevUser",
      name: "Development User",
      picture: "https://via.placeholder.com/150",
      email_verified: true,
    };
    return next();
  }

  verifyToken(req, res, next);
};

/**
 * Error handler for Auth0 middleware
 */
export const auth0ErrorHandler = (err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
      message: err.message,
      code: "UNAUTHORIZED",
    });
  }

  if (err.name === "ForbiddenError") {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: err.message,
      code: "FORBIDDEN",
    });
  }

  // Pass other errors to the default error handler
  next(err);
};

export default {
  verifyToken,
  optionalAuth,
  requireScopes,
  requireOwnership,
  requireAdmin,
  devBypass,
  auth0ErrorHandler,
};
