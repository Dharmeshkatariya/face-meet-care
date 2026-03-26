const mongoose = require('mongoose');

const featureSwitchSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    active: {
        type: Boolean,
        default: false
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    description: String,
    created_at: {
        type: Date,
        default: Date.now
    },
    modified_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' }
});

module.exports = mongoose.model('FeatureSwitch', featureSwitchSchema);