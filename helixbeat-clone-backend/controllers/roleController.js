@"
const Permission = require('../models/Permission');
const Role = require('../models/Role');

// Get roles and permissions for current user
exports.getRolesPermissions = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userRole = req.user.role || 'default';

        // Get permissions for user's role
        const permissions = await Permission.find({
            tenant_id: tenantId,
            is_active: true
        }).lean();

        // Format response like your example
        const formattedPermissions = permissions.map(perm => ({
            module_name: perm.module_name,
            module_code: perm.module_code,
            display_id_v2: null,
            is_deleted: false,
            externally_sourced: false,
            master_customer_id: null,
            source_of_data: null,
            can_create: perm.can_create,
            can_view: perm.can_view,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
            is_active: perm.is_active,
            module: perm.module_id
        }));

        res.json({
            status: true,
            data: formattedPermissions
        });

    } catch (error) {
        console.error('Get roles permissions error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create role
exports.createRole = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const role = await Role.create({
            ...req.body,
            tenant_id: tenantId
        });

        res.status(201).json({
            status: true,
            data: role
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: error.message
        });
    }
};
"@ | Out-File -FilePath controllers/roleController.js -Encoding utf8