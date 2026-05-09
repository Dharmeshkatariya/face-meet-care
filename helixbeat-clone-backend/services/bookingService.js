// services/bookingService.js

const {
    generateTimeSlots,
    generateCalendarAvailability,
    generateBooking,
    calculatePrice
} = require('../utils/bookingUtils');

class BookingService {
    /**
     * Get availability for a single date
     */
    async getAvailability({ service_id, date, provider_id }) {
        const providerName = provider_id ? `Provider ${provider_id}` : 'Demo Provider';
        const pid = provider_id || 'demo_provider';
        const slots = generateTimeSlots(date, pid, providerName);

        return {
            service_id,
            date,
            provider_id: pid,
            slots
        };
    }

    /**
     * Get real-time availability
     */
    async getRealTimeAvailability({ service_id, date, provider_id }) {
        const result = await this.getAvailability({ service_id, date, provider_id });
        // Mark some slots differently for "real-time" effect
        result.slots = result.slots.map(slot => ({
            ...slot,
            last_updated: new Date().toISOString(),
            status: Math.random() > 0.2 ? slot.status : 'booked'
        }));
        return result;
    }

    /**
     * Get calendar availability for date range
     */
    async getCalendarAvailability({ service_id, start_date, end_date, provider_id }) {
        const providerName = provider_id ? `Provider ${provider_id}` : 'Demo Provider';
        const pid = provider_id || 'demo_provider';
        const dates = generateCalendarAvailability(start_date, end_date, pid, providerName);

        return {
            service_id,
            start_date,
            end_date,
            provider_id: pid,
            dates
        };
    }

    /**
     * Create instant booking
     */
    async createInstantBooking(bookingData) {
        const booking = generateBooking({
            ...bookingData,
            booking_type: 'instant'
        });

        return booking;
    }

    /**
     * Create scheduled booking
     */
    async createScheduledBooking(bookingData) {
        const booking = generateBooking({
            ...bookingData,
            booking_type: 'scheduled'
        });

        return booking;
    }

