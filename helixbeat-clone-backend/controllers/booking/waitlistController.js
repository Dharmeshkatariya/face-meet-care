// controllers/booking/waitlistController.js

const Booking = require('../../models/booking/Booking');
const bookingService = require('../../services/booking/bookingService');

class WaitlistController {

    /**
     * Join waitlist for a slot
     */
    async joinWaitlist(req, res) {
        try {
            const { service_id, slot_id, customer_id, customer_name, customer_phone, auto_confirm } = req.body;

            if (!service_id || !slot_id) {
                return res.status(400).json({ status: false, message: 'service_id and slot_id are required' });
            }

            const booking = await bookingService.joinWaitlist({
                service_id,
                slot_id,
                customer_id,
                customer_name,
                customer_phone,
                auto_confirm
            });

            res.status(201).json({
                status: true,
                data: booking,
                message: `Added to waitlist. Position: ${booking.waitlist_position}`
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get waitlist status for a booking
     */
    async getWaitlistStatus(req, res) {
        try {
            const { bookingId } = req.params;
            const status = await bookingService.getWaitlistStatus(bookingId);
            res.json({ status: true, data: status });
        } catch (error) {
            res.status(404).json({ status: false, message: error.message });
        }
    }

    /**
     * Leave waitlist
     */
    async leaveWaitlist(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findOneAndUpdate(
                { booking_id: bookingId, status: 'queued' },
                {
                    status: 'cancelled',
                    cancelled_at: new Date(),
                    cancellation_reason: 'Left waitlist voluntarily'
                },
                { new: true }
            );

            if (!booking) {
                return res.status(404).json({ status: false, message: 'Waitlist entry not found' });
            }

            res.json({
                status: true,
                data: { success: true, booking_id: bookingId },
                message: 'Successfully removed from waitlist'
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get waitlist summary statistics
     */
    async getWaitlistSummary(req, res) {
        try {
            const { date } = req.query;
            const queryDate = date ? new Date(date) : new Date();
            const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

            const totalWaitlisted = await Booking.countDocuments({
                status: 'queued',
                created_at: { $gte: startOfDay, $lte: endOfDay }
            });

            const confirmedFromWaitlist = await Booking.countDocuments({
                status: 'confirmed',
                waitlist_position: { $exists: true, $gt: 0 },
                updated_at: { $gte: startOfDay, $lte: endOfDay }
            });

            const avgWaitTime = await Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'cancelled'] }, waitlist_position: { $exists: true, $gt: 0 } } },
                { $group: { _id: null, avgWaitMinutes: { $avg: { $subtract: ['$updated_at', '$created_at'] } } } }
            ]);

            res.json({
                status: true,
                data: {
                    date: startOfDay.toISOString().split('T')[0],
                    total_waitlisted: totalWaitlisted,
                    confirmed_from_waitlist: confirmedFromWaitlist,
                    avg_wait_minutes: avgWaitTime[0] ? Math.round(avgWaitTime[0].avgWaitMinutes / 60000) : 0
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get waitlist count for a specific slot
     */
    async getSlotWaitlistCount(req, res) {
        try {
            const { slotId } = req.params;
            const count = await Booking.countDocuments({ slot_id: slotId, status: 'queued' });
            res.json({ status: true, data: { slot_id: slotId, waitlist_count: count } });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Auto-assign slot to next person in waitlist
     */
    async autoAssignFromWaitlist(req, res) {
        try {
            const { slot_id, service_id } = req.body;

            // Find next person in waitlist
            const nextInLine = await Booking.findOne({
                slot_id,
                service_id,
                status: 'queued'
            }).sort({ waitlist_position: 1 });

            if (!nextInLine) {
                return res.json({ status: true, data: { assigned: false, message: 'No one in waitlist' } });
            }

            // Update to confirmed
            nextInLine.status = 'confirmed';
            nextInLine.waitlist_position = 0;
            await nextInLine.save();

            // Update positions for remaining waitlisted
            await Booking.updateMany(
                { slot_id, status: 'queued', waitlist_position: { $gt: nextInLine.waitlist_position } },
                { $inc: { waitlist_position: -1 } }
            );

            res.json({
                status: true,
                data: {
                    assigned: true,
                    booking_id: nextInLine.booking_id,
                    customer_name: nextInLine.customer_name
                },
                message: `Slot assigned to ${nextInLine.customer_name}`
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }
}

module.exports = new WaitlistController();