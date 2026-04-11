// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// ✅ ADD THIS: Get all users (for chat contacts)
router.get('/', protect, async (req, res) => {
    try {
        // Get all active users except the current user
        const users = await User.find({
            id: { $ne: req.user.id }, // Exclude current user
            isActive: { $ne: false }  // Only active users
        }).select('id email name phone isOnline lastSeen avatar auth_user_id');

        // Format response
        const formattedUsers = users.map(user => ({
            id: user.id || user.auth_user_id || user._id,
            name: user.name || user.email?.split('@')[0] || 'User',
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen
        }));

        res.json({
            status: true,
            data: formattedUsers,
            total: formattedUsers.length
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get current user
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [
                { id: req.user.id },
                { auth_user_id: req.user.id },
                { _id: req.user.id }
            ]
        });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        res.json({
            status: true,
            data: {
                id: user.id || user.auth_user_id || user._id,
                email: user.email,
                name: user.name,
                type: 'User',
                avatar: user.avatar,
                isOnline: user.isOnline || false
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
        const user = await User.findOne({
            $or: [
                { id: req.params.userId },
                { auth_user_id: req.params.userId },
                { _id: req.params.userId }
            ]
        });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        res.json({
            status: true,
            data: {
                id: user.id || user.auth_user_id || user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: user.avatar,
                isOnline: user.isOnline || false,
                lastSeen: user.lastSeen
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
        const { name, phone, avatar } = req.body;

        const user = await User.findOne({
            $or: [
                { id: req.params.userId },
                { auth_user_id: req.params.userId },
                { _id: req.params.userId }
            ]
        });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({
            status: true,
            message: 'User updated successfully',
            data: {
                id: user.id || user.auth_user_id || user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: user.avatar
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

// ✅ ADD THIS: Search users by name or email
router.get('/search/:query', protect, async (req, res) => {
    try {
        const query = req.params.query;

        if (!query || query.length < 2) {
            return res.json({
                status: true,
                data: []
            });
        }

        const users = await User.find({
            $and: [
                { id: { $ne: req.user.id } }, // Exclude current user
                { isActive: { $ne: false } }, // Only active users
                {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select('id email name avatar isOnline lastSeen auth_user_id').limit(20);

        const formattedUsers = users.map(user => ({
            id: user.id || user.auth_user_id || user._id,
            name: user.name || user.email?.split('@')[0] || 'User',
            email: user.email,
            avatar: user.avatar,
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen
        }));

        res.json({
            status: true,
            data: formattedUsers
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
});

module.exports = router;