// backend/controllers/chatController.js

async function emitToFilteredUsers(io, groupId, userId, finalMessage) {
  // sender always gets the message
  io.to(String(userId)).emit("new_message", finalMessage);

  const [rows] = await pool.execute(
      "SELECT user_id FROM group_members WHERE group_id = ?",
      [groupId]
  );

  rows.forEach(r => {
    if (r.user_id !== userId) {
      io.to(String(r.user_id)).emit("new_message", finalMessage);
    }
  });
}

const pool = require("../config/db");

/**
 * CONTROLLER PART 1: GET GROUP MESSAGES
 * Returns:
 * - All messages for a group
 * - Sorted by created_at ascending
 * - Includes sender_id, sender_name, message_content, timestamp
 */

exports.uploadFileMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = req.file.path; // ✅ Cloudinary URL

    const target = (req.body.target || "all").toLowerCase();

    const [insertResult] = await pool.execute(
      `INSERT INTO messages 
       (group_id, sender_id, message_type, attachment_url, attachment_name, mime_type, target)
       VALUES (?, ?, 'file', ?, ?, ?, ?)`,
      [
        groupId,
        userId,
        fileUrl,
        req.file.originalname,
        req.file.mimetype,
        target
      ]
    );

    const messageId = insertResult.insertId;

    const [[userRow]] = await pool.execute(
      "SELECT full_name FROM users WHERE id = ?",
      [userId]
    );

    const finalMessage = {
      id: messageId,
      sender_id: userId,
      sender_name: userRow.full_name,
      message_type: "file",
      attachment_url: fileUrl,
      attachment_name: req.file.originalname,
      mime_type: req.file.mimetype,
      created_at: new Date()
    };

    const io = req.app.get("socketio");

    io.to(String(userId)).emit("new_message", finalMessage);

    const [receivers] = await pool.execute(
      "SELECT user_id FROM group_members WHERE group_id = ?",
      [groupId]
    );

    receivers.forEach(r => {
      if (r.user_id !== userId) {
        io.to(String(r.user_id)).emit("new_message", finalMessage);
      }
    });

    res.json({ success: true, data: finalMessage });

  } catch (err) {
    console.error("uploadFileMessage error:", err);
    res.status(500).json({ success: false });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    const [memberCheck] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

// Get current user's gender & admin status
const [[me]] = await pool.execute(
  `SELECT gender, 
          (SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?) AS is_admin
   FROM users WHERE id = ? LIMIT 1`,
  [userId, groupId, userId]
);

const gender = me.gender.toLowerCase();
const isAdmin = me.is_admin === 1;

// Build visibility filter
let visibilityFilter = `m.target = 'all' OR m.sender_id = ${userId}`;

if (isAdmin) {
  visibilityFilter += ` OR m.target = 'admins'`;
}

if (gender.startsWith("m")) {
  visibilityFilter += ` OR m.target = 'boys'`;
}

if (gender.startsWith("f")) {
  visibilityFilter += ` OR m.target = 'girls'`;
}

// Fetch messages with visibility rules
const [messages] = await pool.execute(
  `SELECT 
      m.id,
      m.sender_id,
      u.full_name,
      m.message_content,
      m.message_type,
      m.attachment_url,
      m.attachment_name,
      m.mime_type,
      m.target,
       m.reply_to, 
      m.created_at
   FROM messages m
   JOIN users u ON m.sender_id = u.id
   WHERE m.group_id = ?
     AND (${visibilityFilter})
   ORDER BY m.created_at ASC`,
  [groupId]
);

// 🔥 ENRICH POLL MESSAGES 🔥
for (const msg of messages) {
  if (msg.message_type === "poll") {

    // get poll
    const [[poll]] = await pool.execute(
      "SELECT id, question FROM polls WHERE message_id = ?",
      [msg.id]
    );

    if (!poll) {
  msg.poll = null;   // 👈 explicit
  continue;
}


    // get options + voters
    const [options] = await pool.execute(
      `
      SELECT 
        o.id,
        o.option_text,
        u.id AS user_id,
        u.full_name
      FROM poll_options o
      LEFT JOIN poll_votes v ON v.option_id = o.id
      LEFT JOIN users u ON u.id = v.user_id
      WHERE o.poll_id = ?
      `,
      [poll.id]
    );

    // group voters per option
    const optionMap = {};
    options.forEach(row => {
      if (!optionMap[row.id]) {
        optionMap[row.id] = {
          id: row.id,
          text: row.option_text,
          votes: []
        };
      }
      if (row.user_id) {
        optionMap[row.id].votes.push({
          user_id: row.user_id,
          full_name: row.full_name
        });
      }
    });

    msg.poll = {
      id: poll.id,
      question: poll.question,
      options: Object.values(optionMap)
    };
  }
}
// 🔥 LOAD REACTIONS FOR EACH MESSAGE
for (const msg of messages) {
  const [reactions] = await pool.execute(
    `
    SELECT 
      r.emoji,
      COUNT(*) AS count,
      GROUP_CONCAT(u.full_name SEPARATOR ', ') AS users
    FROM message_reactions r
    JOIN users u ON u.id = r.user_id
    WHERE r.message_id = ?
    GROUP BY r.emoji
    `,
    [msg.id]
  );

  msg.reactions = reactions;
}


return res.json({ success: true, messages });


  } catch (err) {
    console.error("Error in getMessages:", err);
    return res.status(500).json({ success: false });
  }
};


