// backend/controllers/profileController.js

const pool = require("../config/db");

/**
 * CONTROLLER: GET MY PROFILE
 * Returns:
 * - basic user details (from users table)
 * - skills (user_skills join)
 * - interests (user_interests join)
 * - programming languages (user_languages join)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch basic user info
    const [userRows] = await pool.execute(
      `SELECT id, email, full_name, branch, year, division, batch, cgpa,
       role_number, prn_number, city, gender, clubs,
       created_at, updated_at

       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userRows[0];
// check if user already belongs to a batch group
const [[batchRow]] = await pool.execute(
  `SELECT COUNT(*) AS cnt
   FROM group_members gm
   JOIN \`groups\` g ON g.id = gm.group_id
   WHERE gm.user_id = ? AND g.type = 'batch'`,
  [userId]
);

    // Fetch user skills
    const [skillRows] = await pool.execute(
      `SELECT sm.name
       FROM user_skills us
       JOIN skills_master sm ON us.skill_id = sm.id
       WHERE us.user_id = ?`,
      [userId]
    );

    // Fetch user interests
    const [interestRows] = await pool.execute(
      `SELECT im.name
       FROM user_interests ui
       JOIN interests_master im ON ui.interest_id = im.id
       WHERE ui.user_id = ?`,
      [userId]
    );

    // Fetch user languages
    const [langRows] = await pool.execute(
      `SELECT lm.name
       FROM user_languages ul
       JOIN languages_master lm ON ul.language_id = lm.id
       WHERE ul.user_id = ?`,
      [userId]
    );

    return res.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        branch: user.branch,
        hasBatchGroup: batchRow.cnt > 0,
        year: user.year,
        division: user.division,
         batch: user.batch,
        cgpa: user.cgpa,
            role_number: user.role_number,
    prn_number: user.prn_number,
    city: user.city,
    gender: user.gender,
clubs: user.clubs,
        created_at: user.created_at,
        updated_at: user.updated_at,

        skills: skillRows.map(s => s.name),
        interests: interestRows.map(i => i.name),
        languages: langRows.map(l => l.name)
      }
    });

  } catch (err) {
    console.error("Error in getMyProfile:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile"
    });
  }
};
/**
 * CONTROLLER: UPDATE PROFILE
 * Updates:
 * - Basic user fields (name, branch, year, division, cgpa)
 * - Skills (sync: delete old + add new)
 * - Interests (sync)
 * - Languages (sync)
 */

// replace the entire exports.updateProfile function with this block
// Replace your existing exports.updateProfile with this function
exports.updateProfile = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.userId;
    const {
      full_name,
      branch,
      year,
      division,
      cgpa,
      skills,
      interests,
      languages,
      clubs
    } = req.body;

    // 1) Fetch OLD values before update
    const [oldRows] = await connection.execute(
      "SELECT branch, year, division, batch FROM users WHERE id = ?",
      [userId]
    );
    const old = oldRows[0] || { branch: null, year: null, division: null };
let finalBatch = old.batch;

