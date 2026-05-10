// services/booking/availabilityService.js

const SlotGenerator = require('./slotGenerator');
const Service = require('../../models/booking/Service');
const Booking = require('../../models/booking/Booking');

class AvailabilityService {

    /**
     * Get availability for a single date
     */
    async getAvailability({ service_id, date, provider_id }) {
        const queryDate = date || new Date().toISOString().split('T')[0];

        // Try to find service in database
        let serviceConfig = {};
        try {
            const service = await Service.findOne({ service_id, is_active: true });
            if (service) {
                serviceConfig = service.toObject();
                if (provider_id) {
                    const provider = service.providers?.find(p => p.provider_id === provider_id);
                    serviceConfig.provider_id = provider_id;
                    serviceConfig.provider_name = provider?.provider_name || 'Provider';
                } else if (service.providers?.length > 0) {
                    serviceConfig.provider_id = service.providers[0].provider_id;
                    serviceConfig.provider_name = service.providers[0].provider_name;
                }
            }
        } catch (err) {
            // Use default config if DB fails
            serviceConfig = this._getDefaultServiceConfig(service_id, provider_id);
        }

        // Get existing bookings for this date
        let existingBookings = [];
        try {
            existingBookings = await Booking.find({
                service_id,
                booking_date: {
                    $gte: new Date(new Date(queryDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(queryDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ['confirmed', 'in_progress', 'pending'] }
            });
        } catch (err) {
            // Continue without bookings if DB fails
        }

        const slots = SlotGenerator.generateSlotsForDate(queryDate, serviceConfig, existingBookings);

        const availableCount = slots.filter(s => s.status === 'available').length;
        const bookedCount = slots.filter(s => s.status === 'booked').length;

        return {
            service_id,
            date: queryDate,
            provider_id: serviceConfig.provider_id,
            provider_name: serviceConfig.provider_name,
            slots,
            total_slots: slots.length,
            available_slots: availableCount,
            booked_slots: bookedCount,
            availability_percentage: slots.length > 0 ? Math.round((availableCount / slots.length) * 100) : 0,
            generated_at: new Date().toISOString()
        };
    }

    /**
     * Get real-time availability (live updates)
     */
    async getRealTimeAvailability({ service_id, date, provider_id }) {
        const result = await this.getAvailability({ service_id, date, provider_id });

        // Add live indicators
        result.slots = result.slots.map(slot => ({
            ...slot,
            last_updated: new Date().toISOString(),
            is_live: true,
            refresh_in_seconds: 30
        }));

        result.is_live = true;
        result.generated_at = new Date().toISOString();
        result.expires_at = new Date(Date.now() + 30000).toISOString(); // Expires in 30s

        return result;
    }

    /**
     * Get calendar availability for date range
     */
    async getCalendarAvailability({ service_id, start_date, end_date, provider_id }) {
        const startDate = start_date || new Date().toISOString().split('T')[0];
        const endDate = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let serviceConfig = {};
        try {
            const service = await Service.findOne({ service_id, is_active: true });
            if (service) {
                serviceConfig = service.toObject();
            }
        } catch (err) {
            serviceConfig = this._getDefaultServiceConfig(service_id, provider_id);
        }

        let allBookings = [];
        try {
            allBookings = await Booking.find({
                service_id,
                booking_date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status: { $in: ['confirmed', 'in_progress', 'pending'] }
            });
        } catch (err) {
            // Continue without bookings
        }

        const dates = SlotGenerator.generateCalendarAvailability(
            startDate, endDate, serviceConfig, allBookings
        );

        const totalSlots = Object.values(dates).reduce((sum, slots) => sum + slots.length, 0);
        const totalAvailable = Object.values(dates).reduce(
            (sum, slots) => sum + slots.filter(s => s.status === 'available').length, 0
        );
        const totalDays = Object.keys(dates).length;

        return {
            service_id,
            start_date: startDate,
            end_date: endDate,
            provider_id: serviceConfig.provider_id,
            dates,
            summary: {
                total_days: totalDays,
                total_slots: totalSlots,
                available_slots: totalAvailable,
                booked_slots: totalSlots - totalAvailable,
                availability_percentage: totalSlots > 0 ? Math.round((totalAvailable / totalSlots) * 100) : 0
            }
        };
    }

    /**
     * Get availability statistics
     */
    async getAvailabilityStats({ service_id, date }) {
        const result = await this.getAvailability({ service_id, date });

        const slots = result.slots;
        const available = slots.filter(s => s.status === 'available');
        const booked = slots.filter(s => s.status === 'booked');
        const peak = slots.filter(s => s.demand_level === 'peak');

        const prices = available.map(s => s.effective_price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

        return {
            date: date || new Date().toISOString().split('T')[0],
            total_slots: slots.length,
            available_slots: available.length,
            booked_slots: booked.length,
            peak_slots: peak.length,
            availability_percentage: slots.length > 0 ? Math.round((available.length / slots.length) * 100) : 0,
            pricing: {
                min: minPrice,
                max: maxPrice,
                average: avgPrice
            },
            demand_summary: {
                peak: slots.filter(s => s.demand_level === 'peak').length,
                high: slots.filter(s => s.demand_level === 'high').length,
                normal: slots.filter(s => s.demand_level === 'normal').length,
                low: slots.filter(s => s.demand_level === 'low').length
            },
            best_slots: SlotGenerator.getBestSlots(slots).slice(0, 3).map(s => ({
                id: s.id,
                time: new Date(s.start_time).toLocaleTimeString(),
                price: s.effective_price,
                demand: s.demand_level
            }))
        };
    }

    /**
     * Default service config for when DB is unavailable
     */
    _getDefaultServiceConfig(serviceId, providerId) {
        const serviceConfigs = {
            'cleaning_001': { base_price: 499, duration_minutes: 120, buffer_minutes: 15, max_bookings_per_slot: 3 },
            'plumbing_001': { base_price: 349, duration_minutes: 60, buffer_minutes: 15, max_bookings_per_slot: 2 },
            'beauty_001': { base_price: 599, duration_minutes: 90, buffer_minutes: 15, max_bookings_per_slot: 2 },
            'painting_001': { base_price: 1999, duration_minutes: 240, buffer_minutes: 30, max_bookings_per_slot: 1 },
            'electrical_001': { base_price: 399, duration_minutes: 60, buffer_minutes: 15, max_bookings_per_slot: 2 },
            'tutoring_001': { base_price: 899, duration_minutes: 120, buffer_minutes: 15, max_bookings_per_slot: 1 },
        };

        const config = serviceConfigs[serviceId] || { base_price: 499, duration_minutes: 60, buffer_minutes: 15, max_bookings_per_slot: 3 };

        return {
            ...config,
            provider_id: providerId || 'demo_provider',
            provider_name: 'Demo Provider',
            working_hours: { start: 8, end: 20 },
            off_days: [0], // Sunday off
            peak_hours: [
                { start_hour: 8, end_hour: 10, surcharge_percentage: 15, days: [1, 2, 3, 4, 5], label: 'Morning Peak' },
                { start_hour: 17, end_hour: 19, surcharge_percentage: 20, days: [1, 2, 3, 4, 5], label: 'Evening Peak' },
                { start_hour: 9, end_hour: 12, surcharge_percentage: 25, days: [0, 6], label: 'Weekend Peak' }
            ]
        };
    }
}

module.exports = new AvailabilityService();