/**
 * Advanced Slot Generator
 * Generates realistic availability slots with demand patterns
 */

class SlotGenerator {
    constructor() {
        this.workingHours = { start: 8, end: 20 };
        this.slotDuration = 60; // minutes
        this.bufferMinutes = 15;
        this.maxBookingsPerSlot = 3;
    }

    /**
     * Generate slots for a single date
     */
    generateSlotsForDate(date, serviceConfig = {}, existingBookings = []) {
        const slots = [];
        const baseDate = new Date(date);
        baseDate.setHours(0, 0, 0, 0);

        const workingStart = serviceConfig.working_hours?.start || this.workingHours.start;
        const workingEnd = serviceConfig.working_hours?.end || this.workingHours.end;
        const duration = serviceConfig.duration_minutes || this.slotDuration;
        const buffer = serviceConfig.buffer_minutes || this.bufferMinutes;
        const maxBookings = serviceConfig.max_bookings_per_slot || this.maxBookingsPerSlot;
        const offDays = serviceConfig.off_days || [];
        const dayOfWeek = baseDate.getDay();

        // Skip off days
        if (offDays.includes(dayOfWeek)) return slots;

        // Skip past dates
        const now = new Date();
        if (baseDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return slots;

        const totalSlotDuration = duration + buffer;
        const totalSlots = Math.floor(((workingEnd - workingStart) * 60) / totalSlotDuration);

        for (let i = 0; i < totalSlots; i++) {
            const startHour = workingStart + Math.floor((i * totalSlotDuration) / 60);
            const startMinute = (i * totalSlotDuration) % 60;
            const endTime = new Date(baseDate);
            endTime.setHours(startHour, startMinute + duration + buffer, 0, 0);
            const startTime = new Date(baseDate);
            startTime.setHours(startHour, startMinute, 0, 0);

            // Skip past slots
            if (startTime < new Date()) continue;

            const slotId = `SLOT_${baseDate.toISOString().split('T')[0]}_${String(startHour).padStart(2, '0')}${String(startMinute).padStart(2, '0')}`;

            // Count existing bookings for this slot
            const bookedCount = existingBookings.filter(b =>
                b.slot_id === slotId &&
                ['confirmed', 'in_progress', 'pending'].includes(b.status)
            ).length;

            const demandLevel = this._calculateDemandLevel(startHour, dayOfWeek);
            const pricing = this._calculatePricing(serviceConfig.base_price, startHour, dayOfWeek, serviceConfig.peak_hours);

            slots.push({
                id: slotId,
                provider_id: serviceConfig.provider_id || 'default',
                provider_name: serviceConfig.provider_name || 'Provider',
                date: baseDate.toISOString(),
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: bookedCount >= maxBookings ? 'booked' : 'available',
                demand_level: demandLevel,
                base_price: pricing.basePrice,
                peak_price: pricing.peakPrice,
                effective_price: pricing.effectivePrice,
                max_bookings: maxBookings,
                current_bookings: bookedCount,
                waitlist_count: bookedCount >= maxBookings ? Math.floor(Math.random() * 5) : null,
                max_waitlist: 10,
                is_recurring_available: true,
                is_quick_book_available: bookedCount < maxBookings && startHour >= workingStart + 1,
                timezone: 'Asia/Kolkata',
                last_updated: new Date().toISOString(),
                special_offer: this._getSpecialOffer(startHour, dayOfWeek, bookedCount, maxBookings)
            });
        }

        return slots;
    }

    /**
     * Generate calendar availability for date range
     */
    generateCalendarAvailability(startDate, endDate, serviceConfig, allBookings = []) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = {};

        let current = new Date(start);
        while (current <= end) {
            const dateKey = current.toISOString().split('T')[0];
            const dayBookings = allBookings.filter(b =>
                new Date(b.booking_date).toISOString().split('T')[0] === dateKey
            );
            dates[dateKey] = this.generateSlotsForDate(current, serviceConfig, dayBookings);
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * Calculate demand level based on time and day
     */
    _calculateDemandLevel(hour, dayOfWeek) {
        // Weekend
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            if (hour >= 9 && hour <= 12) return 'peak';
            return 'high';
        }
        // Weekday peaks
        if (hour >= 8 && hour <= 10) return 'peak';
        if (hour >= 17 && hour <= 19) return 'peak';
        if (hour >= 13 && hour <= 15) return 'low';
        return 'normal';
    }

    /**
     * Calculate pricing with peak surcharges
     */
    _calculatePricing(basePrice, hour, dayOfWeek, peakHoursConfig = []) {
        let surcharge = 0;
        let isPeak = false;

        // Check custom peak hours
        for (const peak of peakHoursConfig) {
            if (hour >= peak.start_hour && hour < peak.end_hour) {
                if (!peak.days || peak.days.includes(dayOfWeek)) {
                    surcharge = peak.surcharge_percentage || 0;
                    isPeak = true;
                    break;
                }
            }
        }

        // Default peak logic
        if (!isPeak) {
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                surcharge = 20;
                isPeak = true;
            } else if (hour >= 8 && hour <= 10) {
                surcharge = 15;
                isPeak = true;
            } else if (hour >= 17 && hour <= 19) {
                surcharge = 20;
                isPeak = true;
            }
        }

        const peakPrice = isPeak ? Math.round(basePrice * (1 + surcharge / 100)) : null;
        const effectivePrice = isPeak ? peakPrice : basePrice;

        return { basePrice, peakPrice, effectivePrice, surcharge, isPeak };
    }

    /**
     * Get special offers
     */
    _getSpecialOffer(hour, dayOfWeek, bookedCount, maxBookings) {
        // Low demand slots get offers
        if (hour >= 13 && hour <= 15 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            return '15% OFF - Happy Hour';
        }
        if (bookedCount === 0 && hour >= 11 && hour <= 12) {
            return 'Early Bird 10% OFF';
        }
        if (maxBookings - bookedCount <= 2 && bookedCount > 0) {
            return 'Filling Fast!';
        }
        return null;
    }
}

module.exports = new SlotGenerator();