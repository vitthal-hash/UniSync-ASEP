// backend/controllers/authController.js

const pool = require("../config/db");
const generateOtp = require("../utils/generateOtp");
const { sendOTP } = require("../utils/mailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Controller: SEND OTP
 * Steps:
 * 1. Validate email
 * 2. Generate OTP + expiry
 * 3. Store OTP in otp_tokens table
 * 4. Send OTP email using Nodemailer
 */
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate email format & must be .edu
    if (!email || !email.endsWith(".edu")) {
      return res.status(400).json({ 
        success: false, 
        message: "Use a valid .edu college email" 
      });
    }

    // 2. Check if email already exists in USERS table
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please login."
      });
    }

    // 3. Generate OTP
    const { otp, expiresAt } = generateOtp();

    // 4. Insert OTP into DB
    await pool.execute(
      "INSERT INTO otp_tokens (email, otp_code, expires_at) VALUES (?, ?, ?)",
      [email, otp, expiresAt]
    );

    // 5. Send OTP Email
    await sendOTP(email, otp);

    return res.json({
      success: true,
      message: "OTP sent to your email",
      email
    });

  } catch (err) {
    console.error("Error in sendOtp:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error sending OTP" 
    });
  }
};

/**
 * Controller: VERIFY OTP
 * Steps:
 * 1. Check if email + otp provided
 * 2. Fetch latest OTP for this email from otp_tokens
 * 3. Check if OTP matches
 * 4. Check if expired
 * 5. Check if already used
 * 6. Mark OTP as used
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    // Fetch latest OTP entry
    const [rows] = await pool.execute(
      "SELECT * FROM otp_tokens WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "OTP not found"
      });
    }

    const otpEntry = rows[0];

    // Check OTP match
    if (otpEntry.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Check expiry
    const now = new Date();
    const expiry = new Date(otpEntry.expires_at);

    if (now > expiry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    // mark OTP as used
    await pool.execute("UPDATE otp_tokens SET used = 1 WHERE id = ?", [otpEntry.id]);

    // ⭐ CREATE TEMP TOKEN (IMPORTANT!)
    const tempToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.json({
      success: true,
      message: "OTP verified successfully",
      tempToken   // ⭐ VERY IMPORTANT — frontend stores this
    });

  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


/**
 * Controller: SET PASSWORD (Step 2 of registration)


/**
 * Controller: REGISTER (PART 1)
 * Steps in PART 3A:
 * 1. Validate required fields
 * 2. Check if email already exists
 * 3. Hash password
 * 4. Insert user basic data into users table
 */

/**
 * Controller: LOGIN
 * Steps:
 * 1. Validate email + password
 * 2. Check if user exists
 * 3. Compare password hash
 * 4. Generate JWT token
 * 5. Return user data + token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // 2. Check user existence
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const user = rows[0];

    // 3. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password"
      });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Success
    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        branch: user.branch,
        year: user.year,
        division: user.division,
        cgpa: user.cgpa
      }
    });

  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
};


/**
 * Controller: LOGOUT
 * For JWT, logout is handled client-side
 * We simply instruct the frontend to remove the token.
 */
