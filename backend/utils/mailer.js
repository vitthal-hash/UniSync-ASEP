// backend/utils/mailer.js
const axios = require("axios");

async function sendOTP(email, otp) {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "UniSync",
          email: "vm7368514@gmail.com"
        },
        to: [
          {
            email: email
          }
        ],
        subject: "UniSync — Your verification OTP",
        htmlContent: `
          <h2>UniSync Verification</h2>
          <p>Your OTP is:</p>
          <h1>${otp}</h1>
          <p>Valid for 2 minutes</p>
        `
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "accept": "application/json"
        }
      }
    );

    console.log("✅ OTP email sent via Brevo API");
  } catch (err) {
    console.error("❌ Brevo API email failed:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendOTP };
