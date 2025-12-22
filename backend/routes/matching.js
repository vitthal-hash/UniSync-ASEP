// backend/routes/matching.js

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const matchingController = require("../controllers/matchingController");

// Get matching results for a specific group
router.get("/:groupId/match", auth, matchingController.getMatchingForGroup);

module.exports = router;
