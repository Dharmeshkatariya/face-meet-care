// models/Booking.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const bookingSchema = new mongoose.Schema({
    // ========== BASIC INFO ==========
    booking_id: {
        type: String,
        unique: true,
        default: () => `booking_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    },
    service_id: {
        type: String,
        required: [true, 'Service ID is required'],
        trim: true
    },
    service_name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true
    },
    service_image: {
        type: String,
        default: null
    },
    provider_id: {
        type: String,
        required: [true, 'Provider ID is required'],
        trim: true
    },
    provider_name: {
        type: String,
        required: [true, 'Provider name is required'],
        trim: true
    },
    provider_image: {
        type: String,
        default: null
    },
    provider_rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    // ========== CUSTOMER INFO ==========
    customer_id: {
        type: String,
        required: true,
        trim: true
    },
    customer_name: {
        type: String,
        required: true,
        trim: true
    },
    customer_email: {
        type: String,
        trim: true,
        lowercase: true
    },
    customer_phone: {
        type: String,
        trim: true
    },

    // ========== BOOKING DETAILS ==========
    booking_type: {
        type: String,
        enum: ['instant', 'scheduled', 'recurring', 'group'],
        default: 'instant'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'queued', 'no_show'],
        default: 'pending'
    },
    booking_date: {
        type: Date,
        required: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date,
        required: true
    },
    slot_id: {
        type: String,
        default: null
    },

    // ========== LOCATION ==========
    address_id: {
        type: String,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    address_label: {
        type: String,
        enum: ['home', 'office', 'other', null],
        default: null
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },

    // ========== PRICING ==========
    base_price: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    tax_amount: {
        type: Number,
        default: 0
    },
    tax_percentage: {
        type: Number,
        default: 18
    },
    total_amount: {
        type: Number,
        required: true,
        min: 0
    },
    coupon_code: {
        type: String,
        default: null
    },
    coupon_discount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },

    // ========== INSURANCE & POLICIES ==========
    has_cancellation_insurance: {
        type: Boolean,
        default: false
    },
    insurance_cost: {
        type: Number,
        default: 0
    },
    cancellation_policy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict', 'custom'],
        default: 'moderate'
    },
    reschedule_penalty_type: {
        type: String,
        enum: ['none', 'fee', 'restricted'],
        default: 'none'
    },

    // ========== WAITLIST ==========
    waitlist_position: {
        type: Number,
        default: null
    },
    total_waitlisted: {
        type: Number,
        default: null
    },
    is_auto_confirm: {
        type: Boolean,
        default: false
    },

    // ========== RECURRING/GROUP ==========
    recurring_group_id: {
        type: String,
        default: null
    },
    recurring_frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', null],
        default: null
    },
    group_booking_id: {
        type: String,
        default: null
    },
    grouped_service_ids: {
        type: [String],
        default: null
    },
    grouped_services: [{
        service_id: String,
        service_name: String,
        provider_name: String,
        price: Number,
        start_time: Date,
        end_time: Date,
        status: String
    }],

    // ========== PREFERENCES ==========
    preferences: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: null
    },
    service_details: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: null
    },
    notes: {
        type: String,
        default: null,
        maxlength: 500
    },

    // ========== PAYMENT ==========
    payment_method: {
        type: {
            id: String,
            type: { type: String, enum: ['card', 'wallet', 'cash', 'upi', 'net_banking', 'bnpl'] },
            last4: String,
            brand: String,
            bank_name: String,
            is_default: Boolean,
            upi_id: String
        },
        default: null
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'partial_refund', 'failed'],
        default: 'pending'
    },
    transaction_id: {
        type: String,
        default: null
    },

    // ========== CANCELLATION ==========
    cancellation_reason: {
        type: String,
        default: null
    },
    cancelled_at: {
        type: Date,
        default: null
    },
    cancelled_by: {
        type: String,
        enum: ['customer', 'provider', 'admin', null],
        default: null
    },
    refund_amount: {
        type: Number,
        default: null
    },
    refund_status: {
        type: String,
        enum: ['not_initiated', 'processing', 'completed', 'failed', null],
        default: null
    },

    // ========== RESCHEDULE ==========
    rescheduled_from: {
        type: Date,
        default: null
    },
    rescheduled_to: {
        type: Date,
        default: null
    },
    reschedule_count: {
        type: Number,
        default: 0,
        min: 0
    },
    max_reschedules: {
        type: Number,
        default: 3
    },
    reschedule_fee: {
        type: Number,
        default: null
    },
    reschedule_history: [{
        from_date: Date,
        to_date: Date,
        from_time: Date,
        to_time: Date,
        fee_charged: Number,
        changed_at: Date,
        reason: String
    }],

    // ========== REVIEWS ==========
    rating: {
        type: Number,
        default: null,
        min: 0,
        max: 5
    },
    review: {
        type: String,
        default: null,
        maxlength: 1000
    },
    reviewed_at: {
        type: Date,
        default: null
    },

    // ========== ADDONS ==========
    addons: [{
        id: String,
        name: String,
        description: String,
        price: Number,
        quantity: Number,
        is_required: Boolean
    }],

    // ========== META ==========
    is_priority: {
        type: Boolean,
        default: false
    },
    qr_code: {
        type: String,
        default: null
    },
    referral_code: {
        type: String,
        default: null
    },
    custom_fields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: null
    },
    source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'admin'],
        default: 'web'
    },
    tenant_id: {
        type: String,
        required: true,
        ref: 'Tenant'
    },

    // ========== TIMESTAMPS ==========
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
    collection: 'bookings'
});

// ========== INDEXES ==========
bookingSchema.index({ booking_id: 1 }, { unique: true });
bookingSchema.index({ customer_id: 1, status: 1 });
bookingSchema.index({ provider_id: 1, booking_date: 1 });
bookingSchema.index({ service_id: 1, booking_date: 1 });
bookingSchema.index({ status: 1, booking_date: 1 });
bookingSchema.index({ group_booking_id: 1 });
bookingSchema.index({ recurring_group_id: 1 });
bookingSchema.index({ created_at: -1 });

// ========== PRE-SAVE MIDDLEWARE ==========
bookingSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// ========== INSTANCE METHODS ==========

/**
 * Calculate service duration
 */
bookingSchema.methods.getDuration = function() {
    if (this.start_time && this.end_time) {
        return (this.end_time - this.start_time) / (1000 * 60); // minutes
    }
    return 0;
};

/**
 * Check if booking can be cancelled
 */
bookingSchema.methods.canCancel = function() {
    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(this.status)) return false;

    if (this.start_time) {
        const hoursUntilService = (new Date(this.start_time) - new Date()) / (1000 * 60 * 60);
        if (hoursUntilService < 2) return false; // Minimum 2 hours notice
    }

    return true;
};

/**
 * Check if booking can be rescheduled
 */
bookingSchema.methods.canReschedule = function() {
    if (this.status === 'cancelled' || this.status === 'completed' || this.status === 'no_show') {
        return false;
    }
    return this.reschedule_count < this.max_reschedules;
};

/**
 * Calculate refund amount
 */
bookingSchema.methods.calculateRefund = function() {
    if (!this.canCancel()) return 0;

    if (this.has_cancellation_insurance) return this.total_amount;

    const hoursUntilService = (new Date(this.start_time) - new Date()) / (1000 * 60 * 60);

    switch (this.cancellation_policy) {
        case 'flexible':
            return hoursUntilService >= 24 ? this.total_amount : this.total_amount * 0.5;
        case 'moderate':
            if (hoursUntilService >= 48) return this.total_amount;
            if (hoursUntilService >= 24) return this.total_amount * 0.75;
            return this.total_amount * 0.25;
        case 'strict':
            if (hoursUntilService >= 72) return this.total_amount * 0.5;
            return 0;
        case 'custom':
            return hoursUntilService >= 48 ? this.total_amount * 0.5 : 0;
        default:
            return 0;
    }
};

/**
 * Get formatted booking info
 */
bookingSchema.methods.toPublicJSON = function() {
    return {
        id: this.booking_id,
        service_id: this.service_id,
        service_name: this.service_name,
        provider_id: this.provider_id,
        provider_name: this.provider_name,
        provider_rating: this.provider_rating,
        booking_type: this.booking_type,
        status: this.status,
        booking_date: this.booking_date,
        start_time: this.start_time,
        end_time: this.end_time,
        address: this.address,
        address_label: this.address_label,
        base_price: this.base_price,
        discount: this.discount,
        tax_amount: this.tax_amount,
        total_amount: this.total_amount,
        coupon_code: this.coupon_code,
        has_cancellation_insurance: this.has_cancellation_insurance,
        waitlist_position: this.waitlist_position,
        notes: this.notes,
        created_at: this.created_at
    };
};

// ========== STATIC METHODS ==========

/**
 * Find bookings by customer
 */
bookingSchema.statics.findByCustomer = function(customerId, options = {}) {
    const query = { customer_id: customerId };
    if (options.status) query.status = options.status;
    if (options.booking_type) query.booking_type = options.booking_type;
    if (options.from_date) query.booking_date = { $gte: new Date(options.from_date) };
    if (options.to_date) {
        query.booking_date = { ...query.booking_date, $lte: new Date(options.to_date) };
    }
    return this.find(query).sort({ booking_date: -1 });
};

/**
 * Find upcoming bookings
 */
bookingSchema.statics.findUpcoming = function(customerId) {
    return this.find({
        customer_id: customerId,
        status: { $in: ['confirmed', 'pending'] },
        start_time: { $gte: new Date() }
    }).sort({ start_time: 1 });
};

/**
 * Find active bookings for a provider on a date
 */
bookingSchema.statics.findProviderBookings = function(providerId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.find({
        provider_id: providerId,
        status: { $in: ['confirmed', 'in_progress'] },
        start_time: { $gte: startOfDay, $lte: endOfDay }
    });
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;