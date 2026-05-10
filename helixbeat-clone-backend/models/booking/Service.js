// models/booking/Service.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const serviceSchema = new mongoose.Schema({
    // ========== BASIC INFO ==========
    service_id: {
        type: String,
        unique: true,
        default: () => 'SVC' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase()
    },
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true,
        maxlength: [100, 'Name too long']
    },
    description: {
        type: String,
        default: '',
        maxlength: [2000, 'Description too long']
    },
    short_description: {
        type: String,
        default: '',
        maxlength: [200, 'Short description too long']
    },

    // ========== CATEGORIZATION ==========
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        lowercase: true
    },
    sub_category: {
        type: String,
        default: '',
        trim: true,
        lowercase: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    keywords: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // ========== PRICING ==========
    base_price: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Price cannot be negative']
    },
    price_unit: {
        type: String,
        enum: ['fixed', 'hourly', 'daily', 'sqft', 'per_item', 'per_room'],
        default: 'fixed'
    },
    price_range: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 }
    },
    currency: {
        type: String,
        default: 'INR'
    },
    tax_included: {
        type: Boolean,
        default: false
    },

    // ========== DURATION ==========
    duration_minutes: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [15, 'Minimum duration is 15 minutes'],
        max: [480, 'Maximum duration is 8 hours']
    },
    buffer_minutes: {
        type: Number,
        default: 15,
        min: [0, 'Buffer cannot be negative'],
        max: [60, 'Maximum buffer is 60 minutes']
    },

    // ========== BOOKING CONFIG ==========
    max_bookings_per_slot: {
        type: Number,
        default: 1,
        min: [1, 'Minimum 1 booking per slot'],
        max: [10, 'Maximum 10 bookings per slot']
    },
    advance_booking_days: {
        type: Number,
        default: 30,
        min: [1, 'Minimum 1 day'],
        max: [90, 'Maximum 90 days']
    },
    min_notice_hours: {
        type: Number,
        default: 2,
        min: [0, 'Cannot be negative']
    },

    // ========== PROVIDERS ==========
    providers: [{
        provider_id: {
            type: String,
            required: true
        },
        provider_name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        total_jobs: {
            type: Number,
            default: 0
        },
        specialization: {
            type: String,
            default: ''
        },
        experience_years: {
            type: Number,
            default: 0
        },
        is_available: {
            type: Boolean,
            default: true
        },
        profile_image: {
            type: String,
            default: ''
        },
        languages: [String],
        certifications: [String]
    }],

    // ========== WORKING HOURS ==========
    working_hours: {
        start: {
            type: Number,
            default: 8,
            min: 0,
            max: 23
        },
        end: {
            type: Number,
            default: 20,
            min: 1,
            max: 24
        }
    },
    off_days: [{
        type: Number, // 0=Sunday, 6=Saturday
        min: 0,
        max: 6
    }],
    holiday_dates: [Date],

    // ========== PEAK HOURS ==========
    peak_hours: [{
        start_hour: {
            type: Number,
            required: true,
            min: 0,
            max: 23
        },
        end_hour: {
            type: Number,
            required: true,
            min: 1,
            max: 24
        },
        surcharge_percentage: {
            type: Number,
            default: 20,
            min: 0,
            max: 100
        },
        days: [{
            type: Number,
            min: 0,
            max: 6
        }],
        label: String
    }],

    // ========== ADDONS ==========
    addons: [{
        addon_id: {
            type: String,
            default: () => 'ADD' + Date.now().toString(36).toUpperCase()
        },
        name: {
            type: String,
            required: true
        },
        description: String,
        price: {
            type: Number,
            required: true,
            min: 0
        },
        duration_minutes: {
            type: Number,
            default: 0
        },
        is_required: {
            type: Boolean,
            default: false
        },
        max_quantity: {
            type: Number,
            default: 1
        },
        image_url: String
    }],

    // ========== MEDIA ==========
    image_url: {
        type: String,
        default: ''
    },
    thumbnail_url: {
        type: String,
        default: ''
    },
    images: [{
        url: String,
        caption: String,
        is_primary: { type: Boolean, default: false }
    }],
    video_url: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: 'home_repair_service'
    },

    // ========== RATINGS & REVIEWS ==========
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    total_reviews: {
        type: Number,
        default: 0
    },
    rating_breakdown: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 }
    },

    // ========== FAQ ==========
    faqs: [{
        question: String,
        answer: String,
        order: { type: Number, default: 0 }
    }],

    // ========== REQUIREMENTS ==========
    requirements: [{
        type: String
    }],
    customer_requirements: [{
        type: String
    }],
    included_items: [{
        type: String
    }],
    excluded_items: [{
        type: String
    }],

    // ========== SEO ==========
    seo_title: String,
    seo_description: String,
    seo_keywords: [String],
    slug: {
        type: String,
        unique: true,
        sparse: true
    },

    // ========== STATUS ==========
    is_active: {
        type: Boolean,
        default: true
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    is_popular: {
        type: Boolean,
        default: false
    },
    is_premium: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        default: 0
    },
    total_bookings: {
        type: Number,
        default: 0
    },

    // ========== INSURANCE ==========
    insurance_available: {
        type: Boolean,
        default: true
    },
    insurance_percentage: {
        type: Number,
        default: 5
    },
    insurance_description: String,

    // ========== CANCELLATION ==========
    default_cancellation_policy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict'],
        default: 'moderate'
    },
    cancellation_policy_details: String,

    // ========== META ==========
    created_by: String,
    updated_by: String,
    version: {
        type: Number,
        default: 1
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'services'
});

