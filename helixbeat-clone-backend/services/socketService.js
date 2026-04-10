// services/socketService.js
const jwt = require('jsonwebtoken');
const { Message, ChatRoom } = require('../models/Chat');
const User = require('../models/User');

const activeUsers = new Map();
const userSockets = new Map();
const userRooms = new Map();

const setupSocketHandlers = (io, JWT_SECRET) => {

    console.log('═══════════════════════════════════════');
    console.log('🔐 Socket Service Initialized');
    console.log('JWT_SECRET received:', JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'MISSING!');
    console.log('JWT_SECRET length:', JWT_SECRET?.length || 0);
    console.log('═══════════════════════════════════════');

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token ||
                       socket.handshake.headers.authorization;

            console.log('═══════════════════════════════════════');
            console.log('🔐 Socket Auth Attempt');
            console.log('Token exists:', !!token);

            if (!token) {
                console.log('❌ No token provided - allowing connection for testing');
                // ✅ FOR TESTING: Allow connection without token
                socket.user = { _id: 'anonymous', name: 'Anonymous', email: 'anonymous@test.com' };
                socket.userId = 'anonymous';
                return next();
            }

            const cleanToken = token.replace('Bearer ', '').trim();
            console.log('Token preview:', cleanToken.substring(0, 50) + '...');

            try {
                // First decode without verification to see payload
                const decodedNoVerify = jwt.decode(cleanToken);
                console.log('Token payload:', JSON.stringify(decodedNoVerify, null, 2));

                // ✅ USE THE PASSED JWT_SECRET
                const decoded = jwt.verify(cleanToken, JWT_SECRET);
                console.log('✅ Token verified successfully!');

                const userId = decoded.sub || decoded.id || decoded.userId || decoded._id;

                if (!userId) {
                    console.log('❌ No user ID in token, using decoded email');
                    // Try to find by email
                    if (decoded.email) {
                        const user = await User.findOne({ email: decoded.email }).select('-password');
                        if (user) {
                            socket.user = user;
                            socket.userId = user._id.toString();
                            console.log(`✅ User found by email: ${user.email}`);
                            return next();
                        }
                    }
                    return next(new Error('Invalid token payload'));
                }

                // Find user
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

                // ✅ FOR TESTING: Allow connection even with invalid token
                console.log('⚠️ Allowing connection despite invalid token (TEST MODE)');
                socket.user = { _id: 'test-user', name: 'Test User', email: 'test@test.com' };
                socket.userId = 'test-user';
                next();
            }

        } catch (error) {
            console.error('❌ Socket auth error:', error.message);
            // Allow connection anyway for testing
            socket.user = { _id: 'test-user', name: 'Test User', email: 'test@test.com' };
            socket.userId = 'test-user';
            next();
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

        // Ping/Pong
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });

        // Join Room
        socket.on('room:join', async (data) => {
            try {
                const { roomId } = data;
                console.log(`🚪 Join room: ${roomId} from ${user?.name || userId}`);

                socket.join(roomId);
                userRooms.get(userId).add(roomId);

                socket.emit('room:joined', {
                    roomId: roomId,
                    message: 'Successfully joined room',
                    timestamp: new Date().toISOString()
                });

                socket.to(roomId).emit('room:user-joined', {
                    roomId: roomId,
                    user: { id: userId, name: user?.name || 'User' },
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
                user: { id: userId, name: user?.name || 'User' },
                timestamp: new Date().toISOString()
            });

            console.log(`👋 User left room: ${roomId}`);
        });

        // Send Message
        socket.on('message:send', async (data) => {
            try {
                const { roomId, content, type = 'text' } = data;
                console.log(`💬 Message in ${roomId}: ${content?.substring(0, 30)}`);

                // Save to database if models exist
                try {
                    const message = new Message({
                        sender: userId,
                        room: roomId,
                        content: content,
                        type: type
                    });
                    await message.save();
                } catch (dbError) {
                    console.log('⚠️ Database save skipped:', dbError.message);
                }

                // Broadcast to room
                io.to(roomId).emit('message:new', {
                    roomId: roomId,
                    message: {
                        id: Date.now().toString(),
                        content: content,
                        sender: { id: userId, name: user?.name || 'User' },
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
            console.log(`❌ User disconnected: ${user?.name || userId}`);
            activeUsers.delete(userId);
            userSockets.delete(socket.id);
            userRooms.delete(userId);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    console.log('✅ Socket.io handlers initialized');
};

module.exports = {
    setupSocketHandlers,
    activeUsers
};