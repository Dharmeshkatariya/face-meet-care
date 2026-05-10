// models/booking/Booking.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const bookingSchema = new mongoose.Schema({
    // ========== BASIC IDENTIFIERS ==========
    booking_id: {
        type: String,
        unique: true,
        default: () => 'BK' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase()
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
    customer_id: {
        type: String,
        required: [true, 'Customer ID is required'],
        trim: true
    },
    customer_name: {
        type: String,
        required: [true, 'Customer name is required'],
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
        default: 'confirmed'
    },
    booking_date: {
        type: Date,
        required: [true, 'Booking date is required']
    },
    start_time: {
        type: Date,
        required: [true, 'Start time is required']
    },
    end_time: {
        type: Date,
        required: [true, 'End time is required']
    },
    slot_id: {
        type: String,
        trim: true
    },
    duration_minutes: {
        type: Number,
        default: 60
    },
    buffer_minutes: {
        type: Number,
        default: 15
    },

    // ========== LOCATION ==========
    address: {
        type: String,
        default: ''
    },
    address_label: {
        type: String,
        enum: ['home', 'office', 'other', ''],
        default: ''
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    location_notes: {
        type: String,
        default: ''
    },

    // ========== PRICING ==========
    base_price: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Price cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    discount_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
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
        required: [true, 'Total amount is required'],
        min: [0, 'Total cannot be negative']
    },
    coupon_code: {
        type: String,
        trim: true
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
        enum: ['flexible', 'moderate', 'strict'],
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
    is_auto_confirm_enabled: {
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
    grouped_services: [{
        service_id: String,
        service_name: String,
        provider_name: String,
        price: Number,
        start_time: Date,
        end_time: Date,
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending'
        }
    }],

    // ========== ADDONS ==========
    addons: [{
        addon_id: String,
        name: String,
        description: String,
        price: Number,
        quantity: {
            type: Number,
            default: 1,
            min: 1
        },
        is_required: {
            type: Boolean,
            default: false
        }
    }],

    // ========== PREFERENCES & NOTES ==========
    preferences: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    service_details: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    special_instructions: {
        type: String,
        maxlength: [1000, 'Instructions too long']
    },

    // ========== PAYMENT ==========
    payment_method: {
        type: {
            type: String,
            enum: ['card', 'wallet', 'cash', 'upi', 'net_banking', 'bnpl']
        },
        last4: String,
        brand: String,
        bank_name: String,
        is_default: Boolean,
        upi_id: String
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'partial_refund', 'failed'],
        default: 'paid'
    },
    transaction_id: {
        type: String,
        trim: true
    },
    payment_date: {
        type: Date
    },

    // ========== CANCELLATION ==========
    cancellation_reason: {
        type: String
    },
    cancelled_at: {
        type: Date
    },
    cancelled_by: {
        type: String,
        enum: ['customer', 'provider', 'admin', 'system', null]
    },
    refund_amount: {
        type: Number,
        default: null,
        min: 0
    },
    refund_status: {
        type: String,
        enum: ['not_initiated', 'processing', 'completed', 'failed', null]
    },
    refund_transaction_id: {
        type: String
    },

    // ========== RESCHEDULE ==========
    rescheduled_from: {
        type: Date
    },
    rescheduled_to: {
        type: Date
    },
    reschedule_count: {
        type: Number,
        default: 0,
        min: 0
    },
    max_reschedules: {
        type: Number,
        default: 3,
        min: 0,
        max: 10
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

    // ========== REVIEW ==========
    rating: {
        type: Number,
        min: [0, 'Rating minimum is 0'],
        max: [5, 'Rating maximum is 5']
    },
    review: {
        type: String,
        maxlength: [1000, 'Review too long']
    },
    review_title: {
        type: String,
        maxlength: 200
    },
    reviewed_at: {
        type: Date
    },
    review_helpful_count: {
        type: Number,
        default: 0
    },

    // ========== PROVIDER FEEDBACK ==========
    provider_rating: {
        type: Number,
        min: 0,
        max: 5
    },
    provider_feedback: {
        type: String
    },

    // ========== COMMUNICATION ==========
    chat_room_id: {
        type: String
    },
    notification_preferences: {
        sms: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
    },
    reminders_sent: [{
        type: { type: String, enum: ['sms', 'email', 'push'] },
        sent_at: Date
    }],

    // ========== META ==========
    is_priority: {
        type: Boolean,
        default: false
    },
    qr_code: {
        type: String
    },
    referral_code: {
        type: String
    },
    referral_discount: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'admin', 'partner'],
        default: 'web'
    },
    user_agent: {
        type: String
    },
    ip_address: {
        type: String
    },
    tags: [{
        type: String
    }],
    custom_fields: {
        type: mongoose.Schema.Types.Mixed
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
bookingSchema.index({ provider_id: 1, booking_date: 1, status: 1 });
bookingSchema.index({ service_id: 1, booking_date: 1 });
bookingSchema.index({ slot_id: 1, status: 1 });
bookingSchema.index({ booking_date: 1, start_time: 1 });
bookingSchema.index({ group_booking_id: 1 });
bookingSchema.index({ recurring_group_id: 1 });
bookingSchema.index({ status: 1, booking_date: 1 });
bookingSchema.index({ payment_status: 1 });
bookingSchema.index({ created_at: -1 });

// ========== PRE-SAVE MIDDLEWARE ==========
bookingSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// ========== INSTANCE METHODS ==========

/**
 * Get service duration in minutes
 */
bookingSchema.methods.getDuration = function() {
    if (this.start_time && this.end_time) {
        return Math.round((this.end_time - this.start_time) / (1000 * 60));
    }
    return this.duration_minutes || 60;
};

/**
 * Check if booking can be cancelled
 */
bookingSchema.methods.canCancel = function() {
    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(this.status)) return false;

    if (this.start_time) {
        const hoursUntil = (new Date(this.start_time) - new Date()) / (1000 * 60 * 60);
        return hoursUntil >= 2;
    }
    return true;
};

