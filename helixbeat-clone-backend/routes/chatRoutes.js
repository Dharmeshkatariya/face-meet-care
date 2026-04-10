// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Get user's chat rooms
router.get('/rooms', protect, (req, res) => {
    res.json({
        status: true,
        data: [],
        message: 'Chat rooms endpoint'
    });
});

// Get messages for a room
router.get('/rooms/:roomId/messages', protect, (req, res) => {
    res.json({
        status: true,
        data: [],
        message: 'Messages endpoint'
    });
});

module.exports = router;