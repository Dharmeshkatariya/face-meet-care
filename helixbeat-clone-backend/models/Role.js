@"
const mongoose = require('mongoose');
const crypto = require('crypto');

const roleSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    is_active: {
        type: Boolean,
        default: true
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    permissions: [{
        type: String,
        ref: 'Permission'
    }],
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

module.exports = mongoose.model('Role', roleSchema);
"@ | Out-File -FilePath models/Role.js -Encoding utf8