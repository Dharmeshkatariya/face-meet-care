const Booking = require('../../models/booking/Booking');
const Service = require('../../models/booking/Service');
const PriceCalculator = require('./priceCalculator');
const ScheduleOptimizer = require('./scheduleOptimizer');

class BookingService {
    /**
     * Create instant booking
     */
    async createInstantBooking(bookingData) {
        const service = await Service.findOne({ service_id: bookingData.service_id });
        if (!service) throw new Error('Service not found');

        const priceBreakdown = PriceCalculator.calculate({
            basePrice: service.base_price,
            couponCode: bookingData.coupon_code,
            addInsurance: bookingData.add_cancellation_insurance,
            addons: bookingData.addons
        });

        const startTime = new Date(bookingData.preferred_start_time || Date.now());
        const endTime = new Date(startTime.getTime() + (service.duration_minutes + (service.buffer_minutes || 15)) * 60000);

        const booking = new Booking({
            service_id: bookingData.service_id,
            service_name: service.name,
            provider_id: bookingData.provider_id || service.providers[0]?.provider_id,
            provider_name: bookingData.provider_name || service.providers[0]?.provider_name,
            customer_id: bookingData.customer_id || 'guest_' + Date.now(),
            customer_name: bookingData.customer_name || 'Guest User',
            customer_email: bookingData.customer_email,
            customer_phone: bookingData.customer_phone,
            booking_type: 'instant',
            status: 'confirmed',
            booking_date: startTime,
            start_time: startTime,
            end_time: endTime,
            slot_id: bookingData.slot_id,
            address: bookingData.address,
            address_label: bookingData.address_label,
            base_price: priceBreakdown.basePrice,
            discount: priceBreakdown.discountAmount,
            tax_amount: priceBreakdown.taxAmount,
            total_amount: priceBreakdown.finalAmount,
            coupon_code: bookingData.coupon_code,
            coupon_discount: priceBreakdown.couponDiscount,
            has_cancellation_insurance: bookingData.add_cancellation_insurance || false,
            addons: bookingData.addons || [],
            notes: bookingData.notes,
            preferences: bookingData.preferences,
            payment_method: bookingData.payment_method,
            payment_status: 'paid'
        });

        await booking.save();
        return booking;
    }

    /**
     * Create scheduled booking
     */
    async createScheduledBooking(bookingData) {
        bookingData.booking_type = 'scheduled';
        return this.createInstantBooking(bookingData);
    }

    /**
     * Create recurring bookings
     */
    async createRecurringBookings(bookingData) {
        const groupId = 'REC_' + Date.now();
        const bookings = [];
        const frequency = bookingData.frequency || 'weekly';
        const occurrences = bookingData.occurrences || 4;
        const startDate = new Date(bookingData.preferred_date || Date.now());

        for (let i = 0; i < occurrences; i++) {
            const bookingDate = new Date(startDate);
            switch (frequency) {
                case 'daily': bookingDate.setDate(bookingDate.getDate() + i); break;
                case 'weekly': bookingDate.setDate(bookingDate.getDate() + (i * 7)); break;
                case 'bi_weekly': bookingDate.setDate(bookingDate.getDate() + (i * 14)); break;
                case 'monthly': bookingDate.setMonth(bookingDate.getMonth() + i); break;
            }

            const booking = await this.createInstantBooking({
                ...bookingData,
                preferred_date: bookingDate.toISOString(),
                booking_type: 'recurring',
                recurring_group_id: groupId
            });
            bookings.push(booking);
        }

        const totalSavings = bookings.reduce((sum, b) => sum + (b.discount || 0) + (b.coupon_discount || 0), 0);

        return {
            id: groupId,
            booking_ids: bookings.map(b => b.booking_id),
            frequency,
            total_savings: totalSavings,
            total_bookings: bookings.length,
            completed_bookings: 0,
            next_booking: bookings[0]?.start_time,
            status: 'active',
            created_at: new Date().toISOString()
        };
    }

