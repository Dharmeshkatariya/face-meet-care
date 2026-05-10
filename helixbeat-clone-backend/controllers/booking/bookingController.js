// controllers/booking/bookingController.js

const Booking = require('../../models/booking/Booking');
const Service = require('../../models/booking/Service');
const bookingService = require('../../services/booking/bookingService');
const PriceCalculator = require('../../services/booking/priceCalculator');

class BookingController {

    // ============================================
    // BOOKING CREATION
    // ============================================

    /**
     * Create instant booking
     */
    async createInstantBooking(req, res) {
        try {
            const bookingData = req.body;

            // Validate required fields
            if (!bookingData.service_id) {
                return res.status(400).json({ status: false, message: 'service_id is required' });
            }

            const booking = await bookingService.createInstantBooking(bookingData);

            res.status(201).json({
                status: true,
                data: booking,
                message: 'Booking confirmed successfully! 🎉'
            });
        } catch (error) {
            console.error('Instant booking error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Create scheduled booking
     */
    async createScheduledBooking(req, res) {
        try {
            const bookingData = { ...req.body, booking_type: 'scheduled' };

            if (!bookingData.preferred_date || !bookingData.preferred_start_time) {
                return res.status(400).json({
                    status: false,
                    message: 'preferred_date and preferred_start_time are required for scheduled booking'
                });
            }

            const booking = await bookingService.createScheduledBooking(bookingData);

            res.status(201).json({
                status: true,
                data: booking,
                message: 'Booking scheduled successfully! 📅'
            });
        } catch (error) {
            console.error('Scheduled booking error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Create recurring bookings
     */
    async createRecurringBookings(req, res) {
        try {
            const bookingData = req.body;

            if (!bookingData.frequency) {
                return res.status(400).json({ status: false, message: 'frequency is required (daily, weekly, bi_weekly, monthly)' });
            }

            const result = await bookingService.createRecurringBookings(bookingData);

            res.status(201).json({
                status: true,
                data: result,
                message: `${result.total_bookings} recurring bookings created! 🔄`
            });
        } catch (error) {
            console.error('Recurring booking error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Create group booking
     */
    async createGroupBooking(req, res) {
        try {
            const bookingData = req.body;

            if (!bookingData.service_requests || !Array.isArray(bookingData.service_requests) || bookingData.service_requests.length < 2) {
                return res.status(400).json({
                    status: false,
                    message: 'service_requests array with at least 2 services is required'
                });
            }

            const result = await bookingService.createGroupBooking(bookingData);

            res.status(201).json({
                status: true,
                data: result,
                message: `Group booking created! Save ${result.savings_percentage}% 🎯`
            });
        } catch (error) {
            console.error('Group booking error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ============================================
    // BOOKING MANAGEMENT
    // ============================================

    /**
     * Reschedule booking
     */
    async rescheduleBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const { new_date, new_start_time, new_slot_id } = req.body;

            if (!new_date || !new_start_time) {
                return res.status(400).json({ status: false, message: 'new_date and new_start_time are required' });
            }

            const booking = await bookingService.rescheduleBooking(bookingId, {
                new_date,
                new_start_time,
                new_slot_id
            });

            res.json({
                status: true,
                data: booking,
                message: booking.reschedule_fee > 0
                    ? `Booking rescheduled. Fee: ₹${booking.reschedule_fee}`
                    : 'Booking rescheduled for free! ✅'
            });
        } catch (error) {
            console.error('Reschedule error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Check reschedule eligibility
     */
    async checkRescheduleEligibility(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOne({ booking_id: bookingId });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found' });
            }

            const canReschedule = booking.reschedule_count < booking.max_reschedules;
            const isFree = booking.reschedule_count === 0;
            const hoursUntilService = (new Date(booking.start_time) - new Date()) / (1000 * 60 * 60);

            res.json({
                status: true,
                data: {
                    can_reschedule: canReschedule && hoursUntilService > 2,
                    times_rescheduled: booking.reschedule_count,
                    max_reschedules: booking.max_reschedules,
                    remaining_reschedules: booking.max_reschedules - booking.reschedule_count,
                    is_free_reschedule: isFree || hoursUntilService >= 24,
                    reschedule_fee: !isFree && hoursUntilService < 24 ? 50 : null,
                    penalty_description: isFree ? 'Free reschedule available' : '₹50 reschedule fee applies',
                    free_reschedule_deadline: new Date(new Date(booking.start_time).getTime() - 24 * 60 * 60 * 1000).toISOString(),
                    is_last_reschedule: booking.reschedule_count >= booking.max_reschedules - 1
                }
            });
        } catch (error) {
            console.error('Reschedule check error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Cancel booking
     */
    async cancelBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const { reason, request_refund = true } = req.body;

            const booking = await bookingService.cancelBooking(bookingId, { reason, request_refund });

            res.json({
                status: true,
                data: booking,
                message: booking.refund_amount > 0
                    ? `Booking cancelled. Refund: ₹${booking.refund_amount}`
                    : 'Booking cancelled.'
            });
        } catch (error) {
            console.error('Cancel error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Preview cancellation
     */
    async previewCancellation(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOne({ booking_id: bookingId });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found' });
            }

            const hoursUntil = (new Date(booking.start_time) - new Date()) / (1000 * 60 * 60);
            const refund = PriceCalculator.calculateRefund(booking.total_amount, hoursUntil, booking.cancellation_policy);
            const fee = booking.total_amount - refund;

            res.json({
                status: true,
                data: {
                    booking_id: bookingId,
                    can_cancel: true,
                    refund_amount: Math.round(refund * 100) / 100,
                    cancellation_fee: Math.round(fee * 100) / 100,
                    insurance_payout: booking.has_cancellation_insurance ? booking.total_amount : 0,
                    net_refund: booking.has_cancellation_insurance ? booking.total_amount : Math.round(refund * 100) / 100,
                    policy_description: this._getPolicyDescription(booking.cancellation_policy),
                    deadline: new Date(new Date(booking.start_time).getTime() - 24 * 60 * 60 * 1000).toISOString(),
                    implications: this._getCancellationImplications(booking.cancellation_policy, hoursUntil)
                }
            });
        } catch (error) {
            console.error('Cancel preview error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ============================================
    // BOOKING ACTIONS
    // ============================================

    /**
     * Confirm pending booking
     */
    async confirmBooking(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOneAndUpdate(
                { booking_id: bookingId, status: 'pending' },
                { status: 'confirmed' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ status: false, message: 'Pending booking not found' });
            }

            res.json({ status: true, data: booking, message: 'Booking confirmed! ✅' });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Start service (provider)
     */
    async startService(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOneAndUpdate(
                { booking_id: bookingId, status: 'confirmed' },
                { status: 'in_progress' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ status: false, message: 'Confirmed booking not found' });
            }

            res.json({ status: true, data: booking, message: 'Service started! 🔧' });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Complete service
     */
    async completeService(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOneAndUpdate(
                { booking_id: bookingId, status: 'in_progress' },
                { status: 'completed' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ status: false, message: 'In-progress booking not found' });
            }

            res.json({ status: true, data: booking, message: 'Service completed! 🎉' });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Mark as no-show
     */
    async markAsNoShow(req, res) {
        try {
            const { bookingId } = req.params;
            const { reason } = req.body;

            const booking = await Booking.findOneAndUpdate(
                { booking_id: bookingId, status: { $in: ['confirmed', 'in_progress'] } },
                { status: 'no_show', cancellation_reason: reason || 'No show' },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ status: false, message: 'Active booking not found' });
            }

            res.json({ status: true, data: booking, message: 'Marked as no-show' });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ============================================
    // REVIEWS
    // ============================================

    /**
     * Submit review
     */
    async submitReview(req, res) {
        try {
            const { bookingId } = req.params;
            const { rating, review } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ status: false, message: 'Rating must be between 1 and 5' });
            }

            const booking = await Booking.findOneAndUpdate(
                { booking_id: bookingId, status: 'completed' },
                { rating, review, updated_at: new Date() },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ status: false, message: 'Completed booking not found' });
            }

            res.json({ status: true, data: booking, message: 'Review submitted! ⭐' });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get review for booking
     */
    async getReview(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOne({ booking_id: bookingId });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found' });
            }

            res.json({
                status: true,
                data: {
                    booking_id: bookingId,
                    rating: booking.rating,
                    review: booking.review
                }
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ============================================
    // INVOICE
    // ============================================

    /**
     * Generate invoice
     */
    async generateInvoice(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOne({ booking_id: bookingId });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found' });
            }

            const invoice = {
                invoice_number: `INV-${booking.booking_id}`,
                booking_id: booking.booking_id,
                date: new Date().toISOString(),
                customer: {
                    name: booking.customer_name,
                    email: booking.customer_email,
                    phone: booking.customer_phone
                },
                service: {
                    name: booking.service_name,
                    provider: booking.provider_name,
                    date: booking.booking_date,
                    time: `${booking.start_time} - ${booking.end_time}`
                },
                pricing: {
                    base_price: booking.base_price,
                    discount: booking.discount,
                    tax: booking.tax_amount,
                    total: booking.total_amount
                },
                payment: {
                    method: booking.payment_method?.type || 'N/A',
                    status: booking.payment_status
                }
            };

            res.json({ status: true, data: invoice });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Send invoice via email
     */
    async sendInvoiceEmail(req, res) {
        try {
            const { bookingId } = req.params;
            const { email } = req.body;

            // In production, integrate with email service (SendGrid, SES, etc.)
            res.json({
                status: true,
                message: `Invoice sent to ${email || 'registered email'} successfully! 📧`
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ============================================
    // USER BOOKINGS
    // ============================================

    /**
     * Get user bookings
     */
    async getUserBookings(req, res) {
        try {
            const { customer_id, status, booking_type, page = 1, limit = 20 } = req.query;

            const query = {};
            if (customer_id) query.customer_id = customer_id;
            if (status) query.status = status;
            if (booking_type) query.booking_type = booking_type;

            const total = await Booking.countDocuments(query);
            const bookings = await Booking.find(query)
                .sort({ booking_date: -1, created_at: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .select('-__v');

            res.json({
                status: true,
                data: { bookings },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Get bookings error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get upcoming bookings
     */
    async getUpcomingBookings(req, res) {
        try {
            const { customer_id } = req.query;

            const bookings = await Booking.find({
                customer_id: customer_id || 'guest',
                status: { $in: ['confirmed', 'pending'] },
                start_time: { $gte: new Date() }
            }).sort({ start_time: 1 });

            res.json({ status: true, data: { bookings, total: bookings.length } });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get completed bookings
     */
    async getCompletedBookings(req, res) {
        try {
            const { customer_id } = req.query;

            const bookings = await Booking.find({
                customer_id: customer_id || 'guest',
                status: 'completed'
            }).sort({ booking_date: -1 }).limit(50);

            res.json({ status: true, data: { bookings, total: bookings.length } });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get user booking stats
     */
    async getUserBookingStats(req, res) {
        try {
            const { customer_id } = req.query;
            const cid = customer_id || 'guest';

            const total = await Booking.countDocuments({ customer_id: cid });
            const completed = await Booking.countDocuments({ customer_id: cid, status: 'completed' });
            const upcoming = await Booking.countDocuments({ customer_id: cid, status: { $in: ['confirmed', 'pending'] }, start_time: { $gte: new Date() } });
            const cancelled = await Booking.countDocuments({ customer_id: cid, status: 'cancelled' });

            const totalSpent = await Booking.aggregate([
                { $match: { customer_id: cid, status: { $in: ['completed', 'confirmed'] } } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);

            const avgRating = await Booking.aggregate([
                { $match: { customer_id: cid, rating: { $exists: true, $gt: 0 } } },
                { $group: { _id: null, avg: { $avg: '$rating' } } }
            ]);

            res.json({
                status: true,
                data: {
                    total_bookings: total,
                    completed_bookings: completed,
                    upcoming_bookings: upcoming,
                    cancelled_bookings: cancelled,
                    total_spent: totalSpent[0]?.total || 0,
                    average_rating: avgRating[0] ? Math.round(avgRating[0].avg * 10) / 10 : 0
                }
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get booking details
     */
    async getBookingDetails(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOne({ booking_id: bookingId });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found' });
            }

            res.json({ status: true, data: booking });
        } catch (error) {
            console.error('Get booking error:', error);
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    _getPolicyDescription(policy) {
        switch (policy) {
            case 'flexible': return 'Free cancellation up to 24 hours before service. 50% refund after.';
            case 'moderate': return 'Full refund 48hrs before. 75% refund 24hrs before. 25% after.';
            case 'strict': return '50% refund up to 72 hours before service. No refund after.';
            default: return 'Standard cancellation policy applies.';
        }
    }

    _getCancellationImplications(policy, hoursUntil) {
        const implications = [];
        if (hoursUntil < 2) implications.push('Less than 2 hours notice - refund may be affected');
        if (policy === 'strict' && hoursUntil < 72) implications.push('Strict policy - limited refund available');
        if (hoursUntil >= 24) implications.push('Cancel now for maximum refund');
        return implications;
    }
}

module.exports = new BookingController();