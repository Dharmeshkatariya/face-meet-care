
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// API Routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, require('./routes/authRoutes'));
app.use(`/api/${process.env.API_VERSION || 'v1'}/tenant`, require('./routes/tenantRoutes'));
app.use(`/api/${process.env.API_VERSION || 'v1'}/feature-switches`, require('./routes/featureSwitchRoutes'));
app.use(`/api/${process.env.API_VERSION || 'v1'}/provider-details`, require('./routes/providerRoutes'));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        status: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📝 API URL: http://localhost:${PORT}/api/v1`);
    });
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});