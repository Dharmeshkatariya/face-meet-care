
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
    display_id: {
        type: String,
        unique: true
    },
    type: {
        type: String,
        enum: ['EXT', 'INT'],
        default: 'EXT'
    },
    provider_type: {
        type: String,
        enum: ['RESIDENT', 'ATTENDING', 'CONSULTANT'],
        default: 'RESIDENT'
    },
    npi: String,
    qualification: [String],
    specialities: [String],
    description: String,
    education: [String],
    hospital_affiliation: [String],
    awards: [String],
    certifications: [String],
    health_centers: [String],
    locations: [{
        id: String,
        name: String,
        short_name: String,
        address: String,
        city: String,
        state: String,
        zipcode: String,
        latlng: String,
        work_phone: String,
        cell_phone: String,
        accepts_new_patient: Boolean,
        provides_telehealth: Boolean,
        health_center_id: String,
        health_center_name: String,
        languages_known: [String]
    }],
    primary_location: String,
    accepts_new_patient: {
        type: Boolean,
        default: false
    },
    provides_telehealth: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        default: 0
    },
    ratings_count: {
        type: Number,
        default: 0
    },
    is_pcp: {
        type: Boolean,
        default: false
    },
    cost: {
        type: Number,
        default: 0
    },
    recommended: {
        type: Boolean,
        default: false
    },
    user_id: {
        type: String,
        ref: 'User'
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    is_provider: {
        type: Boolean,
        default: true
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

// Auto-generate display_id
providerSchema.pre('save', async function(next) {
    if (!this.display_id) {
        const tenant = await mongoose.model('Tenant').findOne({ id: this.tenant_id });
        const prefix = tenant ? tenant.name.substring(0, 2).toUpperCase() : 'PR';
        const count = await mongoose.model('Provider').countDocuments({ tenant_id: this.tenant_id });
        this.display_id = `${prefix}PRO${String(count + 1).padStart(8, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Provider', providerSchema);