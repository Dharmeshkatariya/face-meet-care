// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Get current user
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        res.json({
            status: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                type: 'User'
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
});

// Get user by ID
router.get('/:userId', protect, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.userId });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        res.json({
            status: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
});

// Update user
router.put('/:userId', protect, async (req, res) => {
    try {
        const { name, phone } = req.body;

        const user = await User.findOne({ id: req.params.userId });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;

        await user.save();

        res.json({
            status: true,
            message: 'User updated successfully',
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
});

module.exports = router;