/**
 * Check if booking can be rescheduled
 */
bookingSchema.methods.canReschedule = function() {
    if (['cancelled', 'completed', 'no_show'].includes(this.status)) return false;
    if (this.reschedule_count >= this.max_reschedules) return false;

    if (this.start_time) {
        const hoursUntil = (new Date(this.start_time) - new Date()) / (1000 * 60 * 60);
        return hoursUntil >= 2;
    }
    return true;
};

/**
 * Calculate estimated refund
 */
bookingSchema.methods.calculateEstimatedRefund = function() {
    if (!this.canCancel()) return 0;
    if (this.has_cancellation_insurance) return this.total_amount;

    const hoursUntil = (new Date(this.start_time) - new Date()) / (1000 * 60 * 60);

    switch (this.cancellation_policy) {
        case 'flexible':
            return hoursUntil >= 24 ? this.total_amount : this.total_amount * 0.5;
        case 'moderate':
            if (hoursUntil >= 48) return this.total_amount;
            if (hoursUntil >= 24) return this.total_amount * 0.75;
            return this.total_amount * 0.25;
        case 'strict':
            return hoursUntil >= 72 ? this.total_amount * 0.5 : 0;
        default:
            return 0;
    }
};

/**
 * Get formatted status
 */
bookingSchema.methods.getStatusDisplay = function() {
    const statusMap = {
        'pending': 'Pending Confirmation',
        'confirmed': 'Confirmed',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'rescheduled': 'Rescheduled',
        'queued': 'In Queue',
        'no_show': 'No Show'
    };
    return statusMap[this.status] || this.status;
};

/**
 * Get public booking JSON
 */
bookingSchema.methods.toPublicJSON = function() {
    return {
        booking_id: this.booking_id,
        service_name: this.service_name,
        provider_name: this.provider_name,
        status: this.status,
        status_display: this.getStatusDisplay(),
        booking_date: this.booking_date,
        start_time: this.start_time,
        end_time: this.end_time,
        total_amount: this.total_amount,
        payment_status: this.payment_status,
        rating: this.rating,
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
    if (options.from_date) {
        query.booking_date = { $gte: new Date(options.from_date) };
    }
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
 * Find active bookings for a slot
 */
bookingSchema.statics.findBySlot = function(slotId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.find({
        slot_id: slotId,
        booking_date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['confirmed', 'in_progress', 'pending'] }
    });
};

/**
 * Get booking statistics
 */
bookingSchema.statics.getStats = async function(query = {}) {
    const total = await this.countDocuments(query);
    const completed = await this.countDocuments({ ...query, status: 'completed' });
    const cancelled = await this.countDocuments({ ...query, status: 'cancelled' });

    const revenue = await this.aggregate([
        { $match: { ...query, status: { $in: ['completed', 'confirmed'] } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, avg: { $avg: '$total_amount' } } }
    ]);

    return {
        total_bookings: total,
        completed_bookings: completed,
        cancelled_bookings: cancelled,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        total_revenue: revenue[0]?.total || 0,
        average_booking_value: revenue[0] ? Math.round(revenue[0].avg) : 0
    };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;