@"
const Subscription = require('../models/Subscription');

// Get tenant subscriptions
exports.getSubscriptions = async (req, res) => {
    try {
        const { active = true, page = 1, per_page = 10 } = req.query;
        const tenantId = req.tenantId;

        const filter = { tenant_id: tenantId };
        if (active === 'true') {
            filter.active = true;
        }

        const skip = (parseInt(page) - 1) * parseInt(per_page);

        const [subscriptions, total] = await Promise.all([
            Subscription.find(filter)
                .skip(skip)
                .limit(parseInt(per_page))
                .sort({ created_at: -1 })
                .lean(),
            Subscription.countDocuments(filter)
        ]);

        const more = skip + parseInt(per_page) < total;

        res.json({
            status: true,
            data: {
                values: subscriptions,
                pagination: {
                    page: parseInt(page),
                    per_page: parseInt(per_page),
                    total,
                    more
                }
            }
        });

    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create subscription
exports.createSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const subscription = await Subscription.create({
            ...req.body,
            tenant_id: tenantId
        });

        res.status(201).json({
            status: true,
            data: subscription
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};
"@ | Out-File -FilePath controllers/subscriptionController.js -Encoding utf8