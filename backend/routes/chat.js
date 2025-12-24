// backend/routes/chat.js

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const chatController = require("../controllers/chatController");

// Fetch full chat history for a group
router.get("/:groupId/messages", auth, chatController.getMessages);
router.post("/:groupId/poll", auth, chatController.createPoll);

// Send message through REST API (Socket emits internally)
// (This is used when frontend submits via API instead of socket)
router.post("/:groupId/send", auth, chatController.sendMessage);
const upload = require("../middlewares/upload");

router.post(
  "/:groupId/upload",
  auth,
  upload.single("file"),
  chatController.uploadFileMessage
);

router.post("/:messageId/react", auth, chatController.reactToMessage);





// Mark messages as read (optional, can be used later)

router.delete("/:groupId/message/:messageId", auth, chatController.deleteMessage);
router.post("/:messageId/read", auth, chatController.markMessageRead);
router.post("/:groupId/read", auth, chatController.markAsRead);
router.get("/:groupId/reads", chatController.getReadStatus);


module.exports = router;