    /**
     * Create group booking
     */
    async createGroupBooking(bookingData) {
        const groupId = 'GRP_' + Date.now();
        const serviceRequests = bookingData.service_requests || [];
        const bookings = [];

        const optimizedSchedule = ScheduleOptimizer.optimize(serviceRequests, bookingData.preferred_date);

        for (const item of optimizedSchedule) {
            const booking = await this.createInstantBooking({
                ...item,
                group_booking_id: groupId,
                preferred_start_time: item.start_time,
                booking_type: 'group'
            });
            bookings.push({
                booking_id: booking.booking_id,
                service_name: booking.service_name,
                provider_name: booking.provider_name,
                price: booking.base_price,
                start_time: booking.start_time,
                end_time: booking.end_time,
                status: booking.status
            });
        }

        const totalOriginal = bookings.reduce((sum, b) => sum + b.price, 0);
        const totalDiscount = Math.round(totalOriginal * 0.15);
        const totalAmount = totalOriginal - totalDiscount;

        return {
            group_id: groupId,
            bookings,
            total_original_price: totalOriginal,
            total_discount: totalDiscount,
            total_amount: totalAmount,
            optimized_duration_minutes: optimizedSchedule.length * 60,
            start_time: optimizedSchedule[0]?.start_time,
            end_time: optimizedSchedule[optimizedSchedule.length - 1]?.end_time,
            savings_percentage: 15
        };
    }

    /**
     * Join waitlist
     */
    async joinWaitlist({ service_id, slot_id, customer_id, customer_name }) {
        const existingWaitlist = await Booking.countDocuments({
            slot_id,
            status: 'queued',
            booking_date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        const booking = new Booking({
            service_id,
            service_name: 'Waitlist Booking',
            provider_id: 'waitlist',
            provider_name: 'Auto Assign',
            customer_id: customer_id || 'guest_' + Date.now(),
            customer_name: customer_name || 'Guest',
            booking_type: 'instant',
            status: 'queued',
            booking_date: new Date(),
            start_time: new Date(),
            end_time: new Date(Date.now() + 3600000),
            slot_id,
            base_price: 0,
            total_amount: 0,
            waitlist_position: existingWaitlist + 1
        });

        await booking.save();
        return booking;
    }

    /**
     * Get waitlist status
     */
    async getWaitlistStatus(bookingId) {
        const booking = await Booking.findOne({ booking_id: bookingId });
        if (!booking) throw new Error('Booking not found');

        const position = await Booking.countDocuments({
            slot_id: booking.slot_id,
            status: 'queued',
            waitlist_position: { $lt: booking.waitlist_position },
            created_at: { $lt: booking.created_at }
        }) + 1;

        const totalWaitlisted = await Booking.countDocuments({
            slot_id: booking.slot_id,
            status: 'queued'
        });

        return {
            booking_id: bookingId,
            position,
            total_waitlisted: totalWaitlisted,
            estimated_wait_time: position * 15,
            is_auto_confirm_enabled: true,
            estimated_confirmation: new Date(Date.now() + position * 15 * 60000).toISOString(),
            joined_at: booking.created_at.toISOString()
        };
    }

    /**
     * Reschedule booking
     */
    async rescheduleBooking(bookingId, { new_date, new_start_time }) {
        const booking = await Booking.findOne({ booking_id: bookingId });
        if (!booking) throw new Error('Booking not found');
        if (booking.reschedule_count >= booking.max_reschedules) throw new Error('Maximum reschedules reached');

        const oldDate = booking.booking_date;
        booking.rescheduled_from = oldDate;
        booking.booking_date = new Date(new_date);
        booking.start_time = new Date(new_start_time);
        booking.status = 'rescheduled';
        booking.reschedule_count += 1;
        booking.reschedule_fee = booking.reschedule_count > 1 ? 50 : 0;

        await booking.save();
        return booking;
    }

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId, { reason, request_refund = true }) {
        const booking = await Booking.findOne({ booking_id: bookingId });
        if (!booking) throw new Error('Booking not found');

        booking.status = 'cancelled';
        booking.cancellation_reason = reason;
        booking.cancelled_at = new Date();

        if (request_refund) {
            const hoursUntilService = (new Date(booking.start_time) - new Date()) / (1000 * 60 * 60);
            if (booking.has_cancellation_insurance) {
                booking.refund_amount = booking.total_amount;
            } else {
                booking.refund_amount = PriceCalculator.calculateRefund(booking.total_amount, hoursUntilService, booking.cancellation_policy);
            }
        }

        await booking.save();
        return booking;
    }

    /**
     * Validate coupon
     */
    async validateCoupon(code, bookingAmount) {
        return PriceCalculator.validateCoupon(code, bookingAmount);
    }

    /**
     * Get user bookings
     */
    async getUserBookings(customerId, filters = {}) {
        const query = { customer_id: customerId };
        if (filters.status) query.status = filters.status;
        if (filters.booking_type) query.booking_type = filters.booking_type;

        return Booking.find(query)
            .sort({ booking_date: -1 })
            .limit(filters.limit || 50)
            .skip(filters.offset || 0);
    }

    /**
     * Get booking details
     */
    async getBookingDetails(bookingId) {
        return Booking.findOne({ booking_id: bookingId });
    }
}

module.exports = new BookingService();