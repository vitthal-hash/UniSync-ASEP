console.log("RUNNING FILE:", __filename);

const express = require("express");

const http = require("http");
const app = require("./backend/app");
const { Server } = require("socket.io");
const pool = require("./backend/config/db");

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const userSocketMap = {};  
// Attach io to app so controllers can use it
app.set("socketio", io);

// Socket Authentication Shortcut (Without token for now)
io.on("connection", (socket) => {
  console.log("⚡ A user connected:", socket.id);

  // Join a group (room)
  

  // When user sends message through socket (optional)
 

 
  socket.on("typing", ({ groupId, name }) => {
    socket.to(groupId).emit("typing", name);
});

socket.on("stop_typing", ({ groupId }) => {
    socket.to(groupId).emit("stop_typing");
});
 socket.on("user_online", async ({ userId }) => {
  try {
    if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
    userSocketMap[userId].add(socket.id);

    // If first socket → mark online
    if (userSocketMap[userId].size === 1) {
      await pool.execute("UPDATE users SET is_online = 1 WHERE id = ?", [userId]);
      io.emit("user_status_changed", { userId, is_online: 1 });
    }

  } catch (err) {
    console.error("Error marking online:", err);
  }
});

socket.on("user_offline", async ({ userId }) => {
  if (userSocketMap[userId]) userSocketMap[userId].delete(socket.id);

  const left = userSocketMap[userId] ? userSocketMap[userId].size : 0;
  if (left === 0) {
    await pool.execute(
      "UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?",
      [userId]
    );
    io.emit("user_status_changed", { userId, is_online: 0 });
  }
});

// When a tab is closed / browser disconnects
socket.on("disconnect", async () => {
  for (const [uid, sockets] of Object.entries(userSocketMap)) {

    if (sockets.has(socket.id)) {
      sockets.delete(socket.id);

      // If this was user’s last active socket → mark offline
      if (sockets.size === 0) {
        delete userSocketMap[uid];
        await pool.execute(
          "UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?",
          [uid]
        );
        io.emit("user_status_changed", { userId: Number(uid), is_online: 0 });
      }

      break;
    }
  }
});

socket.on("register_user", (userId) => {
  socket.userId = userId;      // ⭐ REQUIRED ⭐
  socket.join(String(userId));
});

// ================================
// POLL VOTING SOCKET HANDLER
// ================================
socket.on("vote_poll", async ({ poll_id, option_id }) => {
  try {
    // prevent duplicate vote
    await pool.execute(
      `INSERT IGNORE INTO poll_votes (poll_id, option_id, user_id)
       VALUES (?, ?, ?)`,
      [poll_id, option_id, socket.userId]
    );

    // fetch updated poll state
    const [rows] = await pool.execute(
      `
      SELECT 
        o.id AS option_id,
        o.option_text,
        u.id AS user_id,
        u.full_name
      FROM poll_options o
      LEFT JOIN poll_votes v ON v.option_id = o.id
      LEFT JOIN users u ON u.id = v.user_id
      WHERE o.poll_id = ?
      `,
      [poll_id]
    );

    const optionMap = {};
    rows.forEach(r => {
      if (!optionMap[r.option_id]) {
        optionMap[r.option_id] = {
          id: r.option_id,
          text: r.option_text,
          votes: []
        };
      }
      if (r.user_id) {
        optionMap[r.option_id].votes.push({
          user_id: r.user_id,
          full_name: r.full_name
        });
      }
    });

    io.emit("poll_update", {
      poll_id,
      options: Object.values(optionMap)
    });

  } catch (err) {
    console.error("vote_poll error:", err);
  }
});


});

// Start server
const PORT = process.env.PORT || 8080;
// Serve FRONTEND HTML, CSS, JS files
const path = require("path");
// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index2.html"));
});


app.use('/uploads', express.static(__dirname + '/uploads'));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 UniSync backend running on 0.0.0.0:${PORT}`);
});



