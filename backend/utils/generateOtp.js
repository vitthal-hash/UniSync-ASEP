// backend/utils/generateOtp.js

/**
 * Generates a 6-digit OTP code and a 2-minute expiry time.
 * Returns:
 *   { otp: "123456", expiresAt: Date }
 */

function generateOtp() {
  // Generate a 6 digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set expiry: current time + 2 minutes
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

  return { otp, expiresAt };
}

module.exports = generateOtp;
