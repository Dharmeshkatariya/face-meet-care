// models/Provider.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const providerSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    name: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        ref: 'User'
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    specialty: {
        type: String
    },
    qualification: [String],
    is_provider: {
        type: Boolean,
        default: true
    },
    tenant_id: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Provider', providerSchema);