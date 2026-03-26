
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Provider = require('../models/Provider');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate tokens
const generateTokens = (user, tenant) => {
    const payload = {
        sub: user.auth_user_id || user.id,
        email: user.email,
        name: user.name,
        tenant_id: tenant.id,
        tenant_name: tenant.name
    };

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
        { sub: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );

    return { accessToken, refreshToken };
};

// @desc    Login user
// @route   POST /api/v1/login
exports.login = async (req, res) => {
    try {
        const { email, password, device_detail, location_detail } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is locked
        if (user.locked && user.locked_at > new Date(Date.now() - 30 * 60 * 1000)) {
            return res.status(401).json({
                status: false,
                message: 'Account locked. Please try again later.'
            });
        }

        // Verify password
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            user.login_attempts += 1;
            if (user.login_attempts >= 5) {
                user.locked = true;
                user.locked_at = new Date();
            }
            await user.save();

            return res.status(401).json({
                status: false,
                message: 'Invalid credentials'
            });
        }

        // Get tenant
        const tenant = await Tenant.findOne({ id: user.tenant_id });
        if (!tenant) {
            return res.status(404).json({
                status: false,
                message: 'Tenant not found'
            });
        }

        // Generate auth_user_id if not exists
        if (!user.auth_user_id) {
            user.auth_user_id = crypto.randomUUID();
        }

        // Update last login with device details
        await user.updateLastLogin(device_detail);

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user, tenant);

        // Save refresh token
        user.refresh_token = refreshToken;
        await user.save();

        // Get provider details if exists
        let providerDetails = null;
        if (user.id) {
            const provider = await Provider.findOne({ user_id: user.id, tenant_id: user.tenant_id });
            if (provider) {
                providerDetails = provider;
            }
        }

        // Calculate expires time
        const expiresIn = new Date();
        expiresIn.setDate(expiresIn.getDate() + 7);

        res.json({
            status: true,
            data: {
                user_id: user.id,
                token: accessToken,
                refresh: refreshToken,
                expires_in: expiresIn.toISOString(),
                refresh_expires_in: 36000,
                id: user.auth_user_id,
                type: providerDetails ? 'HelixStaff' : 'User',
                provider_details: providerDetails
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Register user
// @route   POST /api/v1/register
exports.register = async (req, res) => {
    try {
        const { email, password, username, first_name, last_name, tenant_url } = req.body;

        // Find tenant by URL
        const tenant = await Tenant.findOne({ url: tenant_url });
        if (!tenant) {
            return res.status(404).json({
                status: false,
                message: 'Tenant not found'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                status: false,
                message: 'User already exists with this email or username'
            });
        }

        // Create user
        const user = await User.create({
            email,
            username,
            password,
            first_name,
            last_name,
            name: `${first_name} ${last_name}`,
            tenant_id: tenant.id,
            auth_user_id: crypto.randomUUID()
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user, tenant);
        user.refresh_token = refreshToken;
        await user.save();

        res.status(201).json({
            status: true,
            data: {
                user_id: user.id,
                token: accessToken,
                refresh: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name
                }
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Refresh token
// @route   POST /api/v1/refresh-token
exports.refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(401).json({
                status: false,
                message: 'Refresh token required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.sub);

        if (!user || user.refresh_token !== refresh_token) {
            return res.status(401).json({
                status: false,
                message: 'Invalid refresh token'
            });
        }

        const tenant = await Tenant.findOne({ id: user.tenant_id });
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, tenant);

        user.refresh_token = newRefreshToken;
        await user.save();

        res.json({
            status: true,
            data: {
                token: accessToken,
                refresh: newRefreshToken
            }
        });

    } catch (error) {
        res.status(401).json({
            status: false,
            message: 'Invalid refresh token'
        });
    }
};

// @desc    Logout
// @route   POST /api/v1/logout
exports.logout = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            user.refresh_token = null;
            await user.save();
        }

        res.json({
            status: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
};