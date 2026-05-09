const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');

// ============================================
// STATIC ROUTES FIRST
// ============================================

// Availability
router.get('/availability', bookingController.getAvailability);
router.get('/availability/realtime', bookingController.getRealTimeAvailability);
router.get('/availability/calendar', bookingController.getCalendarAvailability);

// User bookings
router.get('/my', bookingController.getMyBookings);

// Booking creation
router.post('/instant', bookingController.createInstantBooking);
router.post('/schedule', bookingController.createScheduledBooking);
router.post('/recurring', bookingController.createRecurringBookings);
router.post('/group', bookingController.createGroupBooking);

// Waitlist
router.post('/waitlist/join', bookingController.joinWaitlist);

// Coupon
router.post('/coupons/validate', bookingController.validateCoupon);

// Pricing
router.post('/calculate-price', bookingController.calculatePrice);

// ============================================
// DYNAMIC ROUTES LAST
// ============================================

// Waitlist dynamic
router.get('/waitlist/:bookingId/status', bookingController.getWaitlistStatus);
router.post('/waitlist/:bookingId/leave', bookingController.leaveWaitlist);

// Reschedule
router.put('/:bookingId/reschedule', bookingController.rescheduleBooking);
router.get('/:bookingId/reschedule-check', bookingController.checkRescheduleEligibility);

// Cancellation
router.post('/:bookingId/cancel', bookingController.cancelBooking);
router.get('/:bookingId/cancellation-preview', bookingController.previewCancellation);

// Booking details
router.get('/:bookingId', bookingController.getBookingDetails);

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;