// backend/controllers/groupsController.js

const pool = require("../config/db");

/**
 * PART 1 — GET MY GROUPS
 */
exports.getMyGroups = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.execute(
      `SELECT 
          g.id AS group_id,
          g.group_name,
          g.type,
          g.branch,
          g.year,
          g.division,
            gm.is_admin,
              u.is_online
       FROM group_members gm
       JOIN \`groups\` g ON gm.group_id = g.id
       JOIN users u ON u.id = gm.user_id
       WHERE gm.user_id = ?
       ORDER BY g.group_name`,
      [userId]
    );

    return res.json({ success: true, groups: rows });

  } catch (err) {
    console.error("Error in getMyGroups:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching groups"
    });
  }
};

/**
 * PART 2 — GET GROUP MEMBERS
 */
exports.getGroupMembers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    // Check membership
    const [isMember] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );

    if (isMember.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group"
      });
    }

    // Fetch members
    const [members] = await pool.execute(
      `SELECT 
          u.id AS user_id,
          u.full_name,
          u.email,
          u.branch,
          u.year,
          u.division,
           
    u.is_online,  
          gm.is_admin,
            u.last_seen
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY u.full_name`,
      [groupId]
    );

    return res.json({ success: true, members });

  } catch (err) {
    console.error("Error in getGroupMembers:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching group members"
    });
  }
};

/**
 * PART 3 — EXIT GROUP
 */
exports.exitGroup = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    await connection.beginTransaction();

    const [memberRows] = await connection.execute(
      "SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );

    if (memberRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group"
      });
    }

    const isAdmin = memberRows[0].is_admin;

    // If admin → ensure another admin exists
    if (isAdmin === 1) {
      const [admins] = await connection.execute(
        "SELECT user_id FROM group_members WHERE group_id = ? AND is_admin = 1",
        [groupId]
      );

      if (admins.length === 1) {
        const [others] = await connection.execute(
          "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ? LIMIT 1",
          [groupId, userId]
        );

        if (others.length > 0) {
          await connection.execute(
            "UPDATE group_members SET is_admin = 1 WHERE user_id = ? AND group_id = ?",
            [others[0].user_id, groupId]
          );
        }
      }
    }

    await connection.execute(
      "DELETE FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );

    await connection.commit();
    connection.release();

    return res.json({ success: true, message: "You have exited the group" });

  } catch (err) {
    console.error("Error in exitGroup:", err);
    await connection.rollback();
    connection.release();
    return res.status(500).json({
      success: false,
      message: "Server error while exiting group"
    });
  }
};

/**
 * PART 4 — REMOVE MEMBER
 */
exports.removeMember = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const requesterId = req.user.userId;
    const { groupId } = req.params;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      connection.release();
      return res.status(400).json({ success: false, message: "targetUserId required" });
    }

    await connection.beginTransaction();

    const [reqRows] = await connection.execute(
      "SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?",
      [requesterId, groupId]
    );

    if (reqRows.length === 0 || reqRows[0].is_admin === 0) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ success: false, message: "Only admins can remove" });
    }

    // Can't remove themselves
    if (Number(targetUserId) === Number(requesterId)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: "Admin cannot remove self" });
    }

    const [targetRows] = await connection.execute(
      "SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?",
      [targetUserId, groupId]
    );

    if (targetRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: "User not in group" });
    }

    const isTargetAdmin = targetRows[0].is_admin;

    if (isTargetAdmin === 1) {
      const [admins] = await connection.execute(
        "SELECT user_id FROM group_members WHERE group_id = ? AND is_admin = 1",
        [groupId]
      );

      if (admins.length === 1) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: "Cannot remove the only admin"
        });
      }
    }

    await connection.execute(
      "DELETE FROM group_members WHERE user_id = ? AND group_id = ?",
      [targetUserId, groupId]
    );

    await connection.commit();
    connection.release();

    return res.json({ success: true, message: "Member removed" });

  } catch (err) {
    console.error("Error in removeMember:", err);
    await connection.rollback();
    connection.release();
    return res.status(500).json({ success: false, message: "Server error removing member" });
  }
};



