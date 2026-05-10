const SlotGenerator = require('./slotGenerator');
const Service = require('../../models/booking/Service');
const Booking = require('../../models/booking/Booking');

class AvailabilityService {
    /**
     * Get availability for a single date
     */
    async getAvailability({ service_id, date, provider_id }) {
        const service = await Service.findOne({ service_id, is_active: true });
        if (!service) throw new Error('Service not found');

        const existingBookings = await Booking.find({
            service_id,
            booking_date: {
                $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
            },
            status: { $in: ['confirmed', 'in_progress', 'pending'] }
        });

        const serviceConfig = {
            ...service.toObject(),
            provider_id: provider_id || service.providers[0]?.provider_id,
            provider_name: provider_id
                ? service.providers.find(p => p.provider_id === provider_id)?.provider_name
                : service.providers[0]?.provider_name
        };

        const slots = SlotGenerator.generateSlotsForDate(date, serviceConfig, existingBookings);

        return { service_id, date, provider_id, slots, total_slots: slots.length };
    }

    /**
     * Get real-time availability (live updates)
     */
    async getRealTimeAvailability({ service_id, date, provider_id }) {
        const result = await this.getAvailability({ service_id, date, provider_id });
        result.slots = result.slots.map(slot => ({
            ...slot,
            last_updated: new Date().toISOString(),
            is_live: true
        }));
        result.generated_at = new Date().toISOString();
        return result;
    }

    /**
     * Get calendar availability for date range
     */
    async getCalendarAvailability({ service_id, start_date, end_date, provider_id }) {
        const service = await Service.findOne({ service_id, is_active: true });
        if (!service) throw new Error('Service not found');

        const allBookings = await Booking.find({
            service_id,
            booking_date: {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            },
            status: { $in: ['confirmed', 'in_progress', 'pending'] }
        });

        const dates = SlotGenerator.generateCalendarAvailability(
            start_date, end_date, service.toObject(), allBookings
        );

        return { service_id, start_date, end_date, provider_id, dates };
    }

    /**
     * Get available slots count for statistics
     */
    async getAvailabilityStats({ service_id, date }) {
        const result = await this.getAvailability({ service_id, date });
        const available = result.slots.filter(s => s.status === 'available').length;
        const booked = result.slots.filter(s => s.status === 'booked').length;
        const peak = result.slots.filter(s => s.demand_level === 'peak').length;

        return {
            date: date || new Date().toISOString().split('T')[0],
            total_slots: result.slots.length,
            available_slots: available,
            booked_slots: booked,
            peak_slots: peak,
            availability_percentage: result.slots.length > 0 ? Math.round((available / result.slots.length) * 100) : 0
        };
    }
}

module.exports = new AvailabilityService();