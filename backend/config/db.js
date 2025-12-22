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

module.exports = pool;
