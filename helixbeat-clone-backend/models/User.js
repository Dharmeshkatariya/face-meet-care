const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    encrypted_password: {
        type: String
    },
    first_name: {
        type: String,
        default: ''
    },
    last_name: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        enum: ['M', 'F', 'O'],
        default: 'M'
    },
    phone: {
        type: String,
        default: ''
    },
    country_code: {
        type: String,
        default: '+1'
    },
    is_active: {
        type: Boolean,
        default: true
    },
    mfa_enabled: {
        type: Boolean,
        default: false
    },
    last_login: {
        type: Date
    },
    login_attempts: {
        type: Number,
        default: 0
    },
    locked: {
        type: Boolean,
        default: false
    },
    locked_at: {
        type: Date
    },
    auth_user_id: {
        type: String,
        unique: true,
        sparse: true
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },
    refresh_token: {
        type: String
    },
    device_details: [{
        make: String,
        model: String,
        ip_address: String,
        device_fingerprint: String,
        device_token: String,
        last_login: Date
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

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    // Regular bcrypt hash
    this.password = await bcrypt.hash(this.password, 10);

    // Encrypted version (with proper error handling for Linux/Unix)
    try {
        const algorithm = 'aes-256-cbc';

        // Get encryption key and IV from environment
        let key = process.env.ENCRYPTION_KEY || 'default_key_32_chars_long_here_123';
        let iv = process.env.ENCRYPTION_IV || 'default_iv_16_cha';

        // Ensure key is 32 bytes
        if (key.length < 32) {
            key = key.padEnd(32, '0');
        } else if (key.length > 32) {
            key = key.slice(0, 32);
        }

        // Ensure IV is 16 bytes
        if (iv.length < 16) {
            iv = iv.padEnd(16, '0');
        } else if (iv.length > 16) {
            iv = iv.slice(0, 16);
        }

        const keyBuffer = Buffer.from(key, 'utf-8');
        const ivBuffer = Buffer.from(iv, 'utf-8');

        const cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
        let encrypted = cipher.update(this.password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        this.encrypted_password = encrypted;
    } catch (error) {
        console.error('Encryption error:', error.message);
        // Continue without encrypted password
        this.encrypted_password = null;
    }

    next();
});
// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = async function(deviceDetail = null) {
    this.last_login = new Date();
    this.login_attempts = 0;

    if (deviceDetail) {
        this.device_details.push({
            ...deviceDetail,
            last_login: new Date()
        });
        // Keep only last 10 devices
        if (this.device_details.length > 10) {
            this.device_details = this.device_details.slice(-10);
        }
    }

    await this.save();
};

module.exports = mongoose.model('User', userSchema);