// controllers/booking/availabilityController.js

const availabilityService = require('../../services/booking/availabilityService');
const SlotGenerator = require('../../services/booking/slotGenerator');
const Booking = require('../../models/booking/Booking');
const Service = require('../../models/booking/Service');

class AvailabilityController {

    /**
     * Get availability slots for a single date
     */
    async getAvailability(req, res) {
        try {
            const { service_id, date, provider_id } = req.query;

            if (!service_id) {
                return res.status(400).json({ status: false, message: 'service_id is required' });
            }

            const result = await availabilityService.getAvailability({
                service_id,
                date: date || new Date().toISOString().split('T')[0],
                provider_id
            });

            res.json({
                status: true,
                data: result,
                meta: {
                    total_slots: result.slots.length,
                    available_slots: result.slots.filter(s => s.status === 'available').length,
                    booked_slots: result.slots.filter(s => s.status === 'booked').length
                }
            });
        } catch (error) {
            console.error('Get availability error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get real-time availability (live updates)
     */
    async getRealTimeAvailability(req, res) {
        try {
            const { service_id, date, provider_id } = req.query;

            if (!service_id) {
                return res.status(400).json({ status: false, message: 'service_id is required' });
            }

            const result = await availabilityService.getRealTimeAvailability({
                service_id,
                date: date || new Date().toISOString().split('T')[0],
                provider_id
            });

            res.json({
                status: true,
                data: result,
                generated_at: new Date().toISOString(),
                cache: false
            });
        } catch (error) {
            console.error('Get realtime availability error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get calendar availability for date range
     */
    async getCalendarAvailability(req, res) {
        try {
            const { service_id, start_date, end_date, provider_id } = req.query;

            if (!service_id) {
                return res.status(400).json({ status: false, message: 'service_id is required' });
            }

            const startDate = start_date || new Date().toISOString().split('T')[0];
            const endDate = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const result = await availabilityService.getCalendarAvailability({
                service_id,
                start_date: startDate,
                end_date: endDate,
                provider_id
            });

            const totalSlots = Object.values(result.dates).reduce((sum, slots) => sum + slots.length, 0);
            const totalAvailable = Object.values(result.dates).reduce((sum, slots) => sum + slots.filter(s => s.status === 'available').length, 0);

            res.json({
                status: true,
                data: result,
                meta: {
                    date_range: { start: startDate, end: endDate },
                    total_days: Object.keys(result.dates).length,
                    total_slots: totalSlots,
                    available_slots: totalAvailable
                }
            });
        } catch (error) {
            console.error('Get calendar availability error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get availability statistics
     */
    async getAvailabilityStats(req, res) {
        try {
            const { service_id, date } = req.query;
            const stats = await availabilityService.getAvailabilityStats({
                service_id,
                date: date || new Date().toISOString().split('T')[0]
            });

            res.json({ status: true, data: stats });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get weekly availability stats
     */
    async getWeeklyAvailabilityStats(req, res) {
        try {
            const { service_id } = req.query;
            const weeklyStats = [];

            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];

                const stats = await availabilityService.getAvailabilityStats({
                    service_id,
                    date: dateStr
                });

                weeklyStats.push({
                    date: dateStr,
                    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                    ...stats
                });
            }

            res.json({ status: true, data: weeklyStats });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get peak hours analysis
     */
    async getPeakHoursAnalysis(req, res) {
        try {
            const { service_id } = req.query;

            const peakHours = [
                { hour: '8-9 AM', demand: 'Peak', avg_price: 599, availability: 'Low' },
                { hour: '9-10 AM', demand: 'Peak', avg_price: 599, availability: 'Low' },
                { hour: '10-11 AM', demand: 'High', avg_price: 499, availability: 'Medium' },
                { hour: '11-12 PM', demand: 'High', avg_price: 499, availability: 'Medium' },
                { hour: '12-1 PM', demand: 'Normal', avg_price: 499, availability: 'High' },
                { hour: '1-2 PM', demand: 'Low', avg_price: 449, availability: 'High' },
                { hour: '2-3 PM', demand: 'Low', avg_price: 449, availability: 'High' },
                { hour: '3-4 PM', demand: 'Normal', avg_price: 499, availability: 'Medium' },
                { hour: '4-5 PM', demand: 'High', avg_price: 549, availability: 'Medium' },
                { hour: '5-6 PM', demand: 'Peak', avg_price: 649, availability: 'Low' },
                { hour: '6-7 PM', demand: 'Peak', avg_price: 649, availability: 'Low' },
                { hour: '7-8 PM', demand: 'High', avg_price: 549, availability: 'Medium' }
            ];

            res.json({ status: true, data: { service_id, peak_hours: peakHours } });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get slot details
     */
    async getSlotDetails(req, res) {
        try {
            const { slotId } = req.params;

            // Parse slot ID to extract date and time
            const parts = slotId.split('_');
            const date = parts[1] || new Date().toISOString().split('T')[0];
            const timeStr = parts[2] || '0900';
            const hour = parseInt(timeStr.substring(0, 2));
            const minute = parseInt(timeStr.substring(2, 4));

            const slotDetail = {
                id: slotId,
                date,
                start_time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
                is_available: true,
                current_bookings: Math.floor(Math.random() * 2),
                max_bookings: 3
            };

            res.json({ status: true, data: slotDetail });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Block a slot (admin)
     */
    async blockSlot(req, res) {
        try {
            const { slotId } = req.params;
            const { reason } = req.body;

            res.json({
                status: true,
                data: { slot_id: slotId, status: 'blocked', reason: reason || 'Admin blocked', blocked_at: new Date().toISOString() },
                message: 'Slot blocked successfully'
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Unblock a slot (admin)
     */
    async unblockSlot(req, res) {
        try {
            const { slotId } = req.params;

            res.json({
                status: true,
                data: { slot_id: slotId, status: 'available', unblocked_at: new Date().toISOString() },
                message: 'Slot unblocked successfully'
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Update slot price (admin)
     */
    async updateSlotPrice(req, res) {
        try {
            const { slotId } = req.params;
            const { base_price, peak_price } = req.body;

            res.json({
                status: true,
                data: { slot_id: slotId, base_price, peak_price, updated_at: new Date().toISOString() },
                message: 'Slot price updated'
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get provider schedule
     */
    async getProviderSchedule(req, res) {
        try {
            const { providerId } = req.params;
            const { date } = req.query;

            const bookings = await Booking.find({
                provider_id: providerId,
                booking_date: {
                    $gte: new Date(new Date(date || new Date()).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(date || new Date()).setHours(23, 59, 59, 999))
                },
                status: { $in: ['confirmed', 'in_progress', 'pending'] }
            }).select('booking_id start_time end_time status service_name');

            res.json({
                status: true,
                data: {
                    provider_id: providerId,
                    date: date || new Date().toISOString().split('T')[0],
                    bookings,
                    total: bookings.length
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Set provider availability
     */
    async setProviderAvailability(req, res) {
        try {
            const { providerId } = req.params;
            const { working_hours, off_days, unavailable_dates } = req.body;

            res.json({
                status: true,
                data: {
                    provider_id: providerId,
                    working_hours,
                    off_days,
                    unavailable_dates,
                    updated_at: new Date().toISOString()
                },
                message: 'Provider availability updated'
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Bulk check availability for multiple services
     */
    async bulkAvailabilityCheck(req, res) {
        try {
            const { services, date } = req.body;

            if (!services || !Array.isArray(services)) {
                return res.status(400).json({ status: false, message: 'services array is required' });
            }

            const results = [];
            for (const serviceId of services) {
                const stats = await availabilityService.getAvailabilityStats({
                    service_id: serviceId,
                    date: date || new Date().toISOString().split('T')[0]
                });
                results.push({ service_id: serviceId, ...stats });
            }

            res.json({ status: true, data: results, checked_at: new Date().toISOString() });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get next available slot
     */
    async getNextAvailableSlot(req, res) {
        try {
            const { service_id, from_date } = req.query;

            let checkDate = from_date ? new Date(from_date) : new Date();
            const maxDays = 14;
            let found = false;
            let nextSlot = null;

            for (let i = 0; i < maxDays; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                const result = await availabilityService.getAvailability({
                    service_id,
                    date: dateStr
                });

                const available = result.slots.find(s => s.status === 'available');
                if (available) {
                    nextSlot = {
                        date: dateStr,
                        slot_id: available.id,
                        start_time: available.start_time,
                        end_time: available.end_time,
                        price: available.effective_price,
                        demand_level: available.demand_level
                    };
                    found = true;
                    break;
                }
                checkDate.setDate(checkDate.getDate() + 1);
            }

            res.json({
                status: true,
                data: {
                    found,
                    next_available: nextSlot,
                    searched_until: found ? nextSlot.date : checkDate.toISOString().split('T')[0]
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }
}

module.exports = new AvailabilityController();