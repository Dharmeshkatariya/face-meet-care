// server.js - Complete Updated with Public Pagination Endpoints

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// ✅ HARDCODE JWT SECRET TO ENSURE IT MATCHES
const JWT_SECRET = 'helixbeat_super_secret_key_2024_123456789';
const JWT_REFRESH_SECRET = 'helixbeat_refresh_secret_key_2024_987654321';

// Override environment variables
process.env.JWT_SECRET = JWT_SECRET;
process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;

console.log('═══════════════════════════════════════');
console.log('🔐 JWT Configuration:');
console.log('JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...');
console.log('JWT_SECRET length:', JWT_SECRET.length);
console.log('═══════════════════════════════════════');

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type']
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
});

app.set('io', io);

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/images', 'uploads/documents', 'uploads/thumbnails'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ========== CORS CONFIGURATION ==========
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.options('*', cors());

// ========== MIDDLEWARE ==========
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// ========== MOCK DATA GENERATORS ==========
const generatePaginatedUsers = (page, limit, search = '') => {
  const users = [];
  const totalUsers = 150;
  const startIndex = (page - 1) * limit;

  for (let i = 0; i < limit && startIndex + i < totalUsers; i++) {
    const id = startIndex + i + 1;
    const user = {
      id: id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      username: `user${id}`,
      phone: `+1-555-${String(id).padStart(4, '0')}`,
      website: id % 3 === 0 ? `https://user${id}.com` : null,
      role: id === 1 ? 'admin' : (id % 5 === 0 ? 'moderator' : 'user'),
      isActive: id % 4 !== 0,
      createdAt: new Date(Date.now() - (id * 86400000)).toISOString(),
      address: {
        street: `${id} Main St`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][id % 5],
        country: 'USA'
      }
    };

    if (search) {
      const searchLower = search.toLowerCase();
      if (!user.name.toLowerCase().includes(searchLower) &&
          !user.email.toLowerCase().includes(searchLower)) {
        continue;
      }
    }

    users.push(user);
  }

  return users;
};

// ========== 🔓 PUBLIC PAGINATION ENDPOINTS (NO AUTH REQUIRED) ==========
// ✅ THESE MUST BE BEFORE ANY AUTH MIDDLEWARE

