// services/booking/bookingService.js

const Booking = require('../../models/booking/Booking');
const Service = require('../../models/booking/Service');
const Coupon = require('../../models/booking/Coupon');
const Waitlist = require('../../models/booking/Waitlist');
const PriceCalculator = require('./priceCalculator');
const ScheduleOptimizer = require('./scheduleOptimizer');

class BookingService {

    /**
     * Create instant booking
     */
    async createInstantBooking(bookingData) {
        // Get service details
        let service;
        try {
            service = await Service.findOne({ service_id: bookingData.service_id });
        } catch (err) {
            service = null;
        }

        const basePrice = service?.base_price || bookingData.base_price || 499;
        const serviceName = service?.name || bookingData.service_name || 'Service';
        const providerName = bookingData.provider_name || service?.providers?.[0]?.provider_name || 'Provider';
        const providerId = bookingData.provider_id || service?.providers?.[0]?.provider_id || 'default';
        const durationMinutes = service?.duration_minutes || bookingData.duration_minutes || 60;
        const bufferMinutes = service?.buffer_minutes || 15;

        // Calculate price
        let couponDiscount = 0;
        let couponCode = null;

        if (bookingData.coupon_code) {
            try {
                const coupon = await Coupon.findValid(bookingData.coupon_code);
                if (coupon) {
                    const validation = coupon.isValid(basePrice);
                    if (validation.valid) {
                        couponDiscount = coupon.calculateDiscount(basePrice);
                        couponCode = coupon.code;
                        await coupon.recordUsage(
                            bookingData.customer_id || 'guest',
                            'pending',
                            couponDiscount
                        );
                    }
                }
            } catch (err) {
                // Continue without coupon if DB fails
            }
        }

        const priceBreakdown = PriceCalculator.calculate({
            basePrice,
            couponCode,
            addInsurance: bookingData.add_cancellation_insurance || false,
            addons: bookingData.addons || [],
            discountPercentage: bookingData.discount_percentage || 0
        });

        // Calculate times
        const startTime = bookingData.preferred_start_time
            ? new Date(bookingData.preferred_start_time)
            : new Date(Date.now() + 3600000);
        const endTime = new Date(startTime.getTime() + (durationMinutes + bufferMinutes) * 60000);
        const bookingDate = bookingData.preferred_date
            ? new Date(bookingData.preferred_date)
            : startTime;

        // Create booking
        const booking = new Booking({
            service_id: bookingData.service_id,
            service_name: serviceName,
            provider_id: providerId,
            provider_name: providerName,
            customer_id: bookingData.customer_id || 'guest_' + Date.now(),
            customer_name: bookingData.customer_name || 'Guest User',
            customer_email: bookingData.customer_email,
            customer_phone: bookingData.customer_phone,
            booking_type: bookingData.booking_type || 'instant',
            status: 'confirmed',
            booking_date: bookingDate,
            start_time: startTime,
            end_time: endTime,
            slot_id: bookingData.slot_id,
            duration_minutes: durationMinutes,
            buffer_minutes: bufferMinutes,
            address: bookingData.address || '',
            address_label: bookingData.address_label || 'home',
            latitude: bookingData.latitude,
            longitude: bookingData.longitude,
            base_price: priceBreakdown.basePrice,
            discount: priceBreakdown.discountAmount,
            tax_amount: priceBreakdown.taxAmount,
            total_amount: priceBreakdown.finalAmount,
            coupon_code: couponCode,
            coupon_discount: priceBreakdown.couponDiscount,
            has_cancellation_insurance: bookingData.add_cancellation_insurance || false,
            insurance_cost: priceBreakdown.insuranceCost,
            cancellation_policy: service?.default_cancellation_policy || 'moderate',
            addons: bookingData.addons || [],
            notes: bookingData.notes || '',
            special_instructions: bookingData.special_instructions,
            preferences: bookingData.preferences,
            payment_method: bookingData.payment_method,
            payment_status: 'paid',
            payment_date: new Date(),
            referral_code: bookingData.referral_code,
            source: bookingData.source || 'api',
            notification_preferences: bookingData.notification_preferences || { sms: true, email: true, push: true }
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
        const groupId = 'REC_' + Date.now().toString(36).toUpperCase();
        const bookings = [];
        const frequency = bookingData.frequency || 'weekly';
        const occurrences = Math.min(bookingData.occurrences || 4, 52);
        const startDate = new Date(bookingData.preferred_date || Date.now());
        const discountPerBooking = bookingData.discount_percentage ||
            (occurrences >= 10 ? 20 : occurrences >= 5 ? 15 : occurrences >= 3 ? 10 : 0);

        for (let i = 0; i < occurrences; i++) {
            const bookingDate = new Date(startDate);
            switch (frequency) {
                case 'daily':
                    bookingDate.setDate(bookingDate.getDate() + i);
                    break;
                case 'weekly':
                    bookingDate.setDate(bookingDate.getDate() + (i * 7));
                    break;
                case 'bi_weekly':
                    bookingDate.setDate(bookingDate.getDate() + (i * 14));
                    break;
                case 'monthly':
                    bookingDate.setMonth(bookingDate.getMonth() + i);
                    break;
                case 'quarterly':
                    bookingDate.setMonth(bookingDate.getMonth() + (i * 3));
                    break;
            }

            const booking = await this.createInstantBooking({
                ...bookingData,
                preferred_date: bookingDate.toISOString(),
                booking_type: 'recurring',
                recurring_group_id: groupId,
                discount_percentage: discountPerBooking
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
        const groupId = 'GRP_' + Date.now().toString(36).toUpperCase();
        const serviceRequests = bookingData.service_requests || [];

        if (serviceRequests.length < 2) {
            throw new Error('Group booking requires at least 2 services');
        }

        const optimizedSchedule = ScheduleOptimizer.optimize(
            serviceRequests,
            bookingData.preferred_date
        );

        const bookingResults = [];
        for (const item of optimizedSchedule) {
            const booking = await this.createInstantBooking({
                ...item,
                group_booking_id: groupId,
                preferred_start_time: item.start_time,
                booking_type: 'group',
                discount_percentage: 15 // Group discount
            });
            bookingResults.push({
                booking_id: booking.booking_id,
                service_name: booking.service_name,
                provider_name: booking.provider_name,
                price: booking.base_price,
                start_time: booking.start_time,
                end_time: booking.end_time,
                status: booking.status
            });
        }

        const totalOriginal = bookingResults.reduce((sum, b) => sum + b.price, 0);
        const totalDiscount = Math.round(totalOriginal * 0.15);
        const totalAmount = totalOriginal - totalDiscount;

        return {
            group_id: groupId,
            bookings: bookingResults,
            total_original_price: totalOriginal,
            total_discount: totalDiscount,
            total_amount: totalAmount,
            optimized_duration_minutes: ScheduleOptimizer.calculateTotalDuration(optimizedSchedule),
            start_time: optimizedSchedule[0]?.start_time,
            end_time: optimizedSchedule[optimizedSchedule.length - 1]?.end_time,
            savings_percentage: 15,
            total_services: optimizedSchedule.length
        };
    }

    /**
     * Join waitlist
     */
    async joinWaitlist({ service_id, slot_id, customer_id, customer_name, customer_phone, auto_confirm = false }) {
        const existingCount = await Waitlist.getCount(slot_id);
        const position = existingCount + 1;

        const waitlistEntry = new Waitlist({
            service_id,
            service_name: 'Service',
            slot_id,
            slot_date: new Date(),
            slot_time: '00:00',
            customer_id: customer_id || 'guest_' + Date.now(),
            customer_name: customer_name || 'Guest',
            customer_phone: customer_phone || '',
            position,
            total_waitlisted: position,
            is_auto_confirm: auto_confirm,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await waitlistEntry.save();

        // Also create a booking record for tracking
        const booking = await this.createInstantBooking({
            service_id,
            provider_id: 'waitlist',
            provider_name: 'Auto Assign',
            customer_id: waitlistEntry.customer_id,
            customer_name: waitlistEntry.customer_name,
            booking_type: 'instant',
            slot_id,
            status: 'queued',
            waitlist_position: position
        });

        waitlistEntry.booking_id = booking.booking_id;
        await waitlistEntry.save();

        return {
            ...booking.toObject(),
            waitlist_position: position,
            waitlist_entry_id: waitlistEntry.waitlist_id
        };
    }

    /**
     * Get waitlist status
     */
    async getWaitlistStatus(bookingId) {
        const booking = await Booking.findOne({ booking_id: bookingId });
        if (!booking) throw new Error('Booking not found');

        const waitlistEntry = await Waitlist.findOne({ booking_id: bookingId });
        if (!waitlistEntry) throw new Error('Waitlist entry not found');

        const totalWaitlisted = await Waitlist.getCount(booking.slot_id);

        return {
            booking_id: bookingId,
            position: waitlistEntry.position,
            total_waitlisted: totalWaitlisted,
            estimated_wait_time: waitlistEntry.getEstimatedWaitTime(),
            is_auto_confirm_enabled: waitlistEntry.is_auto_confirm,
            status: waitlistEntry.status,
            joined_at: waitlistEntry.created_at,
            expires_at: waitlistEntry.expires_at
        };
    }

    /**
     * Reschedule booking
     */
    async rescheduleBooking(bookingId, { new_date, new_start_time, new_slot_id }) {
        const booking = await Booking.findOne({ booking_id: bookingId });
        if (!booking) throw new Error('Booking not found');

        if (!booking.canReschedule()) {
            throw new Error('Booking cannot be rescheduled');
        }

        const oldDate = booking.booking_date;
        const oldTime = booking.start_time;

        booking.rescheduled_from = oldDate;
        booking.booking_date = new Date(new_date);
        booking.start_time = new Date(new_start_time);

        if (new_slot_id) booking.slot_id = new_slot_id;

        booking.status = 'rescheduled';
        booking.reschedule_count += 1;
        booking.reschedule_fee = booking.reschedule_count > 1 ? 50 : 0;

        booking.reschedule_history = booking.reschedule_history || [];
        booking.reschedule_history.push({
            from_date: oldDate,
            to_date: new Date(new_date),
            from_time: oldTime,
            to_time: new Date(new_start_time),
            fee_charged: booking.reschedule_fee,
            changed_at: new Date()
        });

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
        booking.cancellation_reason = reason || 'Cancelled by customer';
        booking.cancelled_at = new Date();
        booking.cancelled_by = 'customer';

        if (request_refund) {
            booking.refund_amount = booking.calculateEstimatedRefund();
            booking.refund_status = booking.refund_amount > 0 ? 'processing' : 'not_initiated';
        }

        await booking.save();

        // If booking had a slot, notify next in waitlist
        if (booking.slot_id) {
            try {
                const nextInLine = await Waitlist.getNextInLine(booking.slot_id);
                if (nextInLine && nextInLine.is_auto_confirm) {
                    await nextInLine.notify('all');
                }
            } catch (err) {
                // Non-critical: continue even if waitlist notification fails
            }
        }

        return booking;
    }

    /**
     * Get user bookings
     */
    async getUserBookings(customerId, filters = {}) {
        const query = { customer_id: customerId };
        if (filters.status) query.status = filters.status;
        if (filters.booking_type) query.booking_type = filters.booking_type;
        if (filters.service_id) query.service_id = filters.service_id;
        if (filters.from_date) {
            query.booking_date = { $gte: new Date(filters.from_date) };
        }
        if (filters.to_date) {
            query.booking_date = { ...query.booking_date, $lte: new Date(filters.to_date) };
        }

        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const sort = filters.sort || '-booking_date';

        const [bookings, total] = await Promise.all([
            Booking.find(query)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .select('-__v'),
            Booking.countDocuments(query)
        ]);

        return {
            bookings,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
                has_next: page * limit < total,
                has_prev: page > 1
            }
        };
    }

    /**
     * Get booking details
     */
    async getBookingDetails(bookingId) {
        const booking = await Booking.findOne({ booking_id: bookingId });
        if (!booking) throw new Error('Booking not found');
        return booking;
    }
}

module.exports = new BookingService();