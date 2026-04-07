@"
const mongoose = require('mongoose');
const crypto = require('crypto');

const permissionSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    module_name: {
        type: String,
        required: true
    },
    module_code: {
        type: String,
        required: true,
        index: true
    },
    can_create: {
        type: Boolean,
        default: false
    },
    can_view: {
        type: Boolean,
        default: true
    },
    can_update: {
        type: Boolean,
        default: false
    },
    can_delete: {
        type: Boolean,
        default: false
    },
    is_active: {
        type: Boolean,
        default: true
    },
    module_id: {
        type: String
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    role_id: {
        type: String,
        ref: 'Role'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for role-based permissions
permissionSchema.index({ role_id: 1, module_code: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
"@ | Out-File -FilePath models/Permission.js -Encoding utf8