// controllers/providerController.js
const Provider = require('../models/Provider');
const User = require('../models/User');

// Get provider by user ID
exports.getProviderByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        // First try to find provider by user_id
        let provider = await Provider.findOne({ user_id: userId });

        // If not found, try to find by id
        if (!provider) {
            provider = await Provider.findOne({ id: userId });
        }

        // If still not found, return user data as fallback
        if (!provider) {
            const user = await User.findOne({ id: userId });
            if (user) {
                return res.json({
                    status: true,
                    data: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        type: 'User'
                    }
                });
            }
        }

        if (!provider) {
            return res.status(404).json({
                status: false,
                message: 'Provider not found'
            });
        }

        res.json({
            status: true,
            data: provider
        });

    } catch (error) {
        console.error('Get provider error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
};

// Get all providers
exports.getAllProviders = async (req, res) => {
    try {
        const providers = await Provider.find({ is_provider: true });

        res.json({
            status: true,
            data: providers
        });

    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
};

// Create provider
exports.createProvider = async (req, res) => {
    try {
        const provider = await Provider.create({
            ...req.body,
            tenant_id: req.tenantId || 'default-tenant-id'
        });

        res.status(201).json({
            status: true,
            data: provider
        });

    } catch (error) {
        console.error('Create provider error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
};