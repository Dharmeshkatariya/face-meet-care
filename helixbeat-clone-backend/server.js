// server.js - Updated with WebSocket support
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

const app = express();
const server = http.createServer(app);

// ✅ FIXED: Socket.io with proper CORS and path
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type']
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/',  // ✅ FIXED: Add trailing slash
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
});

// Make io accessible to routes
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

// ========== IMPORT ROUTES ==========
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const providerRoutes = require('./routes/providerRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const stateRoutes = require('./routes/stateRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');

// ✅ Check if chatRoutes exists, if not create it
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
// ✅ Check if socketService exists
try {
    const { setupSocketHandlers } = require('./services/socketService');
    setupSocketHandlers(io);
    console.log('✅ Socket.io handlers loaded');
} catch (e) {
    console.error('❌ Socket service error:', e.message);
    // Fallback socket handler
    io.on('connection', (socket) => {
        console.log('🔌 Socket connected (fallback):', socket.id);
        socket.on('disconnect', () => console.log('🔌 Socket disconnected:', socket.id));
    });
}

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
            users: `/api/${apiVersion}/users`,
            providers: `/api/${apiVersion}/providers`,
            lookups: `/api/${apiVersion}/lookups`,
            states: `/api/${apiVersion}/states`,
            chat: `/api/${apiVersion}/chat`,
            websocket: `${process.env.NODE_ENV === 'production' ? 'wss' : 'ws'}://${process.env.RENDER_EXTERNAL_URL || 'localhost:3000'}/socket.io/`
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
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({
        status: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString()
    });
});

// ========== DATABASE CONNECTION ==========
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected successfully');

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, '0.0.0.0', () => {  // ✅ FIXED: Bind to 0.0.0.0 for Render
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Local: http://localhost:${PORT}`);
            console.log(`📍 API: http://localhost:${PORT}/api/${apiVersion}`);
            console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io/`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
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
    if (process.env.NODE_ENV === 'production') {
        console.error('Continuing despite unhandled rejection');
    } else {
        process.exit(1);
    }
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    if (process.env.NODE_ENV === 'production') {
        console.error('Continuing despite uncaught exception');
    } else {
        process.exit(1);
    }
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