// Only update batch if client sent a value
if (req.body.batch) {
  finalBatch = req.body.batch;
}

    // 2) Update users table
    await connection.execute(
      `UPDATE users SET 
        full_name = ?, 
        branch = ?, 
        year = ?, 
        division = ?, 
        batch = ?, 
        cgpa = ?,
        role_number = ?,
        prn_number = ?,
        city = ?,
        gender = ?,
        clubs = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        full_name,
        branch,
        year,
        division,
        finalBatch,
        cgpa ? Number(cgpa) : null,
        req.body.role_number,
        req.body.prn_number,
        req.body.city,
        req.body.gender,
        Array.isArray(clubs) ? clubs.join(",") : null, 
        userId
      ]
    );

    // 3) If any of branch/year/division changed, update groups
    const branchChanged = (old.branch || "") !== (branch || "");
    const yearChanged = (old.year || "") !== (year || "");
    const divisionChanged = (old.division || "") !== (division || "");
const batchChanged = (old.batch || "") !== (req.body.batch || "");

if (branchChanged || yearChanged || divisionChanged) {

  async function ensureGroup(typeVal, nameVal, b, y, d) {
    const [rows] = await connection.execute(
      "SELECT id FROM `groups` WHERE group_name = ? AND type = ? LIMIT 1",
      [nameVal, typeVal]
    );
    if (rows.length > 0) return rows[0].id;

    const [ins] = await connection.execute(
      "INSERT INTO `groups` (group_name, type, branch, year, division, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [nameVal, typeVal, b || null, y || null, d || null, userId]
    );
    return ins.insertId;
  }

  const group1Name = `${branch}-${year}`;
  const group2Name = `${branch}-${year}-${division}`;

  const group1Id = await ensureGroup("branch_year", group1Name, branch, year, null);
  const group2Id = await ensureGroup("division", group2Name, branch, year, division);

  await connection.execute(
    "INSERT IGNORE INTO group_members (user_id, group_id, is_admin) VALUES (?, ?, 1)",
    [userId, group1Id]
  );

  await connection.execute(
    "INSERT IGNORE INTO group_members (user_id, group_id, is_admin) VALUES (?, ?, 1)",
    [userId, group2Id]
  );
}
if (batchChanged && req.body.batch) {

  async function ensureBatchGroup(nameVal) {
    const [rows] = await connection.execute(
      "SELECT id FROM `groups` WHERE group_name = ? AND type = 'batch' LIMIT 1",
      [nameVal]
    );
    if (rows.length > 0) return rows[0].id;

    const [ins] = await connection.execute(
      "INSERT INTO `groups` (group_name, type, branch, year, division, created_by) VALUES (?, 'batch', ?, ?, ?, ?)",
      [nameVal, branch, year, division, userId]
    );
    return ins.insertId;
  }

  const batchGroupName = `${branch}-${year}-${division}-Batch-${req.body.batch}`;
  const batchGroupId = await ensureBatchGroup(batchGroupName);

  // Check if group already exists
const [existing] = await connection.execute(
  "SELECT created_by FROM `groups` WHERE id = ?",
  [batchGroupId]
);

// creator → admin, others → member
const isAdmin = existing[0].created_by === userId ? 1 : 0;

await connection.execute(
  "INSERT IGNORE INTO group_members (user_id, group_id, is_admin) VALUES (?, ?, ?)",
  [userId, batchGroupId, isAdmin]
);


  // Remove from other batch groups ONLY
  await connection.execute(
    `DELETE FROM group_members 
     WHERE user_id = ?
     AND group_id IN (SELECT id FROM \`groups\` WHERE type = 'batch')
     AND group_id != ?`,
    [userId, batchGroupId]
  );
}


    // -------------------------------
    // Sync SKILLS
    // -------------------------------
    await connection.execute("DELETE FROM user_skills WHERE user_id = ?", [userId]);
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        const [s] = await connection.execute("SELECT id FROM skills_master WHERE name = ? LIMIT 1", [skill]);
        if (s.length > 0) {
          await connection.execute("INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)", [userId, s[0].id]);
        }
      }
    }

    // -------------------------------
    // Sync INTERESTS
    // -------------------------------
    await connection.execute("DELETE FROM user_interests WHERE user_id = ?", [userId]);
    if (interests && interests.length > 0) {
      for (const interest of interests) {
        const [i] = await connection.execute("SELECT id FROM interests_master WHERE name = ? LIMIT 1", [interest]);
        if (i.length > 0) {
          await connection.execute("INSERT INTO user_interests (user_id, interest_id) VALUES (?, ?)", [userId, i[0].id]);
        }
      }
    }

    // -------------------------------
    // Sync LANGUAGES
    // -------------------------------
    await connection.execute("DELETE FROM user_languages WHERE user_id = ?", [userId]);
    if (languages && languages.length > 0) {
      for (const lang of languages) {
        const [l] = await connection.execute("SELECT id FROM languages_master WHERE name = ? LIMIT 1", [lang]);
        if (l.length > 0) {
          await connection.execute("INSERT INTO user_languages (user_id, language_id) VALUES (?, ?)", [userId, l[0].id]);
        }
      }
    }

    await connection.commit();
    connection.release();

    return res.json({ success: true, message: "Profile updated successfully" });

  } catch (err) {
    console.error("Error in updateProfile:", err);
    try { await connection.rollback(); } catch (_) {}
    try { connection.release(); } catch (_) {}
    return res.status(500).json({ success: false, message: "Server error updating profile" });
  }
};
exports.getUserProfileByAdmin = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { userId } = req.params;

    // check admin
    const [adminCheck] = await pool.execute(
      `SELECT 1 FROM group_members WHERE user_id = ? AND is_admin = 1 LIMIT 1`,
      [adminId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    // basic user info
    const [userRows] = await pool.execute(
      `SELECT id, email, full_name, branch, year, division, batch, cgpa,
              role_number, prn_number, city, gender,
              created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = userRows[0];

    // skills
    const [skillRows] = await pool.execute(
      `SELECT sm.name
       FROM user_skills us
       JOIN skills_master sm ON us.skill_id = sm.id
       WHERE us.user_id = ?`,
      [userId]
    );

    // interests
    const [interestRows] = await pool.execute(
      `SELECT im.name
       FROM user_interests ui
       JOIN interests_master im ON ui.interest_id = im.id
       WHERE ui.user_id = ?`,
      [userId]
    );

    // languages
    const [langRows] = await pool.execute(
      `SELECT lm.name
       FROM user_languages ul
       JOIN languages_master lm ON ul.language_id = lm.id
       WHERE ul.user_id = ?`,
      [userId]
    );

    return res.json({
      success: true,
      profile: {
        ...user,
        skills: skillRows.map(s => s.name),
        interests: interestRows.map(i => i.name),
        languages: langRows.map(l => l.name)
      }
    });

  } catch (err) {
    console.error("getUserProfileByAdmin error:", err);
    return res.status(500).json({ success: false });
  }
};




   
   
