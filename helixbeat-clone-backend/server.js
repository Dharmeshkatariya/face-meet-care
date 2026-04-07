// server.js - Updated with proper CORS configuration
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ========== CORS CONFIGURATION - MUST BE FIRST ==========
// Option 1: Allow all origins (for development)
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin',
                    'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// OR Option 2: Allow specific origins (more secure)
// const allowedOrigins = [
//     'http://localhost:3000',
//     'http://localhost:58857',
//     'http://127.0.0.1:58857',
//     'https://your-flutter-app.onrender.com'
// ];
//
// app.use(cors({
//     origin: function(origin, callback) {
//         if (!origin) return callback(null, true);
//         if (allowedOrigins.indexOf(origin) === -1) {
//             const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
//             return callback(new Error(msg), false);
//         }
//         return callback(null, true);
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
//     credentials: true,
//     optionsSuccessStatus: 200
// }));

// ========== Other Middleware ==========
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin
}));
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ========== Import Routes ==========
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const featureSwitchRoutes = require('./routes/featureSwitchRoutes');
const providerRoutes = require('./routes/providerRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const roleRoutes = require('./routes/roleRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const stateRoutes = require('./routes/stateRoutes');

// ========== API Routes ==========
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/tenant`, tenantRoutes);
app.use(`/api/${apiVersion}/feature-switches`, featureSwitchRoutes);
app.use(`/api/${apiVersion}/provider-details`, providerRoutes);
app.use(`/api/${apiVersion}/lookups`, lookupRoutes);
app.use(`/api/${apiVersion}/users`, roleRoutes);
app.use(`/api/${apiVersion}`, subscriptionRoutes);
app.use(`/api/${apiVersion}`, stateRoutes);

// ========== Health Check ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ========== Root Endpoint ==========
app.get('/', (req, res) => {
    res.json({
        name: process.env.APP_NAME || 'Resido API',
        version: apiVersion,
        status: 'running',
        cors: 'enabled'
    });
});

// ========== 404 Handler ==========
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// ========== Global Error Handler ==========
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    res.status(err.status || 500).json({
        status: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString()
    });
});

// ========== Database Connection ==========
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB Atlas');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 API URL: http://localhost:${PORT}/api/${apiVersion}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔧 CORS: Enabled for all origins`);
        });
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    if (process.env.NODE_ENV === 'production') {
        console.error('Continuing despite unhandled rejection');
    } else {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    if (process.env.NODE_ENV === 'production') {
        console.error('Continuing despite uncaught exception');
    } else {
        process.exit(1);
    }
});

connectDB();