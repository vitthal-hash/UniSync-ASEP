// backend/utils/mailer.js
const nodemailer = require("nodemailer");

// 🔐 Brevo SMTP – Railway safe configuration
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,            // ✅ IMPORTANT for Railway
  secure: true,         // ✅ REQUIRED with 465
  auth: {
    user: process.env.BREVO_SMTP_USER, // SMTP LOGIN from Brevo
    pass: process.env.BREVO_SMTP_PASS  // SMTP PASSWORD from Brevo
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000
});

// Check connection on startup
transporter.verify((err) => {
  if (err) {
    console.error("❌ Brevo SMTP error:", err);
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
