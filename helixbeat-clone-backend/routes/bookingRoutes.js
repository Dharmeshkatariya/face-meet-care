// routes/bookingRoutes.js - Make sure this order is correct:

// Static routes FIRST
router.get('/availability', bookingController.getAvailability);
router.get('/availability/realtime', bookingController.getRealTimeAvailability);
router.get('/availability/calendar', bookingController.getCalendarAvailability);
router.get('/my', bookingController.getMyBookings);
router.post('/instant', bookingController.createInstantBooking);
router.post('/schedule', bookingController.createScheduledBooking);
router.post('/recurring', bookingController.createRecurringBookings);
router.post('/group', bookingController.createGroupBooking);
router.post('/waitlist/join', bookingController.joinWaitlist);
router.post('/coupons/validate', bookingController.validateCoupon);
router.post('/calculate-price', bookingController.calculatePrice);

// Dynamic routes LAST (with :bookingId)
router.get('/waitlist/:bookingId/status', bookingController.getWaitlistStatus);
router.post('/waitlist/:bookingId/leave', bookingController.leaveWaitlist);
router.put('/:bookingId/reschedule', bookingController.rescheduleBooking);
router.get('/:bookingId/reschedule-check', bookingController.checkRescheduleEligibility);
router.post('/:bookingId/cancel', bookingController.cancelBooking);
router.get('/:bookingId/cancellation-preview', bookingController.previewCancellation);
router.get('/:bookingId', bookingController.getBookingDetails);