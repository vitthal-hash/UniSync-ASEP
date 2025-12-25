// backend/controllers/analyticsController.js

const pool = require("../config/db");

/**
 * Get analytics for a group (skills / interests / languages distribution,
 * peak active hours, least active hours, and summary insights)
 */
exports.getAnalyticsForGroup = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const { groupId } = req.params;

    // ------------------------------
    // Step 1: Validate membership
    // ------------------------------
    const [membershipCheck] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [loggedInUserId, groupId]
    );

    if (!membershipCheck || membershipCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group"
      });
    }

    // ------------------------------
    // Step 2: Fetch member IDs
    // ------------------------------
    const [memberRows] = await pool.execute(
      "SELECT user_id FROM group_members WHERE group_id = ?",
      [groupId]
    );

    const memberIds = (memberRows || []).map(m => m.user_id);

    // If no members found (edge case)
    if (!memberIds || memberIds.length === 0) {
      return res.json({
        success: true,
        groupId,
        skillsDistribution: [],
        interestsDistribution: [],
        languagesDistribution: [],
        peakHours: [],
        lowHours: [],
        worldClassInsights: []
      });
    }

    // ------------------------------
    // PART 2: Attribute Distributions
    // ------------------------------

    // Build placeholders for SQL IN clause
    const placeholders = memberIds.map(() => "?").join(",");

    // Skills distribution
    const [skillsRows] = await pool.execute(
      `
        SELECT sm.name, COUNT(*) AS count
        FROM user_skills us
        JOIN skills_master sm ON us.skill_id = sm.id
        WHERE us.user_id IN (${placeholders})
        GROUP BY sm.name
        ORDER BY count DESC
      `,
      memberIds
    );

    // Interests distribution
    const [interestsRows] = await pool.execute(
      `
        SELECT im.name, COUNT(*) AS count
        FROM user_interests ui
        JOIN interests_master im ON ui.interest_id = im.id
        WHERE ui.user_id IN (${placeholders})
        GROUP BY im.name
        ORDER BY count DESC
      `,
      memberIds
    );

    // Languages distribution
    const [languagesRows] = await pool.execute(
      `
        SELECT lm.name, COUNT(*) AS count
        FROM user_languages ul
        JOIN languages_master lm ON ul.language_id = lm.id
        WHERE ul.user_id IN (${placeholders})
        GROUP BY lm.name
        ORDER BY count DESC
      `,
      memberIds
    );
// CITY DISTRIBUTION
const [cityRows] = await pool.execute(
  `SELECT city, COUNT(*) as count
   FROM users u
   JOIN group_members gm ON gm.user_id = u.id
   WHERE gm.group_id = ?
   GROUP BY city
   ORDER BY count DESC`,
  [groupId]
);

// GENDER DISTRIBUTION
const [genderRows] = await pool.execute(
  `SELECT gender, COUNT(*) as count
   FROM users u
   JOIN group_members gm ON gm.user_id = u.id
   WHERE gm.group_id = ?
   GROUP BY gender`,
  [groupId]
);
const [clubRows] = await pool.execute(
  `SELECT u.full_name, u.clubs
   FROM users u
   JOIN group_members gm ON gm.user_id = u.id
   WHERE gm.group_id = ?`,
  [groupId]
);

    // ------------------------------
    // PART 3: Active hours (messages)
    // ------------------------------
    const [messageRows] = await pool.execute(
      `SELECT created_at FROM messages WHERE group_id = ?`,
      [groupId]
    );

    // Hour counters 0-23
    const hourlyActivity = new Array(24).fill(0);

    for (const r of messageRows) {
      // r.created_at may be a Date or string; use Date to get hour
      const d = new Date(r.created_at);
      if (!isNaN(d.getTime())) {
        const hour = d.getHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      }
    }

    const hourCounts = hourlyActivity.map((count, hour) => ({ hour, count }));

    const peakHours = [...hourCounts].sort((a, b) => b.count - a.count).slice(0, 3);
    const lowHours = [...hourCounts].sort((a, b) => a.count - b.count).slice(0, 3);

    // ------------------------------
    // PART 4: World-class insights & response
    // ------------------------------
    const insightLines = [];
