// services/socketService.js - UPDATED with hardcoded secret
const jwt = require('jsonwebtoken');
const { Message, ChatRoom } = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');

// ✅ HARDCODE THE SECRET DIRECTLY
const JWT_SECRET = 'helixbeat_super_secret_key_2024_123456789';

const activeUsers = new Map();
const userSockets = new Map();
const userRooms = new Map();

const setupSocketHandlers = (io) => {

    console.log('═══════════════════════════════════════');
    console.log('🔐 Socket Service Initialized (PRODUCTION MODE)');
    console.log('JWT_SECRET hardcoded:', JWT_SECRET.substring(0, 20) + '...');
    console.log('JWT_SECRET length:', JWT_SECRET.length);
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

                // ✅ USE HARDCODED SECRET
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

                socket.join(roomId);
                userRooms.get(userId).add(roomId);

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
                const { roomId, content, type = 'text' } = data;
                console.log(`💬 Message from ${user?.name || user?.email} in ${roomId}: ${content?.substring(0, 30)}`);

                // Broadcast to room
                io.to(roomId).emit('message:new', {
                    roomId: roomId,
                    message: {
                        id: Date.now().toString(),
                        content: content,
                        sender: { id: userId, name: user?.name || user?.email },
                        type: type,
                        createdAt: new Date().toISOString()
                    }
                });

                console.log(`✅ Message broadcasted to ${roomId}`);

            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: error.message });
            }
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

module.exports = {
    setupSocketHandlers,
    activeUsers
};