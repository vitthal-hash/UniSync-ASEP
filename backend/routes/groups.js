// backend/routes/groups.js

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const groupsController = require("../controllers/groupsController");

// Get all groups where user is a member
router.get("/my-groups", auth, groupsController.getMyGroups);

// Get members of a group
router.get("/:groupId/members", auth, groupsController.getGroupMembers);

// Exit a group
router.post("/:groupId/exit", auth, groupsController.exitGroup);

// Remove a member (only admin)
router.post("/:groupId/remove-member", auth, groupsController.removeMember);
router.post("/:groupId/make-admin/:memberId", auth, groupsController.makeAdmin);

// Promote a member to admin (optional but requested in earlier messages)

router.post("/:groupId/remove-admin/:memberId", auth, groupsController.removeAdmin);

// Get group details
router.get("/:groupId/details", auth, groupsController.getGroupDetails);
router.get("/:groupId/online-count", auth, groupsController.getOnlineCount);
router.post("/:groupId/admin-only-chat", auth, groupsController.toggleAdminOnlyChat);


module.exports = router;
