// controllers/chatController.js
const { Message, ChatRoom } = require('../models/Chat');
const User = require('../models/User');
const { sendToUser } = require('../services/socketService');

// Get or create direct message room
exports.getOrCreateDirectRoom = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = req.params.userId;

        // Check if other user exists
        const otherUser = await User.findById(otherUserId);
        if (!otherUser) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        // Generate unique room ID for direct chat
        const roomId = [currentUserId, otherUserId].sort().join('-');

        // Find or create room
        let room = await ChatRoom.findOne({ roomId: roomId });

        if (!room) {
            room = new ChatRoom({
                roomId: roomId,
                type: 'direct',
                participants: [
                    { user: currentUserId, role: 'member' },
                    { user: otherUserId, role: 'member' }
                ],
                createdBy: currentUserId
            });

            await room.save();

            // Notify other user
            const io = req.app.get('io');
            sendToUser(io, otherUserId, 'room:created', {
                roomId: roomId,
                type: 'direct',
                createdBy: {
                    id: currentUserId,
                    name: req.user.name
                }
            });
        }

        res.json({
            status: true,
            data: room
        });

    } catch (error) {
        console.error('Get or create room error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to get or create chat room'
        });
    }
};

// Get user's chat rooms
exports.getChatRooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const rooms = await ChatRoom.find({
            'participants.user': userId,
            isActive: true
        })
        .populate('participants.user', 'name email avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await ChatRoom.countDocuments({
            'participants.user': userId,
            isActive: true
        });

        // Get unread counts for each room
        const roomsWithUnread = await Promise.all(rooms.map(async (room) => {
            const unreadCount = await Message.countDocuments({
                room: room.roomId,
                'readBy.user': { $ne: userId },
                sender: { $ne: userId }
            });

            const roomObj = room.toObject();
            roomObj.unreadCount = unreadCount;

            // For direct chats, get other user info
            if (room.type === 'direct') {
                const otherParticipant = room.participants.find(
                    p => p.user._id.toString() !== userId
                );
                roomObj.otherUser = otherParticipant?.user;
            }

            return roomObj;
        }));

        res.json({
            status: true,
            data: roomsWithUnread,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get chat rooms error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to get chat rooms'
        });
    }
};

// Get messages for a room
exports.getMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;
        const { before, limit = 50 } = req.query;

        // Verify user has access to room
        const room = await ChatRoom.findOne({
            roomId: roomId,
            'participants.user': userId,
            isActive: true
        });

        if (!room) {
            return res.status(403).json({
                status: false,
                message: 'Access denied'
            });
        }

        // Build query
        const query = { room: roomId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('sender', 'name email avatar')
            .lean();

        res.json({
            status: true,
            data: messages.reverse()
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to get messages'
        });
    }
};

// Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { messageIds } = req.body;
        const userId = req.user.id;

        await Message.updateMany(
            {
                _id: { $in: messageIds },
                room: roomId,
                'readBy.user': { $ne: userId }
            },
            {
                $push: {
                    readBy: {
                        user: userId,
                        readAt: new Date()
                    }
                }
            }
        );

        res.json({
            status: true,
            message: 'Messages marked as read'
        });

    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to mark messages as read'
        });
    }
};

// Create group room
exports.createGroupRoom = async (req, res) => {
    try {
        const { name, participants } = req.body;
        const userId = req.user.id;

        // Generate unique room ID
        const roomId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add creator as admin
        const allParticipants = [
            { user: userId, role: 'admin' },
            ...participants.map(p => ({ user: p, role: 'member' }))
        ];

        const room = new ChatRoom({
            roomId: roomId,
            name: name,
            type: 'group',
            participants: allParticipants,
            createdBy: userId
        });

        await room.save();

        // Notify all participants
        const io = req.app.get('io');
        participants.forEach(participantId => {
            sendToUser(io, participantId, 'room:created', {
                roomId: roomId,
                type: 'group',
                name: name,
                createdBy: {
                    id: userId,
                    name: req.user.name
                }
            });
        });

        res.status(201).json({
            status: true,
            data: room
        });

    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to create group'
        });
    }
};

// Add user to room
exports.addUserToRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId: userToAdd } = req.body;
        const currentUserId = req.user.id;

        const room = await ChatRoom.findOne({
            roomId: roomId,
            'participants.user': currentUserId,
            'participants.role': 'admin'
        });

        if (!room) {
            return res.status(403).json({
                status: false,
                message: 'Not authorized to add users'
            });
        }

        // Check if user already in room
        const userExists = room.participants.some(p => p.user.toString() === userToAdd);
        if (userExists) {
            return res.status(400).json({
                status: false,
                message: 'User already in room'
            });
        }

        room.participants.push({ user: userToAdd, role: 'member' });
        await room.save();

        res.json({
            status: true,
            data: room
        });

    } catch (error) {
        console.error('Add user error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to add user'
        });
    }
};

// Remove user from room
exports.removeUserFromRoom = async (req, res) => {
    try {
        const { roomId, userId: userToRemove } = req.params;
        const currentUserId = req.user.id;

        const room = await ChatRoom.findOne({
            roomId: roomId,
            'participants.user': currentUserId,
            'participants.role': 'admin'
        });

        if (!room) {
            return res.status(403).json({
                status: false,
                message: 'Not authorized to remove users'
            });
        }

        room.participants = room.participants.filter(
            p => p.user.toString() !== userToRemove
        );
        await room.save();

        res.json({
            status: true,
            data: room
        });

    } catch (error) {
        console.error('Remove user error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to remove user'
        });
    }
};

// Delete message
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                status: false,
                message: 'Message not found'
            });
        }

        // Check if user is message sender
        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                status: false,
                message: 'Not authorized to delete this message'
            });
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        await message.save();

        // Notify room
        const io = req.app.get('io');
        io.to(message.room).emit('message:deleted', {
            roomId: message.room,
            messageId: message._id
        });

        res.json({
            status: true,
            message: 'Message deleted'
        });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to delete message'
        });
    }
};

// Edit message
exports.editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                status: false,
                message: 'Message not found'
            });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                status: false,
                message: 'Not authorized to edit this message'
            });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        // Notify room
        const io = req.app.get('io');
        io.to(message.room).emit('message:edited', {
            roomId: message.room,
            messageId: message._id,
            content: content
        });

        res.json({
            status: true,
            data: message
        });

    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to edit message'
        });
    }
};