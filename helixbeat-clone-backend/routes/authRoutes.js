// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, register, refreshToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { decryptPassword } = require('../middleware/encryption');

// Handle OPTIONS preflight requests
router.options('/login', (req, res) => {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

router.options('/register', (req, res) => res.sendStatus(200));
router.options('/refresh-token', (req, res) => res.sendStatus(200));
router.options('/logout', (req, res) => res.sendStatus(200));

// Your routes
router.post('/login', decryptPassword, login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

module.exports = router;