// ========== INDEXES ==========
serviceSchema.index({ service_id: 1 }, { unique: true });
serviceSchema.index({ category: 1, is_active: 1 });
serviceSchema.index({ sub_category: 1, is_active: 1 });
serviceSchema.index({ is_active: 1, rating: -1 });
serviceSchema.index({ is_featured: 1, is_active: 1 });
serviceSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' });
serviceSchema.index({ slug: 1 }, { unique: true, sparse: true });
serviceSchema.index({ 'providers.provider_id': 1 });

// ========== PRE-SAVE MIDDLEWARE ==========
serviceSchema.pre('save', function(next) {
    this.updated_at = new Date();
    if (!this.slug && this.name) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    next();
});

// ========== INSTANCE METHODS ==========

/**
 * Calculate average rating
 */
serviceSchema.methods.calculateRating = function() {
    const breakdown = this.rating_breakdown;
    let totalScore = 0;
    let totalCount = 0;

    for (let i = 1; i <= 5; i++) {
        totalScore += i * (breakdown[i] || 0);
        totalCount += (breakdown[i] || 0);
    }

    this.total_reviews = totalCount;
    this.rating = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0;
    return this.rating;
};

/**
 * Get available providers
 */
serviceSchema.methods.getAvailableProviders = function() {
    return (this.providers || []).filter(p => p.is_available);
};

/**
 * Get minimum price
 */
serviceSchema.methods.getMinPrice = function() {
    return this.base_price || this.price_range?.min || 0;
};

/**
 * Get public JSON
 */
serviceSchema.methods.toPublicJSON = function() {
    return {
        service_id: this.service_id,
        name: this.name,
        description: this.short_description || this.description,
        category: this.category,
        base_price: this.base_price,
        price_unit: this.price_unit,
        duration_minutes: this.duration_minutes,
        rating: this.rating,
        total_reviews: this.total_reviews,
        image_url: this.image_url,
        is_featured: this.is_featured,
        providers_count: (this.providers || []).length
    };
};

// ========== STATIC METHODS ==========

/**
 * Find by category
 */
serviceSchema.statics.findByCategory = function(category, options = {}) {
    const query = { category, is_active: true };
    if (options.featured) query.is_featured = true;
    return this.find(query).sort({ rating: -1 }).limit(options.limit || 50);
};

/**
 * Search services
 */
serviceSchema.statics.search = function(query, options = {}) {
    const filter = { is_active: true };
    if (options.category) filter.category = options.category;
    if (options.min_price) filter.base_price = { $gte: options.min_price };
    if (options.max_price) {
        filter.base_price = { ...filter.base_price, $lte: options.max_price };
    }

    return this.find({
        ...filter,
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { tags: { $regex: query, $options: 'i' } }
        ]
    }).sort({ rating: -1 }).limit(options.limit || 20);
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;