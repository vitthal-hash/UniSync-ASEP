// backend/utils/mailer.js
console.log("🔥 USING BREVO HTTP API MAILER");

const axios = require("axios");

async function sendOTP(email, otp) {
  const res = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "UniSync"
      },
      to: [{ email }],
      subject: "UniSync — Your verification OTP",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#111;">
          <h2>UniSync Verification</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="font-size:26px;font-weight:bold;letter-spacing:2px;">
            ${otp}
          </div>
          <p>This OTP is valid for <b>2 minutes</b>.</p>
          <hr/>
          <p style="font-size:13px;color:#666;">
            If you did not request this OTP, ignore this email.
          </p>
        </div>
      `
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    }
  );

  return res.data;
}

module.exports = { sendOTP };
