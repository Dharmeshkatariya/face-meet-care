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