const clubCountMap = {};
const usersWithClubs = [];

for (const r of clubRows) {
  if (!r.clubs) continue;

  const list = r.clubs.split(",").map(c => c.trim());

  usersWithClubs.push({
    name: r.full_name,
    clubs: list
  });

  list.forEach(c => {
    clubCountMap[c] = (clubCountMap[c] || 0) + 1;
  });
}

const clubsDistribution = Object.entries(clubCountMap).map(
  ([name, count]) => ({ name, count })
);

    if (skillsRows && skillsRows.length > 0) {
      insightLines.push(
        `Most common group skill is "${skillsRows[0].name}" with ${skillsRows[0].count} members.`
      );
    }

    if (interestsRows && interestsRows.length > 0) {
      insightLines.push(
        `Most popular interest is "${interestsRows[0].name}" (${interestsRows[0].count} members).`
      );
    }

    if (languagesRows && languagesRows.length > 0) {
      insightLines.push(
        `Most used programming language is "${languagesRows[0].name}".`
      );
    }

    if (peakHours && peakHours.length > 0) {
      insightLines.push(
        `Peak activity hour is ${peakHours[0].hour}:00 with ${peakHours[0].count} messages.`
      );
    }

    if (lowHours && lowHours.length > 0) {
      insightLines.push(
        `Least active hour is ${lowHours[0].hour}:00 with only ${lowHours[0].count} messages.`
      );
    }
    // ----- MOST COMMON CITY -----
if (cityRows.length > 0) {
  const topCity = cityRows[0];  // Already sorted DESC in your query
  insightLines.push(
    `Most common city is "${topCity.city}" with ${topCity.count} members.`
  );
}


    return res.json({
      success: true,
      groupId,
      skillsDistribution: skillsRows,
      interestsDistribution: interestsRows,
      languagesDistribution: languagesRows,
      peakHours,
      lowHours,
      worldClassInsights: insightLines,
      cityDistribution: cityRows,
genderDistribution: genderRows,
clubsDistribution,
usersWithClubs,

    });

  } catch (err) {
    console.error("Error in analytics controller:", err);
    return res.status(500).json({
      success: false,
      message: "Server error computing analytics"
    });
  }
};
/**
 * CWES – placeholder compute function
 * (NO LOGIC YET)
 */
/**
 * FINAL: Compute and STORE CWES for a group
 */