/**
 * CONTROLLER PART 2: SEND MESSAGE
 * Steps:
 * 1. User must be a group member
 * 2. Save message in DB
 * 3. Emit message via Socket.io to the room (groupId)
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    const { message, message_type, attachment_url, reply_to } = req.body;


    if (message_type === "text") {
      if (!message || typeof message !== "string" || message.trim() === "") {
        return res.status(400).json({ success: false, message: "Message cannot be empty" });
      }
    }

    const [memberCheck] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );
// ADMIN-ONLY CHAT CHECK
const [[group]] = await pool.execute(
  "SELECT admin_only_chat FROM `groups` WHERE id = ?",
  [groupId]
);

if (group.admin_only_chat === 1) {
  const [[me]] = await pool.execute(
    "SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?",
    [userId, groupId]
  );

  if (me.is_admin !== 1) {
    return res.status(403).json({
      success: false,
      message: "Only admins can send messages"
    });
  }
}

    if (memberCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

   const [insertResult] = await pool.execute(
  `INSERT INTO messages 
(group_id, sender_id, message_type, message_content, attachment_url, target, reply_to)
VALUES (?, ?, ?, ?, ?, ?, ?)`,

  [
    groupId,
    userId,
    message_type || "text",
    message_type === "text" || message_type === "emoji" ? message : null,
    attachment_url || null,
    req.body.target || "all",
      reply_to || null
  ]
);


    const messageId = insertResult.insertId;
// ===============================
// HOURLY MESSAGE ANALYTICS
// ===============================
const now = new Date();
const hour = now.getHours();
const date = now.toISOString().slice(0, 10);

await pool.execute(
  `
  INSERT INTO group_hourly_activity
    (group_id, activity_date, hour, messages_count)
  VALUES (?, ?, ?, 1)
  ON DUPLICATE KEY UPDATE
    messages_count = messages_count + 1
  `,
  [groupId, date, hour]
);

    const [userRows] = await pool.execute(
      "SELECT full_name FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    const senderName = userRows.length ? userRows[0].full_name : "Unknown";

    const finalMessage = {
  id: messageId,
  sender_id: userId,
  sender_name: senderName,
  message_type: message_type || "text",
  message_content: message || null,
  attachment_url: attachment_url || null,
  reply_to: reply_to || null,   // ⭐ IMPORTANT ⭐
  created_at: new Date()
};



// TARGET FILTERING
// --- FILTERING SYSTEM ---
const target = (req.body.target || "all").toLowerCase();
let sql = "";
let params = [groupId];

if (target === "admins") {
  sql = "SELECT user_id FROM group_members WHERE group_id = ? AND is_admin = 1";
}
else if (target === "girls") {
  // case-insensitive match for Female, female, F, f
  sql = `
    SELECT gm.user_id
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ? AND LOWER(u.gender) LIKE 'f%'
  `;
}
else if (target === "boys") {
  sql = `
    SELECT gm.user_id
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ? AND LOWER(u.gender) LIKE 'm%'
  `;
}
else {
  sql = "SELECT user_id FROM group_members WHERE group_id = ?";
}

const [receivers] = await pool.execute(sql, params);

// --- SOCKET EMIT LOGIC ---
const io = req.app.get("socketio");

// Sender MUST ALWAYS receive their message instantly
io.to(String(userId)).emit("new_message", finalMessage);

// Send ONLY to the filtered list (but don't double-send to sender)
receivers.forEach(r => {
  if (r.user_id !== userId) {
    io.to(String(r.user_id)).emit("new_message", finalMessage);
  }
});




// sender gets it



    return res.json({ success: true, data: finalMessage });

  } catch (err) {
    console.error("Error in sendMessage:", err);
    return res.status(500).json({ success: false, message: "Server error sending message" });
  }
};


/**
 * CONTROLLER PART 3: MARK MESSAGES AS READ
 * Optional feature for future:
 * Updates read status of messages for this user.
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    // Check membership
    const [memberCheck] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group"
      });
    }

    // Actual read receipts are not stored in DB for now
    // Returning simple OK to keep function flexible
    return res.json({
      success: true,
      message: "Messages marked as read (placeholder)"
    });

  } catch (err) {
    console.error("Error in markAsRead:", err);
    return res.status(500).json({
      success: false,
      message: "Server error marking messages read"
    });
  }
};
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId, messageId } = req.params;

    const [msg] = await pool.execute(
      "SELECT sender_id, created_at FROM messages WHERE id = ? AND group_id = ?",
      [messageId, groupId]
    );

    if (msg.length === 0) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

   // 🔐 check if user is admin of this group
const [[adminRow]] = await pool.execute(
  "SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?",
  [userId, groupId]
);

const isAdmin = adminRow?.is_admin === 1;

// 🟢 If NOT admin → only sender + 15 min rule
if (!isAdmin) {
  if (msg[0].sender_id !== userId) {
    return res.status(403).json({ success: false, message: "Not allowed" });
  }

  const msgAgeMinutes =
    (Date.now() - new Date(msg[0].created_at).getTime()) / 60000;

  if (msgAgeMinutes > 15) {
    return res.status(400).json({ success: false, message: "Delete window expired" });
  }
}

// 🔥 ADMIN CAN DELETE ANY MESSAGE ANYTIME
await pool.execute("DELETE FROM messages WHERE id = ?", [messageId]);

const io = req.app.get("socketio");
const [rows] = await pool.execute(
  "SELECT user_id FROM group_members WHERE group_id = ?",
  [groupId]
);

rows.forEach(r => {
  io.to(String(r.user_id)).emit("message_deleted", messageId);
});

return res.json({ success: true });

  } catch (err) {
    console.error("Error in deleteMessage:", err);
    return res.status(500).json({ success: false });
  }
};


exports.markMessageRead = async (req, res) => {
  const userId = req.user.userId;
  const { messageId } = req.params;

  try {

    // fetch msg details
    const [[msg]] = await pool.execute(
      "SELECT group_id, sender_id FROM messages WHERE id = ?",
      [messageId]
    );

    if (!msg) return res.json({ success: false });

    // ❗ DO NOT mark the sender's own message as read
    if (msg.sender_id === userId) {
      return res.json({ success: true });
    }

    await pool.execute(
      `INSERT IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)`,
      [messageId, userId]
    );

   

    // ❗ Emit ONLY to that group, not globally
     // ⭐ EMIT SOCKET EVENT TO ALL MEMBERS
  const io = req.app.get("socketio");
io.to(String(msg.group_id)).emit("message_read_update", {

    messageId,
    userId
  });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to mark read" });
  }
};

exports.getReadStatus = async (req, res) => {
  const { groupId } = req.params;

  const [rows] = await pool.execute(
    `SELECT 
        m.id AS message_id,
        COUNT(r.user_id) AS read_count
     FROM messages m
     LEFT JOIN message_reads r 
        ON r.message_id = m.id
     WHERE m.group_id = ?
       AND (r.user_id IS NULL OR r.user_id != m.sender_id)
     GROUP BY m.id`,
    [groupId]
  );

  res.json({ success: true, reads: rows });
};
exports.createPoll = async (req, res) => {
  const userId = req.user.userId;
  const { groupId } = req.params;
  const { question, options } = req.body;
const io = req.app.get("socketio");

  const [msg] = await pool.execute(
    `INSERT INTO messages (group_id, sender_id, message_type)
     VALUES (?, ?, 'poll')`,
    [groupId, userId]
  );

  const messageId = msg.insertId;

  const [poll] = await pool.execute(
    `INSERT INTO polls (message_id, question, created_by)
     VALUES (?, ?, ?)`,
    [messageId, question, userId]
  );

  for (const opt of options) {
    await pool.execute(
      `INSERT INTO poll_options (poll_id, option_text)
       VALUES (?, ?)`,
      [poll.insertId, opt]
    );
  }

  const [opts] = await pool.execute(
  `SELECT id, option_text FROM poll_options WHERE poll_id = ?`,
  [poll.insertId]
);

// 🔹 get sender name
const [[userRow]] = await pool.execute(
  "SELECT full_name FROM users WHERE id = ?",
  [userId]
);

const finalMessage = {
  id: messageId,
  sender_id: userId,
  sender_name: userRow.full_name,   // ✅ ADD THIS
  message_type: "poll",
  poll: {
    id: poll.insertId,
    question,
    options: opts.map(o => ({
      id: o.id,
      text: o.option_text,
      votes: []
    }))
  },
  created_at: new Date()
};


// ✅ SEND TO ALL GROUP MEMBERS (same logic as text messages)
emitToFilteredUsers(io, groupId, userId, finalMessage);



  res.json({ success: true });
};
// ================================
// ADD MESSAGE REACTION
// ================================
exports.reactToMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    await pool.execute(
      `INSERT IGNORE INTO message_reactions (message_id, user_id, emoji)
       VALUES (?, ?, ?)`,
      [messageId, userId, emoji]
    );

   const [rows] = await pool.execute(
  `
  SELECT 
    r.emoji,
    COUNT(*) AS count,
    GROUP_CONCAT(u.full_name SEPARATOR ', ') AS users
  FROM message_reactions r
  JOIN users u ON u.id = r.user_id
  WHERE r.message_id = ?
  GROUP BY r.emoji
  `,
  [messageId]
);


    const io = req.app.get("socketio");
    io.emit("reaction_update", {
      messageId,
      reactions: rows
    });

    res.json({ success: true });
  } catch (err) {
    console.error("reactToMessage error:", err);
    res.status(500).json({ success: false });
  }
};


