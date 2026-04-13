// server.js - Complete Updated with Hardcoded JWT_SECRET
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

// ========== DEBUG ENDPOINTS ==========
app.get('/api/v1/debug/secret', (req, res) => {
    res.json({
        secret_first_10: JWT_SECRET.substring(0, 10) + '...',
        secret_length: JWT_SECRET.length,
        secret_exists: true,
        env: process.env.NODE_ENV || 'development'
    });
});

app.post('/api/v1/debug/verify-token', (req, res) => {
    try {
        const { token } = req.body;
        const cleanToken = token.replace('Bearer ', '').trim();

        const jwt = require('jsonwebtoken');

        // Decode without verification
        const decodedNoVerify = jwt.decode(cleanToken);

        // Verify with secret
        const decoded = jwt.verify(cleanToken, JWT_SECRET);

        res.json({
            status: true,
            decoded: decoded,
            secret_used: JWT_SECRET.substring(0, 10) + '...'
        });
    } catch (error) {
        res.status(401).json({
            status: false,
            message: error.message,
            secret_used: JWT_SECRET.substring(0, 10) + '...'
        });
    }
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

// ========== API ROUTES ==========
const apiVersion = process.env.API_VERSION || 'v1';

app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/tenant`, tenantRoutes);
app.use(`/api/${apiVersion}/providers`, providerRoutes);
app.use(`/api/${apiVersion}/lookups`, lookupRoutes);
app.use(`/api/${apiVersion}/states`, stateRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/chat`, chatRoutes);

// ========== SOCKET.IO HANDLERS ==========
// Pass the hardcoded secret to socket service
// ========== PAGINATION TEST ENDPOINTS ==========
// Add these after your existing routes (around line 150-160)

// Mock data generators
const generatePaginatedUsers = (page, limit, search = '') => {
  const users = [];
  const totalUsers = 150; // Total users in database
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

    // Apply search filter
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

const generatePaginatedPosts = (page, limit, userId = null) => {
  const posts = [];
  const totalPosts = 500;
  const startIndex = (page - 1) * limit;

  for (let i = 0; i < limit && startIndex + i < totalPosts; i++) {
    const id = startIndex + i + 1;
    const postUserId = userId || (id % 10) + 1;

    posts.push({
      id: id,
      userId: postUserId,
      title: `Post Title ${id}: ${['Amazing', 'Interesting', 'Cool', 'Great', 'Awesome'][id % 5]} Stuff`,
      body: `This is the body of post ${id}. It contains some meaningful content about various topics.`,
      tags: ['tech', 'life', 'code', 'design', 'mobile'].slice(0, (id % 3) + 2),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - (id * 3600000)).toISOString(),
      updatedAt: id % 3 === 0 ? new Date(Date.now() - (id * 1800000)).toISOString() : null
    });
  }

  return posts;
};

// ========== PAGE-BASED PAGINATION ==========
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

    // Add pagination metadata in headers
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
      pagination: {
        page: page,
        limit: limit,
        total: totalUsers,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// ========== CURSOR-BASED PAGINATION ==========
app.get('/api/v1/posts', (req, res) => {
  try {
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    const startId = cursor || 1;
    const posts = [];
    const totalPosts = 500;

    for (let i = 0; i < limit && startId + i <= totalPosts; i++) {
      const id = startId + i;
      const postUserId = userId || (id % 10) + 1;

      posts.push({
        id: id,
        userId: postUserId,
        title: `Post ${id}`,
        body: `Content for post ${id}`,
        createdAt: new Date(Date.now() - (id * 3600000)).toISOString()
      });
    }

    const nextCursor = startId + posts.length;
    const hasMore = nextCursor <= totalPosts;

    res.json({
      status: true,
      data: posts,
      pagination: {
        cursor: cursor,
        nextCursor: hasMore ? nextCursor : null,
        limit: limit,
        hasMore: hasMore
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// ========== OFFSET-BASED PAGINATION ==========
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
        createdAt: new Date(Date.now() - (id * 1800000)).toISOString()
      });
    }

    res.json({
      status: true,
      data: posts,
      pagination: {
        offset: offset,
        limit: limit,
        nextOffset: offset + posts.length,
        hasMore: offset + posts.length < totalPosts,
        total: totalPosts
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// ========== LINK HEADER PAGINATION (RFC 5988) ==========
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

    // Build Link header (RFC 5988)
    const links = [];
    if (page < totalPages) {
      links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
    }
    if (page > 1) {
      links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
    }
    links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
    links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);

    if (links.length > 0) {
      res.set('Link', links.join(', '));
    }

    res.json({
      status: true,
      data: notifications,
      meta: {
        page: page,
        limit: limit,
        totalPages: totalPages,
        total: totalNotifications
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// ========== SEARCH WITH PAGINATION ==========
app.get('/api/v1/users/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const users = generatePaginatedUsers(page, limit, query);

    res.json({
      status: true,
      data: users,
      query: query,
      pagination: {
        page: page,
        limit: limit,
        hasMore: users.length === limit
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// ========== LARGE DATASET (For stress testing) ==========
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

    res.json({
      status: true,
      data: logs,
      pagination: {
        page: page,
        limit: limit,
        total: totalLogs,
        totalPages: Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

console.log('✅ Pagination endpoints registered:');
console.log('   📄 GET /api/v1/users - Page-based pagination');
console.log('   📄 GET /api/v1/posts - Cursor-based pagination');
console.log('   📄 GET /api/v1/posts/feed - Offset-based pagination');
console.log('   📄 GET /api/v1/notifications - Link header pagination');
console.log('   📄 GET /api/v1/users/search - Search with pagination');
console.log('   📄 GET /api/v1/logs - Large dataset (10,000 items)');


// To this:
const socketService = require('./services/socketService');
socketService.setupSocketHandlers(io); // ✅ No
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
        endpoints: {
            health: '/health',
            login: `/api/${apiVersion}/auth/login`,
            register: `/api/${apiVersion}/auth/register`,
            upload: `/api/${apiVersion}/upload`,
            websocket: 'wss://face-meet-care.onrender.com/socket.io/'
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
    console.error('Error:', {
        message: err.message,
        url: req.url,
        method: req.method
    });

    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({
        status: false,
        message: message,
        timestamp: new Date().toISOString()
    });
});

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
            console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io/`);
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
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

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