exports.computeEngagementPlaceholder = async (req, res) => {
  try {
    const { groupId } = req.params;

    // ---- Build engagement map (same as STEP 7B) ----
    const [messages] = await pool.execute(
      `SELECT sender_id AS user_id, COUNT(*) AS msg_count
       FROM messages
       WHERE group_id = ?
       GROUP BY sender_id`,
      [groupId]
    );

    const [replies] = await pool.execute(
      `SELECT sender_id AS user_id, COUNT(*) AS reply_count
       FROM messages
       WHERE group_id = ? AND reply_to IS NOT NULL
       GROUP BY sender_id`,
      [groupId]
    );

    const [reactions] = await pool.execute(
      `SELECT m.sender_id AS user_id, COUNT(r.id) AS reaction_count
       FROM message_reactions r
       JOIN messages m ON r.message_id = m.id
       WHERE m.group_id = ?
       GROUP BY m.sender_id`,
      [groupId]
    );

    const [votes] = await pool.execute(
      `SELECT pv.user_id AS user_id, COUNT(*) AS vote_count
       FROM poll_votes pv
       JOIN poll_options po ON pv.option_id = po.id
       JOIN polls p ON po.poll_id = p.id
       JOIN messages m ON m.poll_id = p.id
       WHERE m.group_id = ?
       GROUP BY pv.user_id`,
      [groupId]
    );

    const map = {};
    const put = (arr, key) => {
      arr.forEach(r => {
        if (!map[r.user_id]) {
          map[r.user_id] = {
            user_id: r.user_id,
            msg_count: 0,
            reply_count: 0,
            reaction_count: 0,
            vote_count: 0
          };
        }
        map[r.user_id][key] = Number(Object.values(r)[1]);
      });
    };

    put(messages, "msg_count");
    put(replies, "reply_count");
    put(reactions, "reaction_count");
    put(votes, "vote_count");

    const users = Object.values(map);

// 🔥 ALWAYS initialize CWES for ALL group members
const [members] = await pool.execute(
  `SELECT user_id FROM group_members WHERE group_id = ?`,
  [groupId]
);

for (const m of members) {
  const u = users.find(x => x.user_id === m.user_id) || {
    msg_count: 0,
    reply_count: 0,
    reaction_count: 0,
    vote_count: 0
  };

  const maxMsg = Math.max(...users.map(x => x.msg_count), 1);
  const maxResp = Math.max(...users.map(x => x.reply_count + x.vote_count), 1);
  const maxReact = Math.max(...users.map(x => x.reaction_count), 1);

  const IE = Math.log(1 + u.msg_count) / Math.log(1 + maxMsg);
  const RE = Math.log(1 + u.reply_count + u.vote_count) / Math.log(1 + maxResp);
  const SV = Math.log(1 + u.reaction_count) / Math.log(1 + maxReact);
  const EC = 1;

  const CWES = (0.35 * IE + 0.30 * RE + 0.25 * SV) * (0.7 + 0.3 * EC);

  await pool.execute(
    `
    INSERT INTO user_engagement_scores
    (user_id, group_id, ie_score, re_score, sv_score, ec_score, cwes_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      ie_score = VALUES(ie_score),
      re_score = VALUES(re_score),
      sv_score = VALUES(sv_score),
      ec_score = VALUES(ec_score),
      cwes_score = VALUES(cwes_score),
      computed_at = CURRENT_TIMESTAMP
    `,
    [m.user_id, groupId, IE, RE, SV, EC, CWES]
  );
}




    const maxMsg = Math.max(...users.map(u => u.msg_count), 1);
    const maxResp = Math.max(...users.map(u => u.reply_count + u.vote_count), 1);
    const maxReact = Math.max(...users.map(u => u.reaction_count), 1);

    // ---- STORE CWES ----
    for (const u of users) {
      const IE = Math.log(1 + u.msg_count) / Math.log(1 + maxMsg);
      const RE = Math.log(1 + u.reply_count + u.vote_count) / Math.log(1 + maxResp);
      const SV = Math.log(1 + u.reaction_count) / Math.log(1 + maxReact);
      const EC = 1;

      const CWES =
        (0.35 * IE + 0.30 * RE + 0.25 * SV) *
        (0.7 + 0.3 * EC);

      await pool.execute(
        `
        INSERT INTO user_engagement_scores
        (user_id, group_id, ie_score, re_score, sv_score, ec_score, cwes_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ie_score = VALUES(ie_score),
          re_score = VALUES(re_score),
          sv_score = VALUES(sv_score),
          ec_score = VALUES(ec_score),
          cwes_score = VALUES(cwes_score),
          computed_at = CURRENT_TIMESTAMP
        `,
        [
          u.user_id,
          groupId,
          IE,
          RE,
          SV,
          EC,
          CWES
        ]
      );
 

    }

    return res.json({
      success: true,
      message: "CWES computed and stored successfully"
    });

  } catch (err) {
    console.error("computeEngagement error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to compute engagement"
    });
  }
};


/**
 * CWES – placeholder fetch function
 * (NO LOGIC YET)
 */
exports.getEngagementScores = async (req, res) => {
  return res.json({
    success: true,
    groupAverage: 0,
    members: []
  });
};
/**
 * STEP 3: DEBUG – count messages per user in a group
 * (Temporary function for CWES preparation)
 */
exports.debugMessageCounts = async (req, res) => {
  try {
    const { groupId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT 
        sender_id AS user_id,
        COUNT(*) AS message_count
      FROM messages
      WHERE group_id = ?
      GROUP BY sender_id
      `,
      [groupId]
    );

    return res.json({
      success: true,
      groupId,
      counts: rows
    });

  } catch (err) {
    console.error("debugMessageCounts error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to count messages"
    });
  }
};
/**
 * STEP 4: DEBUG – count replies sent per user
 */
exports.debugReplyCounts = async (req, res) => {
  try {
    const { groupId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        sender_id AS user_id,
        COUNT(*) AS reply_count
      FROM messages
      WHERE group_id = ?
        AND reply_to IS NOT NULL
      GROUP BY sender_id
      `,
      [groupId]
    );

    return res.json({
      success: true,
      groupId,
      replies: rows
    });

  } catch (err) {
    console.error("debugReplyCounts error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to count replies"
    });
  }
};
/**
 * STEP 5: DEBUG – count reactions received per user
 */
