// models/booking/Waitlist.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const waitlistSchema = new mongoose.Schema({
    // ========== BASIC INFO ==========
    waitlist_id: {
        type: String,
        unique: true,
        default: () => 'WTL' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase()
    },
    booking_id: {
        type: String,
        unique: true,
        sparse: true
    },
    service_id: {
        type: String,
        required: [true, 'Service ID is required']
    },
    service_name: {
        type: String,
        required: [true, 'Service name is required']
    },
    slot_id: {
        type: String,
        required: [true, 'Slot ID is required']
    },
    slot_date: {
        type: Date,
        required: [true, 'Slot date is required']
    },
    slot_time: {
        type: String,
        required: [true, 'Slot time is required']
    },

    // ========== CUSTOMER INFO ==========
    customer_id: {
        type: String,
        required: [true, 'Customer ID is required']
    },
    customer_name: {
        type: String,
        required: [true, 'Customer name is required']
    },
    customer_email: {
        type: String,
        trim: true,
        lowercase: true
    },
    customer_phone: {
        type: String,
        required: [true, 'Customer phone is required']
    },

    // ========== WAITLIST POSITION ==========
    position: {
        type: Number,
        required: [true, 'Position is required'],
        min: 1
    },
    total_waitlisted: {
        type: Number,
        default: 1
    },

    // ========== STATUS ==========
    status: {
        type: String,
        enum: ['waiting', 'notified', 'confirmed', 'expired', 'cancelled', 'declined'],
        default: 'waiting'
    },
    is_auto_confirm: {
        type: Boolean,
        default: false
    },
    auto_confirm_deadline: {
        type: Date
    },

    // ========== NOTIFICATION ==========
    notification_preference: {
        type: String,
        enum: ['sms', 'email', 'push', 'all'],
        default: 'all'
    },
    last_notified_at: {
        type: Date
    },
    notification_count: {
        type: Number,
        default: 0
    },
    max_notifications: {
        type: Number,
        default: 3
    },

    // ========== PREFERENCES ==========
    preferred_time_range: {
        start: String,
        end: String
    },
    max_price: {
        type: Number
    },
    alternative_providers: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        maxlength: 500
    },

    // ========== EXPIRY ==========
    expires_at: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    expiry_reason: {
        type: String,
        enum: ['auto_expired', 'slot_filled', 'customer_cancelled', 'admin_removed']
    },

    // ========== CONVERSION ==========
    converted_to_booking: {
        type: Boolean,
        default: false
    },
    converted_booking_id: {
        type: String
    },
    converted_at: {
        type: Date
    },

    // ========== STATS ==========
    wait_duration_minutes: {
        type: Number,
        default: 0
    },
    attempts_to_contact: {
        type: Number,
        default: 0
    },

    // ========== META ==========
    source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'auto'],
        default: 'web'
    },
    tags: [String],
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
    collection: 'waitlist'
});

// ========== INDEXES ==========
waitlistSchema.index({ waitlist_id: 1 }, { unique: true });
waitlistSchema.index({ slot_id: 1, status: 1 });
waitlistSchema.index({ customer_id: 1, status: 1 });
waitlistSchema.index({ service_id: 1, slot_date: 1 });
waitlistSchema.index({ status: 1, position: 1 });
waitlistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// ========== PRE-SAVE MIDDLEWARE ==========
waitlistSchema.pre('save', function(next) {
    this.updated_at = new Date();

    // Calculate wait duration
    if (this.status === 'confirmed' && this.converted_at) {
        this.wait_duration_minutes = Math.round(
            (new Date(this.converted_at) - new Date(this.created_at)) / (1000 * 60)
        );
    }
    next();
});

// ========== INSTANCE METHODS ==========

/**
 * Move to next position (when someone ahead cancels)
 */
waitlistSchema.methods.moveUp = async function() {
    if (this.position > 1) {
        this.position -= 1;
        this.total_waitlisted -= 1;
        await this.save();
    }
    return this;
};

/**
 * Notify customer
 */
waitlistSchema.methods.notify = function(method = 'all') {
    this.last_notified_at = new Date();
    this.notification_count += 1;
    this.status = 'notified';
    return this.save();
};

/**
 * Convert to booking
 */
waitlistSchema.methods.convertToBooking = function(bookingId) {
    this.status = 'confirmed';
    this.converted_to_booking = true;
    this.converted_booking_id = bookingId;
    this.converted_at = new Date();
    return this.save();
};

/**
 * Cancel waitlist entry
 */
waitlistSchema.methods.cancel = function(reason = 'customer_cancelled') {
    this.status = 'cancelled';
    this.expiry_reason = reason;
    return this.save();
};

/**
 * Get estimated wait time
 */
waitlistSchema.methods.getEstimatedWaitTime = function(avgServiceDuration = 60) {
    // Rough estimate: position * 15 minutes
    return this.position * 15;
};

// ========== STATIC METHODS ==========

/**
 * Get next in line for a slot
 */
waitlistSchema.statics.getNextInLine = function(slotId) {
    return this.findOne({ slot_id: slotId, status: 'waiting' })
        .sort({ position: 1 });
};

/**
 * Get waitlist count for a slot
 */
waitlistSchema.statics.getCount = function(slotId) {
    return this.countDocuments({ slot_id: slotId, status: 'waiting' });
};

/**
 * Update positions after someone leaves
 */
waitlistSchema.statics.updatePositions = async function(slotId) {
    const entries = await this.find({
        slot_id: slotId,
        status: 'waiting'
    }).sort({ created_at: 1 });

    for (let i = 0; i < entries.length; i++) {
        entries[i].position = i + 1;
        entries[i].total_waitlisted = entries.length;
        await entries[i].save();
    }
};

/**
 * Find expiring entries
 */
waitlistSchema.statics.findExpiring = function(hoursBefore = 24) {
    const deadline = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);
    return this.find({
        status: 'waiting',
        expires_at: { $lte: deadline, $gt: new Date() }
    });
};

/**
 * Get waitlist statistics
 */
waitlistSchema.statics.getStats = async function(date) {
    const startOfDay = new Date(date || new Date());
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const total = await this.countDocuments({
        created_at: { $gte: startOfDay, $lte: endOfDay }
    });

    const waiting = await this.countDocuments({
        created_at: { $gte: startOfDay, $lte: endOfDay },
        status: 'waiting'
    });

    const confirmed = await this.countDocuments({
        converted_at: { $gte: startOfDay, $lte: endOfDay },
        converted_to_booking: true
    });

    const avgWait = await this.aggregate([
        {
            $match: {
                converted_to_booking: true,
                converted_at: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        { $group: { _id: null, avgMinutes: { $avg: '$wait_duration_minutes' } } }
    ]);

    return {
        date: startOfDay.toISOString().split('T')[0],
        total_joined: total,
        currently_waiting: waiting,
        converted_today: confirmed,
        conversion_rate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
        avg_wait_minutes: avgWait[0] ? Math.round(avgWait[0].avgMinutes) : 0
    };
};

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;