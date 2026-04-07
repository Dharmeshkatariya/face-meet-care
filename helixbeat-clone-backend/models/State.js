@"
const mongoose = require('mongoose');
const crypto = require('crypto');

const stateSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    name: {
        type: String,
        required: true
    },
    state_code: {
        type: String,
        required: true
    },
    country: {
        id: String,
        name: String,
        code: String,
        is_active: Boolean
    },
    is_active: {
        type: Boolean,
        default: true
    },
    capital: {
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

stateSchema.index({ 'country.code': 1 });
stateSchema.index({ state_code: 1 });

module.exports = mongoose.model('State', stateSchema);
"@ | Out-File -FilePath models/State.js -Encoding utf8