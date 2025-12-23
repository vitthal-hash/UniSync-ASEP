const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

async function sendOTP(email, otp) {
  return transporter.sendMail({
    from: "UniSync <vm7368514@gmail.com>",
    to: email,
    subject: "UniSync — Your verification OTP",
    html: `<h2>Your OTP is ${otp}</h2>`
  });
}

module.exports = { sendOTP };
