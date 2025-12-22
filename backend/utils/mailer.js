const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,              // ✅ REQUIRED
  secure: false,          // ✅ REQUIRED (true only for 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// 🔍 IMPORTANT: verify connection once
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP ready to send emails");
  }
});

async function sendOTP(email, otp) {
  const mailOptions = {
    from: `"UniSync" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "UniSync — Your verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif;line-height:1.4;color:#111;">
        <h2>UniSync Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="font-size:24px;font-weight:700;margin:12px 0;">${otp}</div>
        <p>This OTP is valid for 2 minutes.</p>
        <hr/>
        <p style="font-size:13px;color:#666;">
          If you did not request this, ignore this email.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTP };
