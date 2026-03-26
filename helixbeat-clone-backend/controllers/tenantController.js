const Tenant = require('../models/Tenant');

// @desc    Get current tenant
// @route   GET /api/v1/current-tenant
exports.getCurrentTenant = async (req, res) => {
    try {
        // Get tenant from host header or query param
        const tenantUrl = req.headers.host || req.query.tenant || 'test-pulsedev.helixbeat.com';

        let tenant = await Tenant.findOne({ url: tenantUrl });

        // If not found, get default tenant
        if (!tenant) {
            tenant = await Tenant.findOne({ is_active: true });
        }

        if (!tenant) {
            return res.status(404).json({
                status: false,
                message: 'Tenant not found'
            });
        }

        // Prepare response like your example
        const response = {
            status: true,
            data: {
                id: tenant.id,
                url: tenant.url,
                name: tenant.name,
                website: tenant.website,
                country: tenant.country,
                brand_color: tenant.brand_color,
                slogan: tenant.slogan,
                description: tenant.description,
                login_method: tenant.login_method,
                language: tenant.language,
                service_name: tenant.service_name,
                dmf_completed: tenant.dmf_completed,
                plan_name: tenant.plan_name,
                plan_code: tenant.plan_code,
                tier_name: tenant.tier_name,
                tier_code: tenant.tier_code,
                plan_settings: tenant.plan_settings || [],
                timezone: tenant.timezone,
                service_mode: tenant.service_mode,
                max_age_of_minor: tenant.max_age_of_minor,
                enc_public_key: tenant.enc_public_key,
                logo: tenant.logo,
                logo_details: tenant.logo_details,
                favicon: tenant.favicon,
                favicon_details: tenant.favicon_details,
                terms_and_conditions: tenant.terms_and_conditions,
                privacy_policy: tenant.privacy_policy,
                config: tenant.config
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Get tenant error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create tenant (for admin)
// @route   POST /api/v1/tenants
exports.createTenant = async (req, res) => {
    try {
        const tenant = await Tenant.create(req.body);

        res.status(201).json({
            status: true,
            data: tenant
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};