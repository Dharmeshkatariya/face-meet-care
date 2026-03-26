const Provider = require('../models/Provider');
const User = require('../models/User');

// @desc    Get provider details by ID
// @route   GET /api/v1/provider_details/:id
exports.getProviderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // Find provider by id or user_id
        let provider = await Provider.findOne({
            $or: [
                { id: id },
                { user_id: id }
            ],
            tenant_id: tenantId
        });

        if (!provider) {
            // If provider not found, try to get user and create provider
            const user = await User.findOne({ id: id, tenant_id: tenantId });
            if (user) {
                provider = await createProviderFromUser(user);
            }
        }

        if (!provider) {
            return res.status(404).json({
                status: false,
                message: 'Provider not found'
            });
        }

        // Get user details
        const user = await User.findOne({ id: provider.user_id });

        // Format response like your example
        const response = {
            id: provider.id,
            name: provider.name,
            display_id: provider.display_id,
            type: provider.type,
            provider_type: provider.provider_type,
            npi: provider.npi,
            qualification: provider.qualification,
            specialities: provider.specialities,
            description: provider.description,
            education: provider.education,
            hospital_affiliation: provider.hospital_affiliation,
            awards: provider.awards,
            certifications: provider.certifications,
            health_centers: provider.health_centers,
            locations: provider.locations,
            primary_location: provider.primary_location,
            accepts_new_patient: provider.accepts_new_patient,
            provides_telehealth: provider.provides_telehealth,
            rating: provider.rating,
            ratings_count: provider.ratings_count,
            is_pcp: provider.is_pcp,
            cost: provider.cost,
            recommended: provider.recommended,
            is_provider: provider.is_provider,
            user: user ? {
                id: user.id,
                email: user.email,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                name: user.name,
                gender: user.gender,
                phone: user.phone,
                is_active: user.is_active,
                last_login: user.last_login
            } : null,
            created_on: provider.created_at
        };

        res.json(response);

    } catch (error) {
        console.error('Get provider error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Helper function to create provider from user
async function createProviderFromUser(user) {
    const provider = await Provider.create({
        name: user.name,
        user_id: user.id,
        tenant_id: user.tenant_id,
        type: 'EXT',
        provider_type: 'RESIDENT',
        locations: [],
        health_centers: []
    });

    return provider;
}

// @desc    Get all providers
// @route   GET /api/v1/providers
exports.getAllProviders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const tenantId = req.tenantId;

        const [providers, total] = await Promise.all([
            Provider.find({ tenant_id: tenantId })
                .skip(skip)
                .limit(limit)
                .sort({ created_at: -1 }),
            Provider.countDocuments({ tenant_id: tenantId })
        ]);

        res.json({
            status: true,
            data: {
                providers,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};