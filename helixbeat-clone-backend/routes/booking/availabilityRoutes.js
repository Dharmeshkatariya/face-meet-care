// routes/booking/availabilityRoutes.js

const express = require('express');
const router = express.Router();
const availabilityController = require('../../controllers/booking/availabilityController');

// Single date availability
router.get('/', availabilityController.getAvailability);
router.get('/realtime', availabilityController.getRealTimeAvailability);

// Calendar range availability
router.get('/calendar', availabilityController.getCalendarAvailability);

// Availability statistics
router.get('/stats', availabilityController.getAvailabilityStats);
router.get('/stats/weekly', availabilityController.getWeeklyAvailabilityStats);
router.get('/stats/peak-hours', availabilityController.getPeakHoursAnalysis);

// Slot management
router.get('/slot/:slotId', availabilityController.getSlotDetails);
router.post('/slot/:slotId/block', availabilityController.blockSlot);
router.post('/slot/:slotId/unblock', availabilityController.unblockSlot);
router.post('/slot/:slotId/update-price', availabilityController.updateSlotPrice);

// Provider availability
router.get('/provider/:providerId/schedule', availabilityController.getProviderSchedule);
router.post('/provider/:providerId/set-availability', availabilityController.setProviderAvailability);

// Bulk operations
router.post('/bulk-check', availabilityController.bulkAvailabilityCheck);
router.get('/next-available', availabilityController.getNextAvailableSlot);

module.exports = router;