@"
const mongoose = require('mongoose');
const crypto = require('crypto');

const lookupSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    display_name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    active: {
        type: Boolean,
        default: true
    },
    countries: [{
        type: String,
        ref: 'Country'
    }],
    region: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: null
    },
    favorite: {
        type: Boolean,
        default: false
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    sort_order: {
        type: Number,
        default: 0
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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

// Compound index for efficient lookups
lookupSchema.index({ name: 1, code: 1, tenant_id: 1 }, { unique: true });
lookupSchema.index({ name: 1, active: 1 });
lookupSchema.index({ region: 1 });

module.exports = mongoose.model('Lookup', lookupSchema);
"@ | Out-File -FilePath models/Lookup.js -Encoding utf8