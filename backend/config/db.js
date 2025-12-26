// backend/config/db.js
const mysql = require("mysql2/promise");

// ⚠️ DO NOT load dotenv in production
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// TEST DATABASE CONNECTION AT STARTUP
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ CONNECTED TO RAILWAY MYSQL");
    connection.release();
  } catch (err) {
    console.error("❌ DATABASE CONNECTION ERROR:", err);
  }
})();
// ===============================
// AUTO CREATE ANALYTICS TABLES
// ===============================
(async () => {
  try {
    // 1️⃣ Hourly activity table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS group_hourly_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        activity_date DATE NOT NULL,
        hour TINYINT NOT NULL,
        messages_count INT DEFAULT 0,
        online_users_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_group_day_hour (group_id, activity_date, hour)
      )
    `);

    // 2️⃣ Daily peak summary table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS group_daily_peaks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        activity_date DATE NOT NULL,
        peak_message_hour TINYINT,
        peak_message_count INT,
        peak_online_hour TINYINT,
        peak_online_count INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_group_day (group_id, activity_date)
      )
    `);

    console.log("✅ Analytics tables ensured");
  } catch (err) {
    console.error("❌ Analytics table creation failed:", err);
  }
})();

module.exports = pool;
