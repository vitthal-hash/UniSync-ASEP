// backend/routes/analytics.js

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

// Get all analytics for a group
router.get("/:groupId", auth, analyticsController.getAnalyticsForGroup);
// CWES – compute engagement (placeholder)
router.post(
  "/:groupId/compute-engagement",
  auth,
  analyticsController.computeEngagementPlaceholder
);

// CWES – fetch engagement scores (placeholder)
router.get(
  "/:groupId/engagement",
  auth,
  analyticsController.getEngagementScores
);
// DEBUG: message counts per user (STEP 3)
router.get(
  "/:groupId/debug-message-counts",
  auth,
  analyticsController.debugMessageCounts
);
// DEBUG: reply counts per user (STEP 4)
router.get(
  "/:groupId/debug-reply-counts",
  auth,
  analyticsController.debugReplyCounts
);
// DEBUG: reaction counts received per user (STEP 5)
router.get(
  "/:groupId/debug-reaction-counts",
  auth,
  analyticsController.debugReactionCounts
);
// DEBUG: poll vote counts per user (STEP 6)
router.get(
  "/:groupId/debug-poll-vote-counts",
  auth,
  analyticsController.debugPollVoteCounts
);
// DEBUG: build raw engagement map (STEP 7A)
router.get(
  "/:groupId/debug-engagement-map",
  auth,
  analyticsController.debugBuildEngagementMap
);
// DEBUG: compute CWES (STEP 7B)
router.get(
  "/:groupId/debug-cwes",
  auth,
  analyticsController.debugComputeCWES
);
// FINAL: CWES scores for UI (all members)
router.get(
  "/:groupId/cwes",
  auth,
  analyticsController.getCWESForGroup
);
router.get(
  "/:groupId/cwes-trend/:userId",
  auth,
  analyticsController.getUserCWESTrend
);
router.get(
  "/_init/create-cwes-history",
  analyticsController._initCreateCWESHistory
);

module.exports = router;