exports.logout = async (req, res) => {
  return res.json({
    success: true,
    message: "Logged out successfully (client should delete token)"
  });
};
exports.setPassword = async (req, res) => {
  try {
    const { password, tempToken } = req.body;

    if (!password || !tempToken) {
      return res.status(400).json({
        success: false,
        message: "Password and tempToken are required"
      });
    }

    // Decode email from token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired temp token"
      });
    }

    const email = decoded.email;

    // ⭐ FIX: IF USER DOES NOT EXIST, CREATE IT NOW
    const [userRows] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    let userId;

    if (userRows.length === 0) {
      // Create user with only email
      const [insert] = await pool.execute(
        "INSERT INTO users (email) VALUES (?)",
        [email]
      );
      userId = insert.insertId;
    } else {
      userId = userRows[0].id;
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Update password now
    await pool.execute(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [hash, email]
    );

    // Create temp token for profile step
    const nextTempToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.json({
      success: true,
      message: "Password set successfully",
      tempToken: nextTempToken
    });

  } catch (err) {
    console.error("setPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * Controller: COMPLETE PROFILE (Step 3)
 */
exports.register = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();   // ⭐ REQUIRED

 const {
  tempToken,
  full_name,
  branch,
  year,
  division,
  batch,
  cgpa,
  skills,
  interests,
  languages,
  clubs
} = req.body;


    // Decode temp token to get email
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired temp token"
      });
    }

    const email = decoded.email;

    // Get user or create if missing
    const [existingUser] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    let userId;

    if (existingUser.length === 0) {
      const [insert] = await connection.execute(
        "INSERT INTO users (email) VALUES (?)",
        [email]
      );
      userId = insert.insertId;
    } else {
      userId = existingUser[0].id;
    }

    // Update user profile info
   await connection.execute(
  `UPDATE users 
   SET full_name=?, branch=?, year=?, division=?, batch=?, cgpa=?, 
       gender=?, prn_number=?, role_number=?, city=?, clubs=?
   WHERE id=?`,
  [
    full_name,
    branch,
    year,
    division,
    batch,
    cgpa || null,
    req.body.gender,
    req.body.prn_number,
    req.body.role_number,
    req.body.city,
      Array.isArray(clubs) ? clubs.join(",") : null, 
    userId
  ]
);
    /* ---------------------------------------------------------
       Save skills / interests / programming languages
    ----------------------------------------------------------*/
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        const [rows] = await connection.execute(
          "SELECT id FROM skills_master WHERE name=? LIMIT 1",
          [skill]
        );
        if (rows.length > 0) {
          await connection.execute(
            "INSERT IGNORE INTO user_skills (user_id, skill_id) VALUES (?, ?)",
            [userId, rows[0].id]
          );
        }
      }
    }

    if (interests && interests.length > 0) {
      for (const interest of interests) {
        const [rows] = await connection.execute(
          "SELECT id FROM interests_master WHERE name=? LIMIT 1",
          [interest]
        );
        if (rows.length > 0) {
          await connection.execute(
            "INSERT IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)",
            [userId, rows[0].id]
          );
        }
      }
    }

    if (languages && languages.length > 0) {
      for (const lang of languages) {
        const [rows] = await connection.execute(
          "SELECT id FROM languages_master WHERE name=? LIMIT 1",
          [lang]
        );
        if (rows.length > 0) {
          await connection.execute(
            "INSERT IGNORE INTO user_languages (user_id, language_id) VALUES (?, ?)",
            [userId, rows[0].id]
          );
        }
      }
    }

    /* ---------------------------------------------------------
       Create or join groups
    ----------------------------------------------------------*/
 /* ---------------------------------------------------------
   Create or Join Groups (NEW NAMING SYSTEM)
----------------------------------------------------------*/

const branchGroupName = `${branch}-${year}`;
const divisionGroupName = `${branch}-${year}-${division}`;

// Branch Group
let branchGroupId;
const [bg] = await connection.execute(
  "SELECT id FROM `groups` WHERE group_name=? AND type='branch'",
  [branchGroupName]
);

if (bg.length === 0) {
  const [insertBG] = await connection.execute(
  `INSERT INTO \`groups\`
   (group_name, branch, year, division, type, created_by)
   VALUES (?, ?, ?, ?, 'branch', ?)`,
  [
    branchGroupName,
    branch,
    year,
    division,
    userId
  ]
);
  branchGroupId = insertBG.insertId;
} else {
  branchGroupId = bg[0].id;
}

// Division Group
let divisionGroupId;
const [dg] = await connection.execute(
  "SELECT id FROM `groups` WHERE group_name=? AND type='division'",
  [divisionGroupName]
);

if (dg.length === 0) {
  const [insertDG] = await connection.execute(
    `INSERT INTO \`groups\` (group_name, branch, year, division, type, created_by)
     VALUES (?, ?, ?, ?, 'division', ?)`,
    [divisionGroupName, branch, year, division, userId]
  );
  divisionGroupId = insertDG.insertId;
} else {
  divisionGroupId = dg[0].id;
}


    // Division group
 

    // Add user to groups
    await connection.execute(
      "INSERT IGNORE INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, 0)",
      [branchGroupId, userId]
    );

    await connection.execute(
      "INSERT IGNORE INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, 0)",
      [divisionGroupId, userId]
    );
/* ---------------------------------------------------------
   BATCH GROUP (AUTO JOIN DURING REGISTRATION)
----------------------------------------------------------*/
if (batch) {

  const batchGroupName = `${branch}-${year}-${division}-Batch-${batch}`;

  // Check if batch group exists
  const [bgRows] = await connection.execute(
    "SELECT id, created_by FROM `groups` WHERE group_name = ? AND type = 'batch' LIMIT 1",
    [batchGroupName]
  );

  let batchGroupId;
  let createdBy;

  if (bgRows.length > 0) {
    batchGroupId = bgRows[0].id;
    createdBy = bgRows[0].created_by;
  } else {
    const [ins] = await connection.execute(
      "INSERT INTO `groups` (group_name, type, branch, year, division, created_by) VALUES (?, 'batch', ?, ?, ?, ?)",
      [batchGroupName, branch, year, division, userId]
    );
    batchGroupId = ins.insertId;
    createdBy = userId;
  }

  // Add user to batch group
  const isAdmin = createdBy === userId ? 1 : 0;

  await connection.execute(
    "INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, ?)",
    [batchGroupId, userId, isAdmin]
  );
}

    // Commit transaction ⭐
    await connection.commit();
    connection.release();

    return res.json({
      success: true,
      message: "Registration completed successfully",
      userId,
      branchGroupId,
      divisionGroupId
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    await connection.rollback();
    connection.release();
    return res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
};
