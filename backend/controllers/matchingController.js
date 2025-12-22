// backend/controllers/matchingController.js

const pool = require("../config/db");

/**
 * CONTROLLER PART 1: FETCH USER + GROUP MEMBERS
 * This part:
 * 1. Validates membership
 * 2. Fetches logged-in user's base record
 * 3. Fetches all group members except the user
 * 
 * Next parts will fetch skills/interests/languages and compute match %
 */

exports.getMatchingForGroup = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const { groupId } = req.params;

    // ------------------------------
    // Step 1: Check if user is in this group
    // ------------------------------
    const [memberCheck] = await pool.execute(
      "SELECT id FROM group_members WHERE user_id = ? AND group_id = ?",
      [loggedInUserId, groupId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group"
      });
    }

    // ------------------------------
    // Step 2: Fetch logged-in user basic data
    // ------------------------------
    const [loggedInUserRows] = await pool.execute(
      `SELECT id, full_name, email, branch, year, division, batch, city, gender, clubs
       FROM users WHERE id = ? LIMIT 1`,
      [loggedInUserId]
    );

    if (loggedInUserRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Your user record was not found"
      });
    }

    const loggedInUser = loggedInUserRows[0];
loggedInUser.clubs = loggedInUser.clubs
  ? loggedInUser.clubs.split(",").map(c => c.trim())
  : [];

    // ------------------------------
    // Step 3: Fetch other members of the group
    // ------------------------------
 const [members] = await pool.execute(
  `SELECT 
      u.id,
      u.full_name,
      u.email,
      u.branch,
      u.year,
      u.division,
      u.batch,
      u.city,
      u.gender,
      u.clubs
   FROM group_members gm
   JOIN users u ON gm.user_id = u.id
   WHERE gm.group_id = ? AND u.id != ?
   ORDER BY u.full_name`,
  [groupId, loggedInUserId]
);


    // Prepare data for next steps:
    req.matchingData = {
      loggedInUser,
      members
    };

    // DO NOT SEND RESPONSE YET — PART 2 continues the logic

    // --------------------------------------------
    // PART 2: FETCH SKILLS / INTERESTS / LANGUAGES
    // --------------------------------------------

    const loggedUserId = loggedInUser.id;
    const membersList = members;  // array of group members

    // Helper function to fetch list of strings for any table
    async function fetchUserAttributes(userId, table, masterTable) {
      const [rows] = await pool.execute(
        `SELECT mt.name
         FROM ${table} ut
         JOIN ${masterTable} mt ON ut.${table.slice(5, -1)}_id = mt.id
         WHERE ut.user_id = ?`,
        [userId]
      );
      return rows.map(r => r.name);
    }

    // 1. Fetch logged-in user's attributes
    const loggedInUserSkills = await fetchUserAttributes(
      loggedUserId,
      "user_skills",
      "skills_master"
    );

    const loggedInUserInterests = await fetchUserAttributes(
      loggedUserId,
      "user_interests",
      "interests_master"
    );

    const loggedInUserLanguages = await fetchUserAttributes(
      loggedUserId,
      "user_languages",
      "languages_master"
    );

    // Prepare match objects
    const processedMembers = [];

    // 2. Fetch attributes of each group member
    for (const member of membersList) {
      const memberSkills = await fetchUserAttributes(
        member.id,
        "user_skills",
        "skills_master"
      );

      const memberInterests = await fetchUserAttributes(
        member.id,
        "user_interests",
        "interests_master"
      );

      const memberLanguages = await fetchUserAttributes(
        member.id,
        "user_languages",
        "languages_master"
      );
const memberClubs = member.clubs
  ? member.clubs.split(",").map(c => c.trim())
  : [];

      processedMembers.push({
        ...member,
        clubs: memberClubs,
        skills: memberSkills,
        interests: memberInterests,
        languages: memberLanguages
      });
    }

    // Store inside req for next step (Part 3)
    req.matchingData.loggedInUser.skills = loggedInUserSkills;
    req.matchingData.loggedInUser.interests = loggedInUserInterests;
    req.matchingData.loggedInUser.languages = loggedInUserLanguages;

    req.matchingData.members = processedMembers;

    // PART 3 will calculate:
    // - Common attributes
    // - Match percentage

    // --------------------------------------------
    // PART 3: COMPUTE MATCHING LOGIC
    // --------------------------------------------

    const userSkills = req.matchingData.loggedInUser.skills;
    const userInterests = req.matchingData.loggedInUser.interests;
    const userLanguages = req.matchingData.loggedInUser.languages;

    const membersToCompare = req.matchingData.members;

    const finalMatches = [];

    for (const member of membersToCompare) {
      
      // Common lists
      const commonSkills = member.skills.filter(s => userSkills.includes(s));
      const commonInterests = member.interests.filter(i => userInterests.includes(i));
      const commonLanguages = member.languages.filter(l => userLanguages.includes(l));
      const commonClubs = member.clubs.filter(c =>
  loggedInUser.clubs.includes(c)
);

      const sameCity = member.city === loggedInUser.city ? member.city : null;
const sameGender = member.gender === loggedInUser.gender ? member.gender : null;
const sameBatch = member.batch === loggedInUser.batch ? member.batch : null;

      // Total possible matches (sum of three categories)
  // WEIGHTS
const SKILL_WEIGHT = 40;
const INTEREST_WEIGHT = 30;
const LANGUAGE_WEIGHT = 20;
const CLUB_WEIGHT = 10;
const CITY_WEIGHT = 5;
const GENDER_WEIGHT = 5;
const BATCH_WEIGHT = 10;
// Total available for user
const totalSkills = userSkills.length;
const totalInterests = userInterests.length;
const totalLanguages = userLanguages.length;

let score = 0;

// --- Skills ---
if (totalSkills > 0) {
  score += (commonSkills.length / totalSkills) * SKILL_WEIGHT;
}

// --- Interests ---
if (totalInterests > 0) {
  score += (commonInterests.length / totalInterests) * INTEREST_WEIGHT;
}

// --- Languages ---
if (totalLanguages > 0) {
  score += (commonLanguages.length / totalLanguages) * LANGUAGE_WEIGHT;
}
if (loggedInUser.clubs.length > 0) {
  score += (commonClubs.length / loggedInUser.clubs.length) * CLUB_WEIGHT;
}

// --- City match ---
if (sameCity) score += CITY_WEIGHT;

// --- Gender match ---
if (sameGender) score += GENDER_WEIGHT;
if (sameBatch) score += BATCH_WEIGHT;
// Final percentage
const matchPercentage = Math.round(score);


      // Add computed match data
   finalMatches.push({
  user_id: member.id,
  full_name: member.full_name,
  email: member.email,
  branch: member.branch,
  year: member.year,
  division: member.division,

  city: member.city,
  gender: member.gender,

  skills: member.skills,
  interests: member.interests,
  languages: member.languages,

  commonSkills,
  commonInterests,
  commonLanguages,
commonClubs,
  sameCity,
  sameGender,
sameBatch,
  matchPercentage
});

    }

    // Sort members by best match first
    finalMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Store for Part 4 (final response)
    req.matchingData.finalMatches = finalMatches;

    // Continue to PART 4...
    // --------------------------------------------
    // PART 4: SEND FINAL RESPONSE
    // --------------------------------------------

    return res.json({
      success: true,
      loggedInUser: {
        id: req.matchingData.loggedInUser.id,
        full_name: req.matchingData.loggedInUser.full_name,
        email: req.matchingData.loggedInUser.email,
        branch: req.matchingData.loggedInUser.branch,
        year: req.matchingData.loggedInUser.year,
        division: req.matchingData.loggedInUser.division,

        skills: userSkills,
        interests: userInterests,
        languages: userLanguages
      },
      matches: req.matchingData.finalMatches
    });

  } catch (err) {
    console.error("Error in matching controller:", err);
    return res.status(500).json({
      success: false,
      message: "Server error computing matches"
    });
  }
};
