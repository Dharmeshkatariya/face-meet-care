const FeatureSwitch = require('../models/FeatureSwitch');

// @desc    Get all feature switches
// @route   GET /api/v1/feature-switches
exports.getFeatureSwitches = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const per_page = parseInt(req.query.per_page) || 10;
        const skip = (page - 1) * per_page;

        // Get tenant from request (set by middleware)
        const tenantId = req.tenantId || 'default';

        const [switches, total] = await Promise.all([
            FeatureSwitch.find({ tenant_id: tenantId })
                .sort({ id: 1 })
                .skip(skip)
                .limit(per_page),
            FeatureSwitch.countDocuments({ tenant_id: tenantId })
        ]);

        const more = skip + per_page < total;

        // Format response like your example
        const values = switches.map(sw => ({
            id: sw.id,
            name: sw.name,
            active: sw.active,
            created: sw.created_at.toISOString(),
            modified: sw.modified_at.toISOString()
        }));

        res.json({
            status: true,
            data: {
                values,
                pagination: {
                    page,
                    per_page,
                    total,
                    more
                }
            }
        });

    } catch (error) {
        console.error('Get feature switches error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create feature switch
// @route   POST /api/v1/feature-switches
exports.createFeatureSwitch = async (req, res) => {
    try {
        const { name, active, description } = req.body;
        const tenantId = req.tenantId || 'default';

        // Get next ID
        const lastSwitch = await FeatureSwitch.findOne({ tenant_id: tenantId })
            .sort({ id: -1 });
        const nextId = lastSwitch ? lastSwitch.id + 1 : 1;

        const featureSwitch = await FeatureSwitch.create({
            id: nextId,
            name,
            active: active || false,
            description,
            tenant_id: tenantId
        });

        res.status(201).json({
            status: true,
            data: featureSwitch
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update feature switch
// @route   PUT /api/v1/feature-switches/:id
exports.updateFeatureSwitch = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const tenantId = req.tenantId || 'default';

        const featureSwitch = await FeatureSwitch.findOneAndUpdate(
            { id: parseInt(id), tenant_id: tenantId },
            { active, modified_at: new Date() },
            { new: true }
        );

        if (!featureSwitch) {
            return res.status(404).json({
                status: false,
                message: 'Feature switch not found'
            });
        }

        res.json({
            status: true,
            data: featureSwitch
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};