exports.debugReactionCounts = async (req, res) => {
  try {
    const { groupId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        m.sender_id AS user_id,
        COUNT(r.id) AS reaction_count
      FROM message_reactions r
JOIN messages m ON r.message_id = m.id
      WHERE m.group_id = ?
      GROUP BY m.sender_id
      `,
      [groupId]
    );

    return res.json({
      success: true,
      groupId,
      reactions: rows
    });

  } catch (err) {
    console.error("debugReactionCounts error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to count reactions"
    });
  }
};
/**
 * STEP 6: DEBUG – count poll votes per user
 */
exports.debugPollVoteCounts = async (req, res) => {
  try {
    const { groupId } = req.params;

    const [rows] = await pool.execute(
  `
  SELECT
    pv.user_id AS user_id,
    COUNT(*) AS vote_count
  FROM poll_votes pv
  JOIN poll_options po ON pv.option_id = po.id
  JOIN polls p ON po.poll_id = p.id
  JOIN messages m ON m.poll_id = p.id
  WHERE m.group_id = ?
  GROUP BY pv.user_id
  `,
  [groupId]
);


    return res.json({
      success: true,
      groupId,
      votes: rows
    });

  } catch (err) {
    console.error("debugPollVoteCounts error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to count poll votes"
    });
  }
};
/**
 * STEP 7A: Build raw engagement signal map per user
 * (No CWES math yet)
 */
exports.debugBuildEngagementMap = async (req, res) => {
  try {
    const { groupId } = req.params;

    // 1. Messages sent
    const [messages] = await pool.execute(
      `
      SELECT sender_id AS user_id, COUNT(*) AS msg_count
      FROM messages
      WHERE group_id = ?
      GROUP BY sender_id
      `,
      [groupId]
    );

    // 2. Replies sent
    const [replies] = await pool.execute(
      `
      SELECT sender_id AS user_id, COUNT(*) AS reply_count
      FROM messages
      WHERE group_id = ?
        AND reply_to IS NOT NULL
      GROUP BY sender_id
      `,
      [groupId]
    );

    // 3. Reactions received
    const [reactions] = await pool.execute(
      `
      SELECT m.sender_id AS user_id, COUNT(r.id) AS reaction_count
      FROM message_reactions r
      JOIN messages m ON r.message_id = m.id
      WHERE m.group_id = ?
      GROUP BY m.sender_id
      `,
      [groupId]
    );

    // 4. Poll votes
    const [votes] = await pool.execute(
      `
      SELECT pv.user_id AS user_id, COUNT(*) AS vote_count
      FROM poll_votes pv
      JOIN poll_options po ON pv.option_id = po.id
      JOIN polls p ON po.poll_id = p.id
      JOIN messages m ON m.poll_id = p.id
      WHERE m.group_id = ?
      GROUP BY pv.user_id
      `,
      [groupId]
    );

    // Build user map
    const userMap = {};

    const add = (arr, field) => {
      arr.forEach(r => {
        if (!userMap[r.user_id]) {
          userMap[r.user_id] = {
            user_id: r.user_id,
            msg_count: 0,
            reply_count: 0,
            reaction_count: 0,
            vote_count: 0
          };
        }
        userMap[r.user_id][field] = Number(Object.values(r)[1]);
      });
    };

    add(messages, "msg_count");
    add(replies, "reply_count");
    add(reactions, "reaction_count");
    add(votes, "vote_count");

    return res.json({
      success: true,
      groupId,
      users: Object.values(userMap)
    });

  } catch (err) {
    console.error("debugBuildEngagementMap error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to build engagement map"
    });
  }
};
/**
 * STEP 7B: Compute CWES (no DB write yet)
 */
exports.debugComputeCWES = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Reuse engagement map logic
    const [users] = await pool.execute(
      `
      SELECT sender_id AS user_id, COUNT(*) AS msg_count
      FROM messages
      WHERE group_id = ?
      GROUP BY sender_id
      `,
      [groupId]
    );

    const [replies] = await pool.execute(
      `
      SELECT sender_id AS user_id, COUNT(*) AS reply_count
      FROM messages
      WHERE group_id = ?
        AND reply_to IS NOT NULL
      GROUP BY sender_id
      `,
      [groupId]
    );

    const [reactions] = await pool.execute(
      `
      SELECT m.sender_id AS user_id, COUNT(r.id) AS reaction_count
      FROM message_reactions r
      JOIN messages m ON r.message_id = m.id
      WHERE m.group_id = ?
      GROUP BY m.sender_id
      `,
      [groupId]
    );

    const [votes] = await pool.execute(
      `
      SELECT pv.user_id AS user_id, COUNT(*) AS vote_count
      FROM poll_votes pv
      JOIN poll_options po ON pv.option_id = po.id
      JOIN polls p ON po.poll_id = p.id
      JOIN messages m ON m.poll_id = p.id
      WHERE m.group_id = ?
      GROUP BY pv.user_id
      `,
      [groupId]
    );

    // Build map
    const map = {};
    const put = (arr, key) => {
      arr.forEach(r => {
        if (!map[r.user_id]) {
          map[r.user_id] = {
            user_id: r.user_id,
            msg_count: 0,
            reply_count: 0,
            reaction_count: 0,
            vote_count: 0
          };
        }
        map[r.user_id][key] = Number(Object.values(r)[1]);
      });
    };

    put(users, "msg_count");
    put(replies, "reply_count");
    put(reactions, "reaction_count");
    put(votes, "vote_count");

    const rows = Object.values(map);

    // Group maxima
    const maxMsg = Math.max(...rows.map(u => u.msg_count), 1);
    const maxResp = Math.max(
      ...rows.map(u => u.reply_count + u.vote_count),
      1
    );
    const maxReact = Math.max(...rows.map(u => u.reaction_count), 1);

    // Compute CWES
    const results = rows.map(u => {
      const IE = Math.log(1 + u.msg_count) / Math.log(1 + maxMsg);
      const RE = Math.log(1 + u.reply_count + u.vote_count) / Math.log(1 + maxResp);
      const SV = Math.log(1 + u.reaction_count) / Math.log(1 + maxReact);
      const EC = 1;

      const cwes =
        (0.35 * IE + 0.30 * RE + 0.25 * SV) *
        (0.7 + 0.3 * EC);

      return {
        ...u,
        IE: Number(IE.toFixed(3)),
        RE: Number(RE.toFixed(3)),
        SV: Number(SV.toFixed(3)),
        CWES: Number(cwes.toFixed(3))
      };
    });

    return res.json({
      success: true,
      groupId,
      results
    });

  } catch (err) {
    console.error("debugComputeCWES error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to compute CWES"
    });
  }
};
/**
 * FINAL: Fetch CWES scores for UI (visible to all members)
 */
exports.getCWESForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

   const [rows] = await pool.execute(
  `
  SELECT
    u.id AS user_id,
    u.full_name,
    COALESCE(ues.cwes_score, 0) AS cwes_score
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  LEFT JOIN user_engagement_scores ues
    ON ues.user_id = gm.user_id
   AND ues.group_id = gm.group_id
  WHERE gm.group_id = ?
  ORDER BY cwes_score DESC
  `,
  [groupId]
);


    return res.json({
      success: true,
      groupId,
      members: rows
    });

  } catch (err) {
    console.error("getCWESForGroup error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch engagement scores"
    });
  }
};
exports.getUserCWESTrend = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT cwes_score, recorded_at
      FROM user_cwes_history
      WHERE group_id = ? AND user_id = ?
      ORDER BY recorded_at ASC
      `,
      [groupId, userId]
    );

    return res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("CWES trend error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch CWES trend"
    });
  }
};
// TEMP: run once to create CWES history table
exports._initCreateCWESHistory = async (req, res) => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_cwes_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        group_id INT NOT NULL,
        cwes_score DECIMAL(6,4) NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id, group_id)
      )
    `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
