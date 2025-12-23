// backend/utils/mailer.js

const nodemailer = require("nodemailer");

// ✅ Brevo SMTP transporter (stable, production-safe)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.BREVO_SMTP_USER, // always "apikey"
    pass: process.env.BREVO_SMTP_PASS  // SMTP key from Brevo
  }
});

// Optional: verify connection on startup
transporter.verify((err) => {
  if (err) {
    console.error("❌ Brevo SMTP error:", err.message);
  } else {
    console.log("✅ Brevo SMTP ready");
  }
});

async function sendOTP(email, otp) {
  return transporter.sendMail({
    from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
    to: email,
    subject: "UniSync — Your verification OTP",
    html: `
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
  });
}

module.exports = { sendOTP };
