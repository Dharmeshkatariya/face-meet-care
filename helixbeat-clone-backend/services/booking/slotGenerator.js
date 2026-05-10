// services/booking/slotGenerator.js

/**
 * Advanced Slot Generator
 * Generates realistic availability slots with demand patterns,
 * peak pricing, and intelligent slot management
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
        const holidayDates = (serviceConfig.holiday_dates || []).map(d => new Date(d).toISOString().split('T')[0]);
        const dayOfWeek = baseDate.getDay();

        // Skip off days
        if (offDays.includes(dayOfWeek)) return slots;

        // Skip holidays
        if (holidayDates.includes(baseDate.toISOString().split('T')[0])) return slots;

        // Skip past dates
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (baseDate < today) return slots;

        const totalSlotDuration = duration + buffer;
        const totalSlots = Math.floor(((workingEnd - workingStart) * 60) / totalSlotDuration);

        for (let i = 0; i < totalSlots; i++) {
            const startHour = workingStart + Math.floor((i * totalSlotDuration) / 60);
            const startMinute = (i * totalSlotDuration) % 60;

            const startTime = new Date(baseDate);
            startTime.setHours(startHour, startMinute, 0, 0);

            const endTime = new Date(baseDate);
            endTime.setHours(startHour, startMinute + duration, 0, 0);

            // Skip past slots for today
            if (baseDate.toDateString() === today.toDateString() && startTime < now) continue;

            // Skip if end time exceeds working hours
            if (endTime.getHours() > workingEnd ||
                (endTime.getHours() === workingEnd && endTime.getMinutes() > 0)) continue;

            const slotId = this._generateSlotId(baseDate, startHour, startMinute);

            // Count existing bookings for this slot
            const bookedCount = existingBookings.filter(b =>
                b.slot_id === slotId &&
                ['confirmed', 'in_progress', 'pending'].includes(b.status)
            ).length;

            const demandLevel = this._calculateDemandLevel(startHour, dayOfWeek);
            const pricing = this._calculatePricing(
                serviceConfig.base_price,
                startHour,
                dayOfWeek,
                serviceConfig.peak_hours || []
            );

            const isAvailable = bookedCount < maxBookings;
            const waitlistCount = !isAvailable ? existingBookings.filter(b =>
                b.slot_id === slotId && b.status === 'queued'
            ).length : null;

            slots.push({
                id: slotId,
                provider_id: serviceConfig.provider_id || serviceConfig.providers?.[0]?.provider_id || 'default',
                provider_name: serviceConfig.provider_name || serviceConfig.providers?.[0]?.provider_name || 'Provider',
                date: baseDate.toISOString(),
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: isAvailable ? 'available' : 'booked',
                demand_level: demandLevel,
                base_price: pricing.basePrice,
                peak_price: pricing.peakPrice,
                effective_price: pricing.effectivePrice,
                max_bookings: maxBookings,
                current_bookings: bookedCount,
                remaining_slots: maxBookings - bookedCount,
                waitlist_count: waitlistCount,
                max_waitlist: 10,
                is_recurring_available: true,
                is_quick_book_available: isAvailable && startHour >= workingStart + 1,
                timezone: 'Asia/Kolkata',
                last_updated: new Date().toISOString(),
                special_offer: this._getSpecialOffer(startHour, dayOfWeek, bookedCount, maxBookings, isAvailable)
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
            const slots = this.generateSlotsForDate(current, serviceConfig, dayBookings);
            if (slots.length > 0) {
                dates[dateKey] = slots;
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * Get best slots for a date (sorted by convenience)
     */
    getBestSlots(slots, preferredHour = null) {
        const available = slots.filter(s => s.status === 'available');

        return available.sort((a, b) => {
            // Prefer non-peak
            if (a.demand_level !== 'peak' && b.demand_level === 'peak') return -1;
            if (a.demand_level === 'peak' && b.demand_level !== 'peak') return 1;

            // Prefer lower price
            if (a.effective_price !== b.effective_price) {
                return a.effective_price - b.effective_price;
            }

            // Prefer closer to preferred time
            if (preferredHour !== null) {
                const aHour = new Date(a.start_time).getHours();
                const bHour = new Date(b.start_time).getHours();
                return Math.abs(aHour - preferredHour) - Math.abs(bHour - preferredHour);
            }

            // Earlier slots first
            return new Date(a.start_time) - new Date(b.start_time);
        });
    }

    /**
     * Get cheapest slots
     */
    getCheapestSlots(slots, count = 3) {
        return slots
            .filter(s => s.status === 'available')
            .sort((a, b) => a.effective_price - b.effective_price)
            .slice(0, count);
    }

    /**
     * Generate slot ID
     */
    _generateSlotId(baseDate, hour, minute) {
        const dateStr = baseDate.toISOString().split('T')[0];
        const timeStr = `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
        return `SLOT_${dateStr}_${timeStr}`;
    }

    /**
     * Calculate demand level based on time and day
     */
    _calculateDemandLevel(hour, dayOfWeek) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isWeekend) {
            if (hour >= 9 && hour <= 12) return 'peak';
            if (hour >= 16 && hour <= 19) return 'peak';
            return 'high';
        }

        // Weekday patterns
        if (hour >= 8 && hour <= 10) return 'peak';      // Morning rush
        if (hour >= 17 && hour <= 19) return 'peak';      // Evening rush
        if (hour >= 10 && hour <= 12) return 'high';      // Late morning
        if (hour >= 16 && hour < 17) return 'high';       // Pre-evening
        if (hour >= 13 && hour <= 15) return 'low';       // Afternoon lull
        if (hour >= 19 && hour <= 20) return 'low';       // Late evening

        return 'normal';
    }

    /**
     * Calculate pricing with peak surcharges
     */
    _calculatePricing(basePrice, hour, dayOfWeek, peakHoursConfig = []) {
        let surcharge = 0;
        let isPeak = false;
        let peakLabel = null;

        // Check custom peak hours first
        for (const peak of peakHoursConfig) {
            if (hour >= peak.start_hour && hour < peak.end_hour) {
                if (!peak.days || peak.days.length === 0 || peak.days.includes(dayOfWeek)) {
                    surcharge = peak.surcharge_percentage || 20;
                    isPeak = true;
                    peakLabel = peak.label || 'Peak Hours';
                    break;
                }
            }
        }

        // Default peak logic if no custom config matched
        if (!isPeak) {
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (isWeekend && (hour >= 9 && hour <= 12)) {
                surcharge = 25;
                isPeak = true;
                peakLabel = 'Weekend Morning';
            } else if (isWeekend && (hour >= 16 && hour <= 19)) {
                surcharge = 25;
                isPeak = true;
                peakLabel = 'Weekend Evening';
            } else if (hour >= 8 && hour <= 10) {
                surcharge = 15;
                isPeak = true;
                peakLabel = 'Morning Peak';
            } else if (hour >= 17 && hour <= 19) {
                surcharge = 20;
                isPeak = true;
                peakLabel = 'Evening Peak';
            }
        }

    const peakPrice = isPeak ? Math.round(basePrice * (1 + surcharge / 100)) : null;
      const effectivePrice = isPeak ? peakPrice : basePrice;

        return {
            basePrice,
            peakPrice,
         // ✅ Ensure effectivePrice is always a number
                 effectivePrice: effectivePrice ?? basePrice,

            surcharge_percentage: surcharge,
            isPeak,
            peakLabel
        };
    }

    /**
     * Get special offers based on demand patterns
     */
    _getSpecialOffer(hour, dayOfWeek, bookedCount, maxBookings, isAvailable) {
        if (!isAvailable) return null;

        // Happy Hour - weekday afternoons
        if (hour >= 13 && hour <= 15 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            return '🎉 Happy Hour - 15% OFF';
        }

        // Early Bird
        if (hour >= 8 && hour < 9 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            return '🌅 Early Bird - 10% OFF';
        }

        // Last minute booking
        const remaining = maxBookings - bookedCount;
        if (remaining === 1 && bookedCount > 0) {
            return '⚡ Last Slot Available!';
        }

        if (remaining === 2 && bookedCount > 0) {
            return '🔥 Filling Fast - Only 2 Left';
        }

        // Low demand incentive
        if (hour >= 14 && hour <= 15 && dayOfWeek >= 2 && dayOfWeek <= 4) {
            return '💎 Special Price';
        }

        // Weekend special
        if (dayOfWeek === 6 && hour >= 8 && hour <= 10) {
            return '🌟 Weekend Special';
        }

        return null;
    }
}

module.exports = new SlotGenerator();