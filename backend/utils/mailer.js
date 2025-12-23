// backend/utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

// Verify SMTP connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ Brevo SMTP failed:", error);
  } else {
    console.log("✅ Brevo SMTP ready");
  }
});

async function sendOTP(email, otp) {
  return transporter.sendMail({
    from: "UniSync <vm7368514@gmail.com>",
    to: email,
    subject: "UniSync — Your verification OTP",
    html: `
      <h2>UniSync Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>Valid for 2 minutes</p>
    `
  });
}

module.exports = { sendOTP };
