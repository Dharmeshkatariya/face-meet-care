// models/booking/Coupon.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const couponSchema = new mongoose.Schema({
    // ========== BASIC INFO ==========
    coupon_id: {
        type: String,
        unique: true,
        default: () => 'CPN' + Date.now().toString(36).toUpperCase()
    },
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        minlength: [4, 'Code must be at least 4 characters'],
        maxlength: [20, 'Code must be less than 20 characters']
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        default: '',
        maxlength: [500, 'Description too long']
    },

    // ========== DISCOUNT TYPE ==========
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed_amount'],
        required: [true, 'Discount type is required']
    },
    discount_value: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount cannot be negative']
    },
    discount_percentage: {
        type: Number,
        min: 0,
        max: 100
    },
    discount_amount: {
        type: Number,
        min: 0
    },
    max_discount: {
        type: Number,
        default: null
    },

    // ========== CONDITIONS ==========
    min_booking_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    max_booking_amount: {
        type: Number,
        default: null
    },
    min_service_count: {
        type: Number,
        default: 1
    },
    applicable_services: [{
        type: String  // service_ids
    }],
    applicable_categories: [{
        type: String
    }],
    excluded_services: [{
        type: String
    }],
    excluded_categories: [{
        type: String
    }],
    applicable_booking_types: [{
        type: String,
        enum: ['instant', 'scheduled', 'recurring', 'group']
    }],
    for_new_users_only: {
        type: Boolean,
        default: false
    },
    for_first_booking_only: {
        type: Boolean,
        default: false
    },
    min_previous_bookings: {
        type: Number,
        default: 0
    },

    // ========== USAGE LIMITS ==========
    usage_limit: {
        type: Number,
        default: null  // null = unlimited
    },
    usage_limit_per_user: {
        type: Number,
        default: 1
    },
    usage_limit_per_day: {
        type: Number,
        default: null
    },
    current_usage: {
        type: Number,
        default: 0
    },
    usage_history: [{
        user_id: String,
        booking_id: String,
        used_at: Date,
        discount_saved: Number
    }],

    // ========== VALIDITY ==========
    is_active: {
        type: Boolean,
        default: true
    },
    valid_from: {
        type: Date,
        default: Date.now
    },
    valid_until: {
        type: Date,
        required: [true, 'Expiry date is required']
    },
    applicable_days: [{
        type: Number,  // 0=Sun, 6=Sat
        min: 0,
        max: 6
    }],
    applicable_hours: {
        start: { type: Number, min: 0, max: 23 },
        end: { type: Number, min: 1, max: 24 }
    },

    // ========== STACKING ==========
    stackable: {
        type: Boolean,
        default: false
    },
    stackable_with: [{
        type: String  // other coupon_ids
    }],
    priority: {
        type: Number,
        default: 0  // higher = applied first
    },

    // ========== DISPLAY ==========
    banner_text: String,
    terms_conditions: String,
    promo_badge: String,
    color: {
        type: String,
        default: '#FF6B6B'
    },

    // ========== STATS ==========
    total_times_used: {
        type: Number,
        default: 0
    },
    total_discount_given: {
        type: Number,
        default: 0
    },
    total_revenue_generated: {
        type: Number,
        default: 0
    },
    conversion_rate: {
        type: Number,
        default: 0
    },

    // ========== META ==========
    created_by: String,
    updated_by: String,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'coupons'
});

// ========== INDEXES ==========
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ is_active: 1, valid_from: 1, valid_until: 1 });
couponSchema.index({ discount_type: 1, is_active: 1 });
couponSchema.index({ current_usage: 1, usage_limit: 1 });

// ========== PRE-SAVE MIDDLEWARE ==========
couponSchema.pre('save', function(next) {
    this.updated_at = new Date();

    // Auto-calculate discount values
    if (this.discount_type === 'percentage') {
        this.discount_percentage = this.discount_value;
        this.discount_amount = null;
    } else {
        this.discount_amount = this.discount_value;
        this.discount_percentage = null;
    }
    next();
});

// ========== INSTANCE METHODS ==========

/**
 * Check if coupon is valid
 */
couponSchema.methods.isValid = function(bookingAmount = 0) {
    const now = new Date();

    // Check active
    if (!this.is_active) return { valid: false, reason: 'Coupon is inactive' };

    // Check dates
    if (now < new Date(this.valid_from)) return { valid: false, reason: 'Coupon not yet active' };
    if (now > new Date(this.valid_until)) return { valid: false, reason: 'Coupon has expired' };

    // Check usage limit
    if (this.usage_limit && this.current_usage >= this.usage_limit) {
        return { valid: false, reason: 'Coupon usage limit reached' };
    }

    // Check daily limit
    if (this.usage_limit_per_day) {
        const todayUsage = (this.usage_history || []).filter(h => {
            const usedDate = new Date(h.used_at).toDateString();
            return usedDate === now.toDateString();
        }).length;
        if (todayUsage >= this.usage_limit_per_day) {
            return { valid: false, reason: 'Daily usage limit reached' };
        }
    }

    // Check min amount
    if (bookingAmount < this.min_booking_amount) {
        return {
            valid: false,
            reason: `Minimum booking amount: ₹${this.min_booking_amount}`
        };
    }

    // Check applicable days
    if (this.applicable_days && this.applicable_days.length > 0) {
        if (!this.applicable_days.includes(now.getDay())) {
            return { valid: false, reason: 'Not applicable today' };
        }
    }

    // Check applicable hours
    if (this.applicable_hours) {
        const hour = now.getHours();
        if (hour < this.applicable_hours.start || hour >= this.applicable_hours.end) {
            return { valid: false, reason: 'Not applicable at this time' };
        }
    }

    return { valid: true };
};

/**
 * Calculate discount amount
 */
couponSchema.methods.calculateDiscount = function(bookingAmount) {
    if (this.discount_type === 'percentage') {
        let discount = bookingAmount * (this.discount_percentage / 100);
        if (this.max_discount) {
            discount = Math.min(discount, this.max_discount);
        }
        return Math.round(discount * 100) / 100;
    } else {
        return Math.min(this.discount_amount, bookingAmount);
    }
};

/**
 * Record usage
 */
couponSchema.methods.recordUsage = async function(userId, bookingId, discountSaved) {
    this.current_usage += 1;
    this.total_times_used += 1;
    this.total_discount_given += discountSaved;

    this.usage_history = this.usage_history || [];
    this.usage_history.push({
        user_id: userId,
        booking_id: bookingId,
        used_at: new Date(),
        discount_saved: discountSaved
    });

    // Keep only last 1000 records
    if (this.usage_history.length > 1000) {
        this.usage_history = this.usage_history.slice(-1000);
    }

    await this.save();
};

// ========== STATIC METHODS ==========

/**
 * Find valid coupon by code
 */
couponSchema.statics.findValid = function(code) {
    const now = new Date();
    return this.findOne({
        code: code.toUpperCase(),
        is_active: true,
        valid_from: { $lte: now },
        valid_until: { $gte: now }
    });
};

/**
 * Get active coupons
 */
couponSchema.statics.getActive = function(options = {}) {
    const now = new Date();
    return this.find({
        is_active: true,
        valid_from: { $lte: now },
        valid_until: { $gte: now },
        ...(options.category ? { applicable_categories: options.category } : {})
    }).sort({ priority: -1 });
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;