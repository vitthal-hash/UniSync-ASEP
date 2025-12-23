// backend/utils/mailer.js
const nodemailer = require("nodemailer");

console.log("SMTP USER:", process.env.BREVO_SMTP_USER ? "FOUND" : "MISSING");
console.log("SMTP PASS:", process.env.BREVO_SMTP_PASS ? "FOUND" : "MISSING");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true, // IMPORTANT
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
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
