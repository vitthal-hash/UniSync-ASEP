const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// POST: Save Contact Message
router.post("/send-message", (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.json({ message: "All fields are required." });
    }

    // Check if email exists in users table (correct column is `email`)
    const checkUser = "SELECT id FROM users WHERE email = ?";
    pool.query(checkUser, [email], (err, users) => {
        if (err) {
            console.log("User Check Error:", err);
            return res.json({ message: "Database error." });
        }

        if (users.length === 0) {
            return res.json({ message: "Email not registered." });
        }

        // Insert message
        const insertSQL =
            "INSERT INTO contact_messages (full_name, email, subject, message) VALUES (?, ?, ?, ?)";
        pool.query(insertSQL, [name, email, subject, message], (err) => {
            if (err) {
                console.log("Insert Error:", err);
                return res.json({ message: "Database error inserting message." });
            }

            res.json({ message: "Message sent successfully!" });
        });
    });
});

module.exports = router;
