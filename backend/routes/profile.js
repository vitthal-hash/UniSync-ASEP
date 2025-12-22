// backend/routes/profile.js

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const profileController = require("../controllers/profileController");

// Protected routes require JWT token
router.get("/me", auth, profileController.getMyProfile);
router.get("/:userId", auth, profileController.getUserProfileByAdmin);

router.put("/update", auth, profileController.updateProfile);

module.exports = router;
