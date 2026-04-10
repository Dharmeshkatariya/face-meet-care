// services/socketService.js - PRODUCTION VERSION
const jwt = require('jsonwebtoken');
const { Message, ChatRoom } = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');

const activeUsers = new Map();
const userSockets = new Map();
const userRooms = new Map();

const setupSocketHandlers = (io, JWT_SECRET) => {

    console.log('═══════════════════════════════════════');
    console.log('🔐 Socket Service Initialized (PRODUCTION MODE)');
    console.log('JWT_SECRET received:', JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'MISSING!');
    console.log('JWT_SECRET length:', JWT_SECRET?.length || 0);
    console.log('═══════════════════════════════════════');

    // Authentication middleware - PRODUCTION MODE
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token ||
                       socket.handshake.headers.authorization;

            console.log('═══════════════════════════════════════');
            console.log('🔐 Socket Auth Attempt');
            console.log('Token exists:', !!token);

            if (!token) {
                console.log('❌ No token provided - Authentication required');
                return next(new Error('Authentication required'));
            }

            const cleanToken = token.replace('Bearer ', '').trim();
            console.log('Token preview:', cleanToken.substring(0, 50) + '...');

            try {
                // First decode without verification to see payload
                const decodedNoVerify = jwt.decode(cleanToken);
                console.log('Token payload:', JSON.stringify(decodedNoVerify, null, 2));

                // Verify with JWT_SECRET
                const decoded = jwt.verify(cleanToken, JWT_SECRET);
                console.log('✅ Token verified successfully!');

                // Extract user ID from various possible fields
                const userId = decoded.sub || decoded.id || decoded.userId || decoded._id;

                if (!userId) {
                    console.log('❌ No user ID in token payload');
                    return next(new Error('Invalid token payload'));
                }

                // Find user in database
                const user = await User.findOne({
                    $or: [
                        { _id: userId },
                        { id: userId },
                        { auth_user_id: userId }
                    ]
                }).select('-password');

                if (!user) {
                    console.log('❌ User not found for ID:', userId);
                    return next(new Error('User not found'));
                }

                socket.user = user;
                socket.userId = user._id.toString();

                console.log(`✅ Socket authenticated: ${user.name || user.email}`);
                console.log('═══════════════════════════════════════');
                next();

            } catch (jwtError) {
                console.error('❌ JWT verification failed:', jwtError.message);
                console.log('═══════════════════════════════════════');
                return next(new Error('Invalid token: ' + jwtError.message));
            }

        } catch (error) {
            console.error('❌ Socket auth error:', error.message);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        const user = socket.user;

        console.log(`✅ User connected: ${user?.name || user?.email || 'Unknown'} - Socket: ${socket.id}`);

        activeUsers.set(userId, socket.id);
        userSockets.set(socket.id, userId);

        if (!userRooms.has(userId)) {
            userRooms.set(userId, new Set());
        }

        // Send auth success
        socket.emit('auth_success', {
            userId: userId,
            socketId: socket.id,
            user: {
                id: userId,
                name: user?.name || 'User',
                email: user?.email || ''
            },
            timestamp: new Date().toISOString()
        });

        // Broadcast online status
        socket.broadcast.emit('user:online', {
            userId: userId,
            name: user?.name || user?.email,
            timestamp: new Date().toISOString()
        });

        // Ping/Pong
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });

        // Join Room
        socket.on('room:join', async (data) => {
            try {
                const { roomId } = data;
                console.log(`🚪 Join room: ${roomId} from ${user?.name || user?.email}`);

                // Verify user has access or create room
                let room = await ChatRoom.findOne({ roomId: roomId, isActive: true });

                if (!room) {
                    // Create new room
                    room = new ChatRoom({
                        roomId: roomId,
                        type: roomId.includes('group') ? 'group' : 'direct',
                        name: `Room ${roomId}`,
                        participants: [{ user: userId, role: 'admin' }],
                        createdBy: userId,
                        isActive: true
                    });
                    await room.save();
                    console.log(`📝 Created new room: ${roomId}`);
                } else {
                    // Check if user is participant
                    const isParticipant = room.participants.some(
                        p => p.user.toString() === userId
                    );
                    if (!isParticipant) {
                        room.participants.push({ user: userId, role: 'member' });
                        await room.save();
                    }
                }

                socket.join(roomId);
                userRooms.get(userId).add(roomId);

                // Update last seen
                await ChatRoom.updateOne(
                    { roomId: roomId, 'participants.user': userId },
                    { $set: { 'participants.$.lastSeen': new Date() } }
                );

                socket.emit('room:joined', {
                    roomId: roomId,
                    message: 'Successfully joined room',
                    timestamp: new Date().toISOString()
                });

                socket.to(roomId).emit('room:user-joined', {
                    roomId: roomId,
                    user: { id: userId, name: user?.name || user?.email },
                    timestamp: new Date().toISOString()
                });

                // Send recent messages
                const messages = await Message.find({ room: roomId })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .populate('sender', 'name email')
                    .lean();

                socket.emit('room:messages', {
                    roomId: roomId,
                    messages: messages.reverse()
                });

                console.log(`✅ User joined room: ${roomId}`);

            } catch (error) {
                console.error('Room join error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Leave Room
        socket.on('room:leave', (data) => {
            const { roomId } = data;
            socket.leave(roomId);

            if (userRooms.has(userId)) {
                userRooms.get(userId).delete(roomId);
            }

            socket.to(roomId).emit('room:user-left', {
                roomId: roomId,
                user: { id: userId, name: user?.name || user?.email },
                timestamp: new Date().toISOString()
            });

            console.log(`👋 User left room: ${roomId}`);
        });

        // Send Message
        socket.on('message:send', async (data) => {
            try {
                const { roomId, content, type = 'text', fileUrl, fileName } = data;
                console.log(`💬 Message from ${user?.name || user?.email} in ${roomId}: ${content?.substring(0, 30)}`);

                // Verify user is in room
                let room = await ChatRoom.findOne({
                    roomId: roomId,
                    'participants.user': userId,
                    isActive: true
                });

                if (!room) {
                    return socket.emit('error', { message: 'Not a member of this room' });
                }

                // Create message
                const message = new Message({
                    sender: new mongoose.Types.ObjectId(userId),
                    room: roomId,
                    content: content,
                    type: type,
                    fileUrl: fileUrl,
                    fileName: fileName
                });

                await message.save();
                await message.populate('sender', 'name email');

                // Update room's last message
                await ChatRoom.updateOne(
                    { roomId: roomId },
                    { lastMessage: message._id }
                );

                // Emit to all users in room
                io.to(roomId).emit('message:new', {
                    roomId: roomId,
                    message: {
                        id: message._id,
                        content: message.content,
                        sender: {
                            id: userId,
                            name: user?.name || user?.email
                        },
                        type: message.type,
                        createdAt: message.createdAt
                    }
                });

                // Send notification to offline users
                const receiverParticipant = room.participants.find(
                    p => p.user.toString() !== userId
                );
                if (receiverParticipant) {
                    const receiverId = receiverParticipant.user.toString();
                    const receiverSocketId = activeUsers.get(receiverId);

                    if (receiverSocketId && !userRooms.get(receiverId)?.has(roomId)) {
                        io.to(receiverSocketId).emit('notification:message', {
                            roomId: roomId,
                            sender: {
                                id: userId,
                                name: user?.name || user?.email
                            },
                            preview: content.substring(0, 50),
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                console.log(`✅ Message sent in ${roomId}`);

            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Message Read Receipt
        socket.on('message:read', async (data) => {
            try {
                const { roomId, messageIds } = data;

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

                socket.to(roomId).emit('message:read-receipt', {
                    roomId: roomId,
                    messageIds: messageIds,
                    readBy: userId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Message read error:', error);
            }
        });

        // Typing Indicator
        socket.on('typing:start', (data) => {
            const { roomId } = data;
            socket.to(roomId).emit('typing:started', {
                roomId: roomId,
                user: { id: userId, name: user?.name || user?.email },
                timestamp: new Date().toISOString()
            });
        });

        socket.on('typing:stop', (data) => {
            const { roomId } = data;
            socket.to(roomId).emit('typing:stopped', {
                roomId: roomId,
                user: { id: userId, name: user?.name || user?.email },
                timestamp: new Date().toISOString()
            });
        });

        // Get Online Users
        socket.on('users:online', () => {
            const onlineUserIds = Array.from(activeUsers.keys());
            socket.emit('users:online-list', {
                onlineUsers: onlineUserIds,
                total: onlineUserIds.length,
                timestamp: new Date().toISOString()
            });
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${user?.name || user?.email}`);
            activeUsers.delete(userId);
            userSockets.delete(socket.id);

            socket.broadcast.emit('user:offline', {
                userId: userId,
                name: user?.name || user?.email,
                timestamp: new Date().toISOString()
            });

            userRooms.delete(userId);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    console.log('✅ Socket.io handlers initialized (PRODUCTION MODE)');
};

// Helper functions
const sendToUser = (io, userId, event, data) => {
    const socketId = activeUsers.get(userId);
    if (socketId) {
        io.to(socketId).emit(event, data);
        return true;
    }
    return false;
};

const broadcastToRoom = (io, roomId, event, data, excludeUserId = null) => {
    if (excludeUserId) {
        const excludeSocketId = activeUsers.get(excludeUserId);
        if (excludeSocketId) {
            io.to(roomId).except(excludeSocketId).emit(event, data);
        } else {
            io.to(roomId).emit(event, data);
        }
    } else {
        io.to(roomId).emit(event, data);
    }
};

module.exports = {
    setupSocketHandlers,
    sendToUser,
    broadcastToRoom,
    activeUsers
};