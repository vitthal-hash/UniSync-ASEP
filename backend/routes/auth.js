// backend/routes/auth.js
const express = require('express');
const router = express.Router();

// controllers (will be delivered in next messages)
const authController = require('../controllers/authController');

// Routes:
// POST  /api/auth/send-otp      -> send OTP to an email (store in DB)
// POST  /api/auth/verify-otp    -> verify OTP code
// POST  /api/auth/register      -> register user (hash password, save profile, create groups)
// POST  /api/auth/login         -> login (email + password -> returns JWT)
// POST  /api/auth/logout        -> (optional) logout - handled client-side / token invalidation strategy

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/set-password', authController.setPassword);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout); // optional handler

module.exports = router;
