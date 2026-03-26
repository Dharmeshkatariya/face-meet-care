const mongoose = require('mongoose');
const crypto = require('crypto');

const tenantSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    website: String,
    country: {
        type: String,
        default: 'IN'
    },
    brand_color: {
        type: String,
        default: '#008BCC'
    },
    slogan: String,
    description: String,
    login_method: {
        type: String,
        enum: ['password', 'otp', 'magic_link'],
        default: 'password'
    },
    language: {
        type: String,
        default: 'en'
    },
    service_name: {
        type: String,
        default: 'tenant'
    },
    dmf_completed: {
        type: Boolean,
        default: false
    },
    plan_name: String,
    plan_code: String,
    tier_name: String,
    tier_code: String,
    plan_settings: [{
        name: String,
        value: String
    }],
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    service_mode: {
        type: String,
        default: 'COLLABORATIVE'
    },
    max_age_of_minor: {
        type: Number,
        default: 12
    },
    enc_public_key: {
        type: String,
        default: () => generatePublicKey()
    },
    logo: String,
    logo_details: {
        id: String,
        type: String,
        file: String,
        filename: String,
        created_on: Date
    },
    favicon: String,
    favicon_details: Object,
    terms_and_conditions: String,
    privacy_policy: String,
    config: mongoose.Schema.Types.Mixed,
    is_active: {
        type: Boolean,
        default: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

function generatePublicKey() {
    return `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB6dIbx8aQFJbuGFOCgSImY
34RnWTiLYiO8JPqgiFPLsjPQb0btrOtuB2L2SSJesic6fLf6iby1QpoJxJhvD3u9
a8Vv2L5bAmFGRPp5eaQwQw7+GW+dy9JigEEiNfo80Ekursm/WKZEYXM+xItQZ76f
bl5mz91X2uTXE9OBU1vfa4XSfvc1+yD1D2y+Y2GMzR5MXeLek54B2NSrxopzzotN
g7dKkXbn2mPDMt6poQuM816JJonmrex9oib4FQeeAhycqpFprYL1xN935fiqi3Ww
8t2q6N7wXQTw2WAzlAC+nyIEv1hx0enpivbGkY5h+zr84xirTLeiqN2rYRLAvdin
AgMBAAE=
-----END PUBLIC KEY-----
`;
}

module.exports = mongoose.model('Tenant', tenantSchema);