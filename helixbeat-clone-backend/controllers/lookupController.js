@"
const Lookup = require('../models/Lookup');

// Get lookups with filters
exports.getLookups = async (req, res) => {
    try {
        const { name__in, region, active = true, code } = req.query;
        const tenantId = req.tenantId;

        let filter = { tenant_id: tenantId, active: active === 'true' };

        // Handle name__in filter (comma-separated values)
        if (name__in) {
            const names = name__in.split(',');
            filter.name = { \$in: names };
        }

        // Handle region filter
        if (region) {
            filter.region = region;
        }

        // Handle code filter
        if (code) {
            filter.code = code;
        }

        const lookups = await Lookup.find(filter)
            .sort({ name: 1, sort_order: 1 })
            .lean();

        res.json({
            status: true,
            data: lookups
        });

    } catch (error) {
        console.error('Get lookups error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create lookup
exports.createLookup = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const lookup = await Lookup.create({
            ...req.body,
            tenant_id: tenantId
        });

        res.status(201).json({
            status: true,
            data: lookup
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update lookup
exports.updateLookup = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const lookup = await Lookup.findOneAndUpdate(
            { id, tenant_id: tenantId },
            { ...req.body, updated_at: new Date() },
            { new: true }
        );

        if (!lookup) {
            return res.status(404).json({
                status: false,
                message: 'Lookup not found'
            });
        }

        res.json({
            status: true,
            data: lookup
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};
"@ | Out-File -FilePath controllers/lookupController.js -Encoding utf8