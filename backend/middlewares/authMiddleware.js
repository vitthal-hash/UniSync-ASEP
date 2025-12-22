// backend/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Middleware: protect routes by verifying JWT token
 * 
 * Expected token format:
 * Authorization: Bearer <token>
 * 
 * On success:
 * - req.user = { userId, email }
 */
module.exports = (req, res, next) => {
  try {
    // check header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    // extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format"
      });
    }

    // verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err || !decoded) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

      // token valid -> store user data
      req.user = decoded; // { userId, email }

      next();
    });

  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error validating token"
    });
  }
};
