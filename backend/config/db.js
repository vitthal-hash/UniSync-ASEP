// backend/config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "unisync",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// TEST DATABASE CONNECTION AT STARTUP
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("📦 MySQL Database Connected Successfully");
    connection.release();
  } catch (err) {
    console.error("❌ DATABASE CONNECTION ERROR:", err.message);
  }
})();

module.exports = pool;
