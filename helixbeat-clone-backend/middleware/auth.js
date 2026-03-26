const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Not authorized to access this route'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user
        const user = await User.findOne({
            $or: [
                { id: decoded.sub },
                { auth_user_id: decoded.sub }
            ]
        });

        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'User not found'
            });
        }

        req.user = user;
        req.tenantId = user.tenant_id;
        next();

    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({
            status: false,
            message: 'Not authorized',
            error: error.message
        });
    }
};

// Optional: Tenant middleware
exports.setTenant = async (req, res, next) => {
    try {
        // Get tenant from host or header
        const tenantUrl = req.headers.host || req.query.tenant;

        if (tenantUrl) {
            const Tenant = require('../models/Tenant');
            const tenant = await Tenant.findOne({ url: tenantUrl });
            if (tenant) {
                req.tenantId = tenant.id;
            }
        }

        next();
    } catch (error) {
        next();
    }
};