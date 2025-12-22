// backend/routes/ping.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  return res.json({ success: true, message: "pong", time: new Date() });
});

module.exports = router;