// Page-based pagination
app.get('/api/v1/users', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'id';
    const order = req.query.order || 'asc';

    const users = generatePaginatedUsers(page, limit, search);
    const totalUsers = 150;
    const totalPages = Math.ceil(totalUsers / limit);

    res.set({
      'X-Total-Count': totalUsers.toString(),
      'X-Total-Pages': totalPages.toString(),
      'X-Current-Page': page.toString(),
      'X-Page-Size': limit.toString(),
      'X-Has-Next': (page < totalPages).toString(),
      'X-Has-Prev': (page > 1).toString()
    });

    res.json({
      status: true,
      data: users,
      pagination: { page, limit, total: totalUsers, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Cursor-based pagination
app.get('/api/v1/posts', (req, res) => {
  try {
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const limit = parseInt(req.query.limit) || 20;
    const startId = cursor || 1;
    const posts = [];
    const totalPosts = 500;

    for (let i = 0; i < limit && startId + i <= totalPosts; i++) {
      const id = startId + i;
      posts.push({
        id: id,
        userId: (id % 10) + 1,
        title: `Post ${id}`,
        body: `Content for post ${id}`,
        tags: ['tech', 'life', 'code'].slice(0, (id % 3) + 1),
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 50),
        createdAt: new Date(Date.now() - (id * 3600000)).toISOString()
      });
    }

    const nextCursor = startId + posts.length;
    const hasMore = nextCursor <= totalPosts;

    res.json({
      status: true,
      data: posts,
      pagination: { cursor, nextCursor: hasMore ? nextCursor : null, limit, hasMore }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Offset-based pagination
app.get('/api/v1/posts/feed', (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const posts = [];
    const totalPosts = 500;

    for (let i = 0; i < limit && offset + i < totalPosts; i++) {
      const id = offset + i + 1;
      posts.push({
        id: id,
        userId: (id % 10) + 1,
        title: `Feed Post ${id}`,
        body: `Feed content ${id}`,
        likes: Math.floor(Math.random() * 1000),
        createdAt: new Date(Date.now() - (id * 1800000)).toISOString()
      });
    }

    res.json({
      status: true,
      data: posts,
      pagination: { offset, limit, nextOffset: offset + posts.length, hasMore: offset + posts.length < totalPosts, total: totalPosts }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Link header pagination
app.get('/api/v1/notifications', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const notifications = [];
    const totalNotifications = 200;
    const startIndex = (page - 1) * limit;

    for (let i = 0; i < limit && startIndex + i < totalNotifications; i++) {
      const id = startIndex + i + 1;
      notifications.push({
        id: id,
        type: ['info', 'success', 'warning', 'error'][id % 4],
        title: `Notification ${id}`,
        message: `This is notification message ${id}`,
        read: id % 3 === 0,
        createdAt: new Date(Date.now() - (id * 3600000)).toISOString()
      });
    }

    const totalPages = Math.ceil(totalNotifications / limit);
    const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
    const links = [];
    if (page < totalPages) links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
    if (page > 1) links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
    links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
    links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);
    if (links.length > 0) res.set('Link', links.join(', '));

    res.json({ status: true, data: notifications, meta: { page, limit, totalPages, total: totalNotifications } });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Search with pagination
app.get('/api/v1/users/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const users = generatePaginatedUsers(page, limit, query);

    res.json({ status: true, data: users, query, pagination: { page, limit, hasMore: users.length === limit } });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Large dataset
app.get('/api/v1/logs', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const level = req.query.level || 'all';
    const logs = [];
    const totalLogs = 10000;
    const startIndex = (page - 1) * limit;
    const levels = ['info', 'debug', 'warn', 'error'];

    for (let i = 0; i < limit && startIndex + i < totalLogs; i++) {
      const id = startIndex + i + 1;
      const logLevel = levels[id % levels.length];
      if (level !== 'all' && logLevel !== level) continue;
      logs.push({
        id: id,
        level: logLevel,
        message: `Log entry ${id}: This is a ${logLevel} message`,
        timestamp: new Date(Date.now() - (id * 1000)).toISOString(),
        source: ['api', 'auth', 'database', 'cache'][id % 4]
      });
    }

    res.json({ status: true, data: logs, pagination: { page, limit, total: totalLogs, totalPages: Math.ceil(totalLogs / limit) } });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// ============================================
// 🎯 STREAMING ENDPOINTS FOR TESTING
// Add these to your server.js
// ============================================

// ========== SSE (Server-Sent Events) ENDPOINTS ==========

// Basic SSE stream
app.get('/api/v1/stream/sse', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
    });

    let counter = 0;
    const maxEvents = 100;

    const intervalId = setInterval(() => {
        counter++;

        const event = {
            id: counter.toString(),
            type: counter % 5 === 0 ? 'milestone' : 'update',
            data: {
                message: `Event #${counter}`,
                timestamp: new Date().toISOString(),
                value: Math.floor(Math.random() * 100),
                progress: ((counter / maxEvents) * 100).toFixed(1) + '%'
            }
        };

        // Send named event
        res.write(`id: ${counter}\n`);
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);

        if (counter >= maxEvents) {
            res.write(`id: ${counter + 1}\n`);
            res.write(`event: done\n`);
            res.write(`data: {"message": "Stream complete", "totalEvents": ${counter}}\n\n`);
            res.write(`data: [DONE]\n\n`);
            clearInterval(intervalId);
            res.end();
        }
    }, 500);

    // Send heartbeat every 15 seconds
    const heartbeatId = setInterval(() => {
        res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
    }, 15000);

    req.on('close', () => {
        clearInterval(intervalId);
        clearInterval(heartbeatId);
        console.log(`SSE client disconnected after ${counter} events`);
    });
});

// SSE with custom events
app.get('/api/v1/stream/sse/notifications', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    let notificationCount = 0;

    const types = ['info', 'success', 'warning', 'error'];
    const messages = [
        'New user registered',
        'Order confirmed',
        'Payment received',
        'Low battery warning',
        'Server load high',
        'Backup completed',
        'Update available'
    ];

    const intervalId = setInterval(() => {
        notificationCount++;

        const notification = {
            id: `notif_${Date.now()}`,
            type: types[notificationCount % types.length],
            title: `Notification ${notificationCount}`,
            message: messages[notificationCount % messages.length],
            read: false,
            createdAt: new Date().toISOString()
        };

        res.write(`id: ${notificationCount}\n`);
        res.write(`event: notification\n`);
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
    }, 3000);

    req.on('close', () => {
        clearInterval(intervalId);
    });
});

// SSE with large payload
app.get('/api/v1/stream/sse/users', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    let batchCount = 0;

    const intervalId = setInterval(() => {
        batchCount++;

        const users = [];
        for (let i = 0; i < 5; i++) {
            users.push({
                id: (batchCount - 1) * 5 + i + 1,
                name: `User ${(batchCount - 1) * 5 + i + 1}`,
                email: `user${(batchCount - 1) * 5 + i + 1}@example.com`,
                joinedAt: new Date().toISOString()
            });
        }

        res.write(`id: ${batchCount}\n`);
        res.write(`event: users_batch\n`);
        res.write(`data: ${JSON.stringify(users)}\n\n`);

        if (batchCount >= 20) {
            res.write(`data: [DONE]\n\n`);
            clearInterval(intervalId);
            res.end();
        }
    }, 1000);

    req.on('close', () => {
        clearInterval(intervalId);
    });
});

// ========== AI CHAT STREAMING (Simulated OpenAI) ==========

app.post('/api/v1/stream/ai/chat', (req, res) => {
    const { message } = req.body;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    const response = `You asked: "${message}". Here's a detailed response about this topic. This is a simulated AI streaming response that demonstrates how token-by-token streaming works. Each token is sent as a separate SSE event, allowing real-time display in the UI.`;
    const words = response.split(' ');
    let wordIndex = 0;

    const intervalId = setInterval(() => {
        if (wordIndex < words.length) {
            const token = words[wordIndex] + (wordIndex < words.length - 1 ? ' ' : '');

            // OpenAI format
            const chunk = {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'gpt-3.5-turbo',
                choices: [{
                    index: 0,
                    delta: {
                        content: token
                    },
                    finish_reason: wordIndex === words.length - 1 ? 'stop' : null
                }]
            };

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            wordIndex++;
        } else {
            res.write(`data: [DONE]\n\n`);
            clearInterval(intervalId);
            res.end();
        }
    }, 80);

    req.on('close', () => {
        clearInterval(intervalId);
    });
});

// ========== CHUNKED TRANSFER ENDPOINT ==========

app.get('/api/v1/stream/chunked/users', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*'
    });

    let sent = 0;
    const totalUsers = 500;
    const batchSize = 50;

    function sendBatch() {
        const users = [];
        for (let i = 0; i < batchSize && sent + i < totalUsers; i++) {
            users.push({
                id: sent + i + 1,
                name: `User ${sent + i + 1}`,
                email: `user${sent + i + 1}@example.com`,
                createdAt: new Date().toISOString()
            });
        }

        sent += users.length;
        res.write(JSON.stringify(users) + '\n');

        if (sent < totalUsers) {
            setTimeout(sendBatch, 100);
        } else {
            res.end();
        }
    }

    sendBatch();
});

// ========== WEBSOCKET ENDPOINTS ==========

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Echo messages
    socket.on('message', (data) => {
        socket.emit('message', {
            id: Date.now().toString(),
            text: data,
            timestamp: new Date().toISOString(),
            echo: true
        });
    });

    // Join room
    socket.on('join_room', (room) => {
        socket.join(room);
        socket.emit('room_joined', { room });
        io.to(room).emit('user_joined', { userId: socket.id, room });
    });

    // Leave room
    socket.on('leave_room', (room) => {
        socket.leave(room);
        socket.emit('room_left', { room });
    });

    // Room message
    socket.on('room_message', (data) => {
        io.to(data.room).emit('room_message', {
            userId: socket.id,
            text: data.text,
            timestamp: new Date().toISOString()
        });
    });

    // Typing indicator
    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing', {
            userId: socket.id,
            isTyping: data.isTyping
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

console.log('✅ Streaming endpoints registered:');
console.log('   📡 GET /api/v1/stream/sse - Basic SSE');
console.log('   📡 GET /api/v1/stream/sse/notifications - Notification SSE');
console.log('   📡 GET /api/v1/stream/sse/users - Batch SSE');
console.log('   🤖 POST /api/v1/stream/ai/chat - AI Chat Streaming');
console.log('   📦 GET /api/v1/stream/chunked/users - Chunked Transfer');
console.log('   🔌 WebSocket on /socket.io/');

console.log('✅ PUBLIC Pagination endpoints registered (NO AUTH REQUIRED):');
console.log('   📄 GET /api/v1/users - Page-based');
console.log('   📄 GET /api/v1/posts - Cursor-based');
console.log('   📄 GET /api/v1/posts/feed - Offset-based');
console.log('   📄 GET /api/v1/notifications - Link header');
console.log('   📄 GET /api/v1/users/search - Search');
console.log('   📄 GET /api/v1/logs - Large dataset');

// ========== DEBUG ENDPOINTS ==========
app.get('/api/v1/debug/secret', (req, res) => {
    res.json({
        secret_first_10: JWT_SECRET.substring(0, 10) + '...',
        secret_length: JWT_SECRET.length,
        secret_exists: true,
        env: process.env.NODE_ENV || 'development'
    });
});

// ========== IMPORT ROUTES ==========
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const providerRoutes = require('./routes/providerRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const stateRoutes = require('./routes/stateRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');

// Chat routes with fallback
let chatRoutes;
try {
    chatRoutes = require('./routes/chatRoutes');
} catch (e) {
    console.log('⚠️ chatRoutes not found, creating placeholder');
    const router = require('express').Router();
    router.get('/', (req, res) => res.json({ message: 'Chat API' }));
    chatRoutes = router;
}

// ========== 🔒 PROTECTED API ROUTES (AUTH REQUIRED) ==========
const apiVersion = process.env.API_VERSION || 'v1';

app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/tenant`, tenantRoutes);
app.use(`/api/${apiVersion}/providers`, providerRoutes);
app.use(`/api/${apiVersion}/lookups`, lookupRoutes);
app.use(`/api/${apiVersion}/states`, stateRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/chat`, chatRoutes);


// ============================================
// 🎯 BOOKING MODULE - ALL ROUTES
// ============================================
try {
    // Services catalog
    app.use('/api/v1/services', require('./routes/booking/serviceRoutes'));
    console.log('✅ Services routes registered');

    // Availability & Slots
    app.use('/api/v1/bookings/availability', require('./routes/booking/availabilityRoutes'));
    console.log('✅ Availability routes registered');

    // Booking CRUD
    app.use('/api/v1/bookings', require('./routes/booking/bookingRoutes'));
    console.log('✅ Booking routes registered');

    // Waitlist
    app.use('/api/v1/waitlist', require('./routes/booking/waitlistRoutes'));
    console.log('✅ Waitlist routes registered');

    // Coupons & Pricing
    app.use('/api/v1/coupons', require('./routes/booking/couponRoutes'));
    console.log('✅ Coupon routes registered');

    console.log('═══════════════════════════════════════');
    console.log('✅✅✅ FULL BOOKING MODULE ACTIVE ✅✅✅');
    console.log('═══════════════════════════════════════');
} catch (e) {
    console.error('❌ Booking module failed:', e.message);
    // Fallback for services
    app.get('/api/v1/services', (req, res) => {
        const services = [
            { id: 'cleaning_001', name: 'Home Cleaning', provider_id: 'provider_001', provider_name: 'Sarah Johnson', price: 499, base_price: 499, duration: '2 hrs', rating: 4.8, category: 'home' },
            { id: 'plumbing_001', name: 'Plumbing Repair', provider_id: 'provider_002', provider_name: 'Mike Peters', price: 349, base_price: 349, duration: '1 hr', rating: 4.5, category: 'home' },
            { id: 'beauty_001', name: 'Salon at Home', provider_id: 'provider_003', provider_name: 'Priya Sharma', price: 599, base_price: 599, duration: '1.5 hrs', rating: 4.9, category: 'beauty' },
            { id: 'painting_001', name: 'Wall Painting', provider_id: 'provider_004', provider_name: 'Raj Kumar', price: 1999, base_price: 1999, duration: '4 hrs', rating: 4.6, category: 'home' },
            { id: 'electrical_001', name: 'Electrician', provider_id: 'provider_005', provider_name: 'Amit Singh', price: 399, base_price: 399, duration: '1 hr', rating: 4.7, category: 'home' },
            { id: 'tutoring_001', name: 'Home Tutoring', provider_id: 'provider_006', provider_name: 'Dr. Mehta', price: 899, base_price: 899, duration: '2 hrs', rating: 4.9, category: 'education' }
        ];
        const search = req.query.q?.toLowerCase() || '';
        const filtered = search ? services.filter(s => s.name.toLowerCase().includes(search)) : services;
        res.json({ status: true, data: filtered, total: filtered.length });
    });
    // Fallback for bookings
    const bookingRouter = require('express').Router();
    bookingRouter.get('/', (req, res) => res.json({ status: true, message: 'Booking API (Fallback)', endpoints: ['GET /availability', 'POST /instant', 'GET /my'] }));
    app.use('/api/v1/bookings', bookingRouter);
}


// ========== SOCKET.IO HANDLERS ==========
const socketService = require('./services/socketService');
socketService.setupSocketHandlers(io);

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        websocket: io.engine ? 'active' : 'inactive',
        socketConnections: io.engine?.clientsCount || 0
    });
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
    res.json({
        name: 'HelixBeat API',
        version: apiVersion,
        status: 'running',
        public_endpoints: {
            users: '/api/v1/users',
            posts: '/api/v1/posts',
          services: '/api/v1/services',
                     bookings: '/api/v1/bookings',
                     availability: '/api/v1/bookings/availability',
                     waitlist: '/api/v1/waitlist',
                     coupons: '/api/v1/coupons',
            posts_feed: '/api/v1/posts/feed',
            notifications: '/api/v1/notifications',
            search: '/api/v1/users/search',
            logs: '/api/v1/logs'

        }
    });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
    console.error('Error:', { message: err.message, url: req.url, method: req.method });
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({ status: false, message, timestamp: new Date().toISOString() });
});

// ============================================
// 🎯 SERVICES ENDPOINT (For Booking Dashboard)
// ============================================

app.get('/api/v1/services', (req, res) => {
  try {
    const services = [
      {
        id: 'cleaning_001',
        service_id: 'cleaning_001',
        name: 'Home Cleaning',
        service_name: 'Home Cleaning',
        provider_id: 'provider_001',
        provider_name: 'Sarah Johnson',
        price: 499,
        base_price: 499,
        duration: '2 hrs',
        rating: 4.8,
        category: 'home',
        image_url: null
      },
      {
        id: 'plumbing_001',
        service_id: 'plumbing_001',
        name: 'Plumbing Repair',
        service_name: 'Plumbing Repair',
        provider_id: 'provider_002',
        provider_name: 'Mike Peters',
        price: 349,
        base_price: 349,
        duration: '1 hr',
        rating: 4.5,
        category: 'home',
        image_url: null
      },
      {
        id: 'beauty_001',
        service_id: 'beauty_001',
        name: 'Salon at Home',
        service_name: 'Salon at Home',
        provider_id: 'provider_003',
        provider_name: 'Priya Sharma',
        price: 599,
        base_price: 599,
        duration: '1.5 hrs',
        rating: 4.9,
        category: 'beauty',
        image_url: null
      },
      {
        id: 'painting_001',
        service_id: 'painting_001',
        name: 'Wall Painting',
        service_name: 'Wall Painting',
        provider_id: 'provider_004',
        provider_name: 'Raj Kumar',
        price: 1999,
        base_price: 1999,
        duration: '4 hrs',
        rating: 4.6,
        category: 'home',
        image_url: null
      },
      {
        id: 'electrical_001',
        service_id: 'electrical_001',
        name: 'Electrician',
        service_name: 'Electrician',
        provider_id: 'provider_005',
        provider_name: 'Amit Singh',
        price: 399,
        base_price: 399,
        duration: '1 hr',
        rating: 4.7,
        category: 'home',
        image_url: null
      },
      {
        id: 'tutoring_001',
        service_id: 'tutoring_001',
        name: 'Home Tutoring',
        service_name: 'Home Tutoring',
        provider_id: 'provider_006',
        provider_name: 'Dr. Mehta',
        price: 899,
        base_price: 899,
        duration: '2 hrs',
        rating: 4.9,
        category: 'education',
        image_url: null
      },
      {
        id: 'pest_control_001',
        service_id: 'pest_control_001',
        name: 'Pest Control',
        service_name: 'Pest Control',
        provider_id: 'provider_007',
        provider_name: 'PestFree Solutions',
        price: 799,
        base_price: 799,
        duration: '1.5 hrs',
        rating: 4.4,
        category: 'home',
        image_url: null
      },
      {
        id: 'ac_repair_001',
        service_id: 'ac_repair_001',
        name: 'AC Repair',
        service_name: 'AC Repair',
        provider_id: 'provider_008',
        provider_name: 'CoolTech Services',
        price: 649,
        base_price: 649,
        duration: '1 hr',
        rating: 4.3,
        category: 'appliance',
        image_url: null
      }
    ];

    // Support search
    const search = req.query.q?.toLowerCase() || '';
    const filtered = search
      ? services.filter(s => s.name.toLowerCase().includes(search))
      : services;

    res.json({
      status: true,
      data: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

console.log('✅ Services endpoint: GET /api/v1/services');
// ========== DATABASE CONNECTION ==========
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
            ssl: true,
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ MongoDB Connected successfully');

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 API: http://localhost:${PORT}/api/${apiVersion}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                process.exit(1);
            } else {
                console.error('❌ Server error:', error);
            }
        });

    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// ========== PROCESS HANDLERS ==========
process.on('unhandledRejection', (err) => console.error('❌ Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('❌ Uncaught Exception:', err));
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, closing server...');
    io.close(() => console.log('Socket.io closed'));
    server.close(() => {
        mongoose.connection.close(() => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Start the server
connectDB();

module.exports = { app, server, io };