    /**
     * Create recurring booking
     */
    async createRecurringBookings(bookingData) {
        const groupId = `recurring_${Date.now()}`;
        const bookings = [];
        const totalBookings = bookingData.occurrences || 4;

        for (let i = 0; i < totalBookings; i++) {
            const bookingDate = new Date(bookingData.base_request?.preferred_date || new Date());
            bookingDate.setDate(bookingDate.getDate() + (i * 7)); // Weekly

            bookings.push(generateBooking({
                ...bookingData.base_request,
                booking_type: 'recurring',
                preferred_date: bookingDate.toISOString(),
                recurring_group_id: groupId
            }));
        }

        return {
            id: groupId,
            booking_ids: bookings.map(b => b.id),
            frequency: bookingData.frequency || 'weekly',
            total_savings: bookings.length * 50,
            total_bookings: totalBookings,
            completed_bookings: 0,
            next_booking: bookings[0].booking_date,
            status: 'active',
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create group booking
     */
    async createGroupBooking(bookingData) {
        const groupId = `group_${Date.now()}`;
        const serviceRequests = bookingData.service_requests || [];
        const bookings = [];

        let startTime = new Date(bookingData.preferred_date || new Date());
        startTime.setHours(9, 0, 0, 0);

        serviceRequests.forEach((req, index) => {
            const bookingStart = new Date(startTime.getTime() + (index * 2 * 3600000));
            bookings.push({
                booking_id: `gb_${Date.now()}_${index}`,
                service_name: req.service_name || `Service ${index + 1}`,
                provider_name: req.provider_name || `Provider ${index + 1}`,
                price: 499,
                start_time: bookingStart.toISOString(),
                end_time: new Date(bookingStart.getTime() + 3600000).toISOString(),
                status: 'pending'
            });
        });

        const totalPrice = bookings.reduce((sum, b) => sum + b.price, 0);
        const discount = Math.round(totalPrice * 0.15);

        return {
            group_id: groupId,
            bookings: bookings,
            total_original_price: totalPrice,
            total_discount: discount,
            total_amount: totalPrice - discount,
            optimized_duration_minutes: bookings.length * 60 + (bookings.length - 1) * 15,
            start_time: bookings[0]?.start_time,
            end_time: bookings[bookings.length - 1]?.end_time,
            warning: null,
            schedule: null
        };
    }

    /**
     * Join waitlist
     */
    async joinWaitlist({ service_id, slot_id }) {
        return generateBooking({
            service_id,
            slot_id,
            booking_type: 'queued',
            status: 'queued'
        });
    }

    /**
     * Get waitlist status
     */
    async getWaitlistStatus(bookingId) {
        return {
            booking_id: bookingId,
            position: Math.floor(Math.random() * 10) + 1,
            total_waitlisted: Math.floor(Math.random() * 20) + 5,
            estimated_wait_time: Math.floor(Math.random() * 60) + 15,
            is_auto_confirm_enabled: true,
            estimated_confirmation: new Date(Date.now() + 3600000).toISOString(),
            joined_at: new Date(Date.now() - 1800000).toISOString()
        };
    }

    /**
     * Leave waitlist
     */
    async leaveWaitlist(bookingId) {
        return { success: true, booking_id: bookingId };
    }

    /**
     * Reschedule booking
     */
    async rescheduleBooking(bookingId, { new_date, new_start_time }) {
        const booking = generateBooking({
            booking_date: new_date,
            preferred_start_time: new_start_time,
            status: 'rescheduled'
        });
        booking.rescheduled_from = new Date(Date.now() - 86400000).toISOString();
        booking.rescheduled_to = new Date(new_date).toISOString();
        booking.reschedule_count = 1;
        return booking;
    }

    /**
     * Check reschedule eligibility
     */
    async checkRescheduleEligibility(bookingId) {
        return {
            can_reschedule: true,
            times_rescheduled: Math.floor(Math.random() * 2),
            max_reschedules: 3,
            is_free_reschedule: true,
            reschedule_fee: null,
            penalty_description: null,
            free_reschedule_deadline: new Date(Date.now() + 86400000).toISOString(),
            available_dates: [
                new Date(Date.now() + 86400000).toISOString(),
                new Date(Date.now() + 172800000).toISOString()
            ]
        };
    }

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId, { reason, request_refund }) {
        const booking = generateBooking({ status: 'cancelled' });
        booking.cancellation_reason = reason;
        booking.cancelled_at = new Date().toISOString();
        booking.refund_amount = request_refund ? 489.82 : 0;
        return booking;
    }

    /**
     * Preview cancellation
     */
    async previewCancellation(bookingId) {
        return {
            booking_id: bookingId,
            can_cancel: true,
            refund_amount: 489.82,
            cancellation_fee: 49,
            insurance_payout: 0,
            policy_description: 'Free cancellation up to 24 hours before service',
            deadline: new Date(Date.now() + 86400000).toISOString()
        };
    }

    /**
     * Get user bookings
     */
    async getMyBookings(filters = {}) {
        const bookings = [];
        const statuses = ['confirmed', 'completed', 'pending', 'cancelled'];

        for (let i = 0; i < 8; i++) {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 30));

            bookings.push(generateBooking({
                service_name: ['Home Cleaning', 'Plumbing', 'Beauty Spa', 'Painting'][i % 4],
                preferred_date: bookingDate.toISOString(),
                status: filters.status || statuses[i % 4]
            }));
        }

        return bookings;
    }

    /**
     * Get booking details
     */
    async getBookingDetails(bookingId) {
        return generateBooking({ id: bookingId });
    }

    /**
     * Validate coupon
     */
    async validateCoupon({ code, booking_amount }) {
        const validCoupons = {
            'FIRST50': { discount_percentage: 50, max_discount: 200 },
            'SAVE20': { discount_percentage: 20, max_discount: 100 },
            'FLAT100': { discount_amount: 100 },
            'WELCOME': { discount_percentage: 30, max_discount: 150 }
        };

        const coupon = validCoupons[code.toUpperCase()];

        if (!coupon) {
            return {
                code,
                is_valid: false,
                error_message: 'Invalid coupon code'
            };
        }

        let discountAmount = 0;
        if (coupon.discount_percentage) {
            discountAmount = Math.min(
                booking_amount * (coupon.discount_percentage / 100),
                coupon.max_discount || Infinity
            );
        } else if (coupon.discount_amount) {
            discountAmount = coupon.discount_amount;
        }

        return {
            code,
            is_valid: true,
            description: `${coupon.discount_percentage || ''}${coupon.discount_percentage ? '%' : ''} OFF`,
            discount_amount: Math.round(discountAmount * 100) / 100,
            discount_percentage: coupon.discount_percentage || null,
            max_discount: coupon.max_discount || null,
            min_booking_amount: 100,
            expiry_date: new Date(Date.now() + 30 * 86400000).toISOString()
        };
    }

    /**
     * Calculate price
     */
    calculatePrice(basePrice, options) {
        return calculatePrice(basePrice, options);
    }
}

module.exports = new BookingService();