/**
 * PART 6 — GET GROUP DETAILS
 */
exports.getGroupDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    const [memberCheck] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [userId, groupId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Not in group" });
    }

  const [groupRows] = await pool.execute(
  `
  SELECT
    id,
    group_name,
    type,
    branch,
    year,
    division,
    created_by,
    created_at,
    admin_only_chat
  FROM \`groups\`
  WHERE id = ?
  `,
  [groupId]
);


    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const group = groupRows[0];

    const [memberCount] = await pool.execute(
      "SELECT COUNT(*) AS members FROM group_members WHERE group_id = ?",
      [groupId]
    );

    const [adminCount] = await pool.execute(
      "SELECT COUNT(*) AS admins FROM group_members WHERE group_id = ? AND is_admin = 1",
      [groupId]
    );

    return res.json({
      success: true,
      groupDetails: {
        id: group.id,
        name: group.group_name,
        type: group.type,
        branch: group.branch,
        year: group.year,
        division: group.division,
        created_by: group.created_by,
        created_at: group.created_at,
         admin_only_chat: group.admin_only_chat,
        total_members: memberCount[0].members,
        total_admins: adminCount[0].admins
      }
    });

  } catch (err) {
    console.error("Error in getGroupDetails:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching group details"
    });
  }
};
exports.getOnlineCount = async (req, res) => {
  const { groupId } = req.params;

  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ? AND u.is_online = 1`,
    [groupId]
  );

  res.json({ success: true, online: rows[0].count });
};
exports.makeAdmin = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { groupId, memberId } = req.params;

    // check requester is admin
    const [adminCheck] = await pool.execute(
      `SELECT 1 FROM group_members 
       WHERE group_id = ? AND user_id = ? AND is_admin = 1`,
      [groupId, adminId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    // make member admin
    await pool.execute(
      `UPDATE group_members 
       SET is_admin = 1 
       WHERE group_id = ? AND user_id = ?`,
      [groupId, memberId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("makeAdmin error", err);
    res.status(500).json({ success: false });
  }
};
exports.removeAdmin = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { groupId, memberId } = req.params;

    // Check requester is admin
    const [adminCheck] = await pool.execute(
      `SELECT 1 FROM group_members 
       WHERE group_id = ? AND user_id = ? AND is_admin = 1`,
      [groupId, adminId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    // Prevent removing creator
    

    // Ensure at least one admin remains
    const [admins] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM group_members 
       WHERE group_id = ? AND is_admin = 1`,
      [groupId]
    );

    if (admins[0].cnt <= 1) {
      return res.json({ success: false, message: "At least one admin required" });
    }

    // Remove admin role
    await pool.execute(
      `UPDATE group_members 
       SET is_admin = 0 
       WHERE group_id = ? AND user_id = ?`,
      [groupId, memberId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("removeAdmin error", err);
    res.status(500).json({ success: false });
  }
};
// TOGGLE: Only admins can send messages
exports.toggleAdminOnlyChat = async (req, res) => {
  const userId = req.user.userId;
  const { groupId } = req.params;
  const { enabled } = req.body;

  // Check admin
  const [adminCheck] = await pool.execute(
    "SELECT is_admin FROM group_members WHERE user_id = ? AND group_id = ?",
    [userId, groupId]
  );

  if (!adminCheck.length || adminCheck[0].is_admin !== 1) {
    return res.status(403).json({ success: false, message: "Only admins allowed" });
  }

  await pool.execute(
    "UPDATE `groups` SET admin_only_chat = ? WHERE id = ?",
    [enabled ? 1 : 0, groupId]
  );
const io = req.app.get("socketio");
io.to(String(groupId)).emit("admin_only_chat_updated", {
  enabled: enabled ? 1 : 0
});
  return res.json({ success: true });
};
