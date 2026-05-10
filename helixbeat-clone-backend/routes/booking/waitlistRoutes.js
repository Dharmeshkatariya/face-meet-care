// routes/booking/waitlistRoutes.js

const express = require('express');
const router = express.Router();
const waitlistController = require('../../controllers/booking/waitlistController');

// Waitlist CRUD
router.post('/join', waitlistController.joinWaitlist);
router.get('/:bookingId/status', waitlistController.getWaitlistStatus);
router.post('/:bookingId/leave', waitlistController.leaveWaitlist);

// Waitlist analytics
router.get('/stats/summary', waitlistController.getWaitlistSummary);
router.get('/slot/:slotId/count', waitlistController.getSlotWaitlistCount);
router.post('/auto-assign', waitlistController.autoAssignFromWaitlist);

module.exports = router;