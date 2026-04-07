@"
const mongoose = require('mongoose');
const crypto = require('crypto');

const countrySchema = new mongoose.Schema({
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
    is_active: {
        type: Boolean,
        default: true
    },
    dial_code: {
        type: String
    },
    currency: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Country', countrySchema);
"@ | Out-File -FilePath models/Country.js -Encoding utf8