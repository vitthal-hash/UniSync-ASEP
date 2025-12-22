// backend/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const groupsRoutes = require("./routes/groups");
const chatRoutes = require("./routes/chat");
const matchingRoutes = require("./routes/matching");
const analyticsRoutes = require("./routes/analytics");
const pingRoutes = require("./routes/ping");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes - prefix with /api
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ping", pingRoutes);

// Static frontend (optional): serve frontend folder if you host backend + frontend together.
// If you serve frontend separately via Live Server, this is not required.
// Uncomment if you place frontend build inside backend/public or adjust path.
//
// const frontendPath = path.join(__dirname, "..", "frontend");
// app.use(express.static(frontendPath));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(frontendPath, "index.html"));
// });
app.use("/api/contact", require("./routes/contactRoutes"));

module.exports = app;
