@"
const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriptionSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    plan: {
        id: String,
        code: String,
        name: String,
        description: String,
        module_composition: [{
            id: String,
            code: String,
            name: String,
            is_active: Boolean,
            subscribed: Boolean
        }]
    },
    start_date: {
        type: Date
    },
    end_date: {
        type: Date
    },
    expires_on: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true
    },
    tier: {
        type: String
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

subscriptionSchema.index({ tenant_id: 1, active: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
"@ | Out-File -FilePath models/Subscription.js -Encoding utf8