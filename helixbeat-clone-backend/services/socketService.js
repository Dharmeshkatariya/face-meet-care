// services/socketService.js
const jwt = require('jsonwebtoken');
const { Message, ChatRoom } = require('../models/Chat');
const User = require('../models/User');

// Store active connections
const activeUsers = new Map();
const userSockets = new Map();
const userRooms = new Map();

const setupSocketHandlers = (io) => {
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token ||
                       socket.handshake.headers.authorization;

            console.log('🔐 Socket auth attempt - Token exists:', !!token);

            if (!token) {
                console.log('❌ No token provided');
                return next(new Error('Authentication required'));
            }

            const cleanToken = token.replace('Bearer ', '').trim();

            console.log('🔑 Verifying token:', cleanToken.substring(0, 30) + '...');

            try {
                const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
                console.log('✅ Token decoded successfully');

                const userId = decoded.sub || decoded.id || decoded.userId || decoded._id;

                if (!userId) {
                    console.log('❌ No user ID in token payload');
                    return next(new Error('Invalid token payload'));
                }

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
                next();

            } catch (jwtError) {
                console.error('❌ JWT verification failed:', jwtError.message);
                return next(new Error('Invalid token'));
            }

        } catch (error) {
            console.error('❌ Socket auth error:', error.message);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        const user = socket.user;

        console.log(`✅ User connected: ${user.name || user.email} - Socket: ${socket.id}`);

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
                name: user.name,
                email: user.email
            },
            timestamp: new Date().toISOString()
        });

        // Broadcast online status
        socket.broadcast.emit('user:online', {
            userId: userId,
            name: user.name || user.email,
            timestamp: new Date().toISOString()
        });

        // ========== PING/PONG ==========
        socket.on('ping', () => {
            socket.emit('pong', {
                timestamp: new Date().toISOString(),
                message: 'pong'
            });
        });

        // ========== JOIN ROOM ==========
        socket.on('room:join', async (data) => {
            try {
                const { roomId } = data;
                console.log(`🚪 Join room: ${roomId} from ${user.name}`);

                let room = await ChatRoom.findOne({
                    roomId: roomId,
                    isActive: true
                });

                if (!room) {
                    room = new ChatRoom({
                        roomId: roomId,
                        type: 'direct',
                        name: `Room ${roomId}`,
                        participants: [{ user: userId, role: 'admin' }],
                        createdBy: userId,
                        isActive: true
                    });
                    await room.save();
                    console.log(`📝 Created new room: ${roomId}`);
                } else {
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

                socket.emit('room:joined', {
                    roomId: roomId,
                    message: 'Successfully joined room',
                    timestamp: new Date().toISOString()
                });

                socket.to(roomId).emit('room:user-joined', {
                    roomId: roomId,
                    user: {
                        id: userId,
                        name: user.name || user.email
                    },
                    timestamp: new Date().toISOString()
                });

                console.log(`✅ ${user.name} joined room: ${roomId}`);

                const messages = await Message.find({ room: roomId })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .populate('sender', 'name email')
                    .lean();

                socket.emit('room:messages', {
                    roomId: roomId,
                    messages: messages.reverse()
                });

            } catch (error) {
                console.error('Room join error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // ========== LEAVE ROOM ==========
        socket.on('room:leave', (data) => {
            const { roomId } = data;
            socket.leave(roomId);

            if (userRooms.has(userId)) {
                userRooms.get(userId).delete(roomId);
            }

            socket.to(roomId).emit('room:user-left', {
                roomId: roomId,
                user: { id: userId, name: user.name || user.email },
                timestamp: new Date().toISOString()
            });

            console.log(`👋 ${user.name} left room: ${roomId}`);
        });

        // ========== SEND MESSAGE ==========
        socket.on('message:send', async (data) => {
            try {
                const { roomId, content, type = 'text' } = data;
                console.log(`💬 Message from ${user.name} in ${roomId}: ${content?.substring(0, 30)}`);

                let room = await ChatRoom.findOne({ roomId: roomId, isActive: true });

                if (!room) {
                    room = new ChatRoom({
                        roomId: roomId,
                        type: 'direct',
                        participants: [{ user: userId, role: 'admin' }],
                        createdBy: userId,
                        isActive: true
                    });
                    await room.save();
                    socket.join(roomId);
                }

                const message = new Message({
                    sender: userId,
                    room: roomId,
                    content: content,
                    type: type
                });

                await message.save();
                await message.populate('sender', 'name email');

                await ChatRoom.updateOne(
                    { roomId: roomId },
                    { lastMessage: message._id }
                );

                io.to(roomId).emit('message:new', {
                    roomId: roomId,
                    message: {
                        id: message._id,
                        content: message.content,
                        sender: {
                            id: userId,
                            name: user.name || user.email
                        },
                        type: message.type,
                        createdAt: message.createdAt
                    }
                });

                console.log(`✅ Message sent in ${roomId}`);

            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // ========== DISCONNECT ==========
        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${user.name || user.email}`);
            activeUsers.delete(userId);
            userSockets.delete(socket.id);

            socket.broadcast.emit('user:offline', {
                userId: userId,
                name: user.name || user.email,
                timestamp: new Date().toISOString()
            });

            const rooms = userRooms.get(userId) || new Set();
            rooms.forEach(roomId => {
                socket.to(roomId).emit('room:user-left', {
                    roomId: roomId,
                    user: { id: userId, name: user.name || user.email },
                    timestamp: new Date().toISOString()
                });
            });

            userRooms.delete(userId);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    console.log('✅ Socket.io handlers initialized');
};

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