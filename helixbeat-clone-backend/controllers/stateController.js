@"
const State = require('../models/State');
const Country = require('../models/Country');

// Get states by country code
exports.getStates = async (req, res) => {
    try {
        const { country__code, country_id, active = true, page, per_page } = req.query;

        let filter = { is_active: active === 'true' };

        // Filter by country code
        if (country__code) {
            filter['country.code'] = country__code.toUpperCase();
        }

        // Filter by country ID
        if (country_id) {
            filter['country.id'] = country_id;
        }

        const states = await State.find(filter)
            .sort({ name: 1 })
            .lean();

        // Format response like your example
        const formattedStates = states.map(state => ({
            id: state.id,
            name: state.name,
            country: state.country,
            state_code: state.state_code,
            is_active: state.is_active
        }));

        res.json({
            status: true,
            data: {
                values: formattedStates,
                pagination: {
                    page: parseInt(page) || 0,
                    per_page: per_page ? parseInt(per_page) : null,
                    total: states.length,
                    more: null
                }
            }
        });

    } catch (error) {
        console.error('Get states error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create state
exports.createState = async (req, res) => {
    try {
        const state = await State.create(req.body);

        res.status(201).json({
            status: true,
            data: state
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};
"@ | Out-File -FilePath controllers/stateController.js -Encoding utf8