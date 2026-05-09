// controllers/bookingController.js

const bookingService = require('../services/bookingService');

class BookingController {
    // ========== AVAILABILITY ==========

    async getAvailability(req, res) {
        try {
            const result = await bookingService.getAvailability(req.query);
            res.json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async getRealTimeAvailability(req, res) {
        try {
            const result = await bookingService.getRealTimeAvailability(req.query);
            res.json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async getCalendarAvailability(req, res) {
        try {
            const result = await bookingService.getCalendarAvailability(req.query);
            res.json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    // ========== BOOKING CREATION ==========

    async createInstantBooking(req, res) {
        try {
            const booking = await bookingService.createInstantBooking(req.body);
            res.status(201).json({ status: true, data: booking });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async createScheduledBooking(req, res) {
        try {
            const booking = await bookingService.createScheduledBooking(req.body);
            res.status(201).json({ status: true, data: booking });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async createRecurringBookings(req, res) {
        try {
            const result = await bookingService.createRecurringBookings(req.body);
            res.status(201).json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async createGroupBooking(req, res) {
        try {
            const result = await bookingService.createGroupBooking(req.body);
            res.status(201).json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    // ========== QUEUE/WAITLIST ==========

    async joinWaitlist(req, res) {
        try {
            const booking = await bookingService.joinWaitlist(req.body);
            res.status(201).json({ status: true, data: booking });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async getWaitlistStatus(req, res) {
        try {
            const status = await bookingService.getWaitlistStatus(req.params.bookingId);
            res.json({ status: true, data: status });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async leaveWaitlist(req, res) {
        try {
            const result = await bookingService.leaveWaitlist(req.params.bookingId);
            res.json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    // ========== BOOKING MANAGEMENT ==========

    async rescheduleBooking(req, res) {
        try {
            const booking = await bookingService.rescheduleBooking(req.params.bookingId, req.body);
            res.json({ status: true, data: booking });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async checkRescheduleEligibility(req, res) {
        try {
            const eligibility = await bookingService.checkRescheduleEligibility(req.params.bookingId);
            res.json({ status: true, data: eligibility });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async cancelBooking(req, res) {
        try {
            const booking = await bookingService.cancelBooking(req.params.bookingId, req.body);
            res.json({ status: true, data: booking });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async previewCancellation(req, res) {
        try {
            const preview = await bookingService.previewCancellation(req.params.bookingId);
            res.json({ status: true, data: preview });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    // ========== USER BOOKINGS ==========

    async getMyBookings(req, res) {
        try {
            const bookings = await bookingService.getMyBookings(req.query);
            res.json({ status: true, data: { bookings } });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    async getBookingDetails(req, res) {
        try {
            const booking = await bookingService.getBookingDetails(req.params.bookingId);
            res.json({ status: true, data: booking });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    // ========== COUPON ==========

    async validateCoupon(req, res) {
        try {
            const result = await bookingService.validateCoupon(req.body);
            res.json({ status: true, data: result });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    // ========== PRICE ==========

    calculatePrice(req, res) {
        try {
            const { base_price, ...options } = req.body;
            const breakdown = bookingService.calculatePrice(base_price, options);
            res.json({ status: true, data: breakdown });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }
}

module.exports = new BookingController();