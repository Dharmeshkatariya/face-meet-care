
const express = require('express');
const router = express.Router();
const { login, register, refreshToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { decryptPassword } = require('../middleware/encryption');

router.post('/login', decryptPassword, login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

module.exports = router;