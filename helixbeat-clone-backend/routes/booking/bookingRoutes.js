// routes/booking/bookingRoutes.js

const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/booking/bookingController');

// ============================================
// BOOKING CREATION
// ============================================
router.post('/instant', bookingController.createInstantBooking);
router.post('/schedule', bookingController.createScheduledBooking);
router.post('/recurring', bookingController.createRecurringBookings);
router.post('/group', bookingController.createGroupBooking);

// ============================================
// BOOKING MANAGEMENT
// ============================================
router.put('/:bookingId/reschedule', bookingController.rescheduleBooking);
router.get('/:bookingId/reschedule-check', bookingController.checkRescheduleEligibility);
router.post('/:bookingId/cancel', bookingController.cancelBooking);
router.get('/:bookingId/cancellation-preview', bookingController.previewCancellation);

// ============================================
// BOOKING ACTIONS
// ============================================
router.post('/:bookingId/confirm', bookingController.confirmBooking);
router.post('/:bookingId/start', bookingController.startService);
router.post('/:bookingId/complete', bookingController.completeService);
router.post('/:bookingId/no-show', bookingController.markAsNoShow);

// ============================================
// BOOKING REVIEWS
// ============================================
router.post('/:bookingId/review', bookingController.submitReview);
router.get('/:bookingId/review', bookingController.getReview);

// ============================================
// BOOKING INVOICE
// ============================================
router.get('/:bookingId/invoice', bookingController.generateInvoice);
router.post('/:bookingId/invoice/send-email', bookingController.sendInvoiceEmail);

// ============================================
// USER BOOKINGS
// ============================================
router.get('/my', bookingController.getUserBookings);
router.get('/my/upcoming', bookingController.getUpcomingBookings);
router.get('/my/completed', bookingController.getCompletedBookings);
router.get('/my/stats', bookingController.getUserBookingStats);

// ============================================
// BOOKING DETAILS (DYNAMIC - MUST BE LAST)
// ============================================
router.get('/:bookingId', bookingController.getBookingDetails);

module.exports = router;