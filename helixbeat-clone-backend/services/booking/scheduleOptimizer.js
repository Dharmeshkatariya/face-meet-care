// services/booking/scheduleOptimizer.js

/**
 * Schedule Optimizer
 * Optimizes group booking schedules for minimum time and cost
 */
class ScheduleOptimizer {

    /**
     * Optimize schedule for group booking
     * Uses greedy algorithm to minimize gaps and travel time
     */
    static optimize(serviceRequests, preferredDate = null, options = {}) {
        const {
            minimizeGaps = true,
            considerPeakHours = true,
            maxDuration = 480, // 8 hours max
            lunchBreak = true
        } = options;

        if (!serviceRequests || serviceRequests.length === 0) return [];

        // Sort by duration (longest first) for better fitting
        const sortedRequests = [...serviceRequests].sort((a, b) => {
            const durationA = a.duration_minutes || 60;
            const durationB = b.duration_minutes || 60;
            return durationB - durationA;
        });

        const schedule = [];
        let currentTime = new Date(preferredDate || Date.now());

        // Start at 9 AM if no preferred time
        if (!preferredDate) {
            currentTime.setHours(9, 0, 0, 0);
        }

        // Set to next available working hour if before 8 AM
        if (currentTime.getHours() < 8) {
            currentTime.setHours(8, 0, 0, 0);
        }

        // Set to next day 8 AM if after 8 PM
        if (currentTime.getHours() >= 20) {
            currentTime.setDate(currentTime.getDate() + 1);
            currentTime.setHours(8, 0, 0, 0);
        }

        let totalScheduledMinutes = 0;

        for (let i = 0; i < sortedRequests.length; i++) {
            const request = sortedRequests[i];
            const duration = request.duration_minutes || 60;
            const buffer = request.buffer_minutes || 15;

            // Check if adding this service would exceed max duration
            if (totalScheduledMinutes + duration > maxDuration) {
                // Push to next day
                currentTime.setDate(currentTime.getDate() + 1);
                currentTime.setHours(8, 0, 0, 0);
                totalScheduledMinutes = 0;
            }

            // Skip lunch break (1 PM - 2 PM)
            if (lunchBreak && currentTime.getHours() === 13 && currentTime.getMinutes() < 30) {
                const potentialEnd = new Date(currentTime.getTime() + duration * 60000);
                if (potentialEnd.getHours() >= 14) {
                    currentTime.setHours(14, 0, 0, 0);
                }
            }

            // Avoid peak hours if possible
            if (considerPeakHours && i < sortedRequests.length - 1) {
                const startHour = currentTime.getHours();
                if (startHour >= 8 && startHour < 10) {
                    // Schedule shorter services in peak, longer after peak
                    if (duration <= 60) {
                        // Short service - OK for peak
                    } else {
                        // Move longer service after peak
                        currentTime.setHours(10, 0, 0, 0);
                    }
                }
            }

            const startTime = new Date(currentTime);
            const endTime = new Date(currentTime.getTime() + duration * 60000);

            schedule.push({
                service_id: request.service_id,
                service_name: request.service_name || `Service ${i + 1}`,
                provider_id: request.provider_id || 'default',
                provider_name: request.provider_name || 'Provider',
                base_price: request.base_price || request.price || 499,
                duration_minutes: duration,
                buffer_minutes: buffer,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                order: i + 1,
                is_peak: this._isPeakHour(startTime.getHours())
            });

            // Move to next slot
            currentTime = new Date(endTime.getTime() + buffer * 60000);
            totalScheduledMinutes += duration + buffer;

            // Check if crossed working hours
            if (currentTime.getHours() >= 20) {
                if (i < sortedRequests.length - 1) {
                    currentTime.setDate(currentTime.getDate() + 1);
                    currentTime.setHours(8, 0, 0, 0);
                    totalScheduledMinutes = 0;
                }
            }
        }

        return schedule;
    }

    /**
     * Calculate total duration of schedule
     */
    static calculateTotalDuration(schedule) {
        if (!schedule || schedule.length === 0) return 0;

        const firstStart = new Date(schedule[0].start_time);
        const lastEnd = new Date(schedule[schedule.length - 1].end_time);

        return Math.round((lastEnd - firstStart) / (1000 * 60)); // minutes
    }

    /**
     * Calculate total cost of schedule
     */
    static calculateTotalCost(schedule) {
        const total = schedule.reduce((sum, item) => sum + (item.base_price || 0), 0);
        const discount = PriceCalculator.calculateGroupDiscount(schedule.length, total);
        return {
            original: total,
            discount_percentage: discount.percentage,
            discount_amount: discount.amount,
            final: total - discount.amount
        };
    }

    /**
     * Get best time slots for a service
     */
    static getBestTimeSlots(availableSlots, preferences = {}) {
        const {
            preferredHour = 10,
            avoidPeak = true,
            maxPrice = Infinity,
            minRating = 0
        } = preferences;

        return availableSlots
            .filter(slot => {
                if (avoidPeak && slot.demand_level === 'peak') return false;
                if (slot.effective_price > maxPrice) return false;
                return true;
            })
            .sort((a, b) => {
                // Score each slot
                const scoreA = this._scoreSlot(a, preferredHour);
                const scoreB = this._scoreSlot(b, preferredHour);
                return scoreB - scoreA; // Higher score first
            });
    }

    /**
     * Check if hour is peak
     */
    static _isPeakHour(hour) {
        return (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
    }

    /**
     * Score a slot for sorting
     */
    static _scoreSlot(slot, preferredHour) {
        let score = 100;
        const slotHour = new Date(slot.start_time).getHours();

        // Penalize peak hours
        if (this._isPeakHour(slotHour)) score -= 30;

        // Prefer slots near preferred hour
        const hourDiff = Math.abs(slotHour - preferredHour);
        score -= hourDiff * 5;

        // Prefer lower price
        if (slot.effective_price && slot.base_price) {
            const priceRatio = slot.effective_price / slot.base_price;
            if (priceRatio > 1) score -= (priceRatio - 1) * 20;
        }

        // Prefer higher availability
        if (slot.remaining_slots) {
            score += slot.remaining_slots * 5;
        }

        // Bonus for special offers
        if (slot.special_offer) score += 15;

        return score;
    }

    /**
     * Generate time slots for optimization
     */
    static generateOptimizedSlots(date, durationMinutes, workingHours = { start: 8, end: 20 }) {
        const slots = [];
        const startHour = workingHours.start || 8;
        const endHour = workingHours.end || 20;
        const baseDate = new Date(date);
        baseDate.setHours(0, 0, 0, 0);

        for (let hour = startHour; hour < endHour; hour++) {
            const startTime = new Date(baseDate);
            startTime.setHours(hour, 0, 0, 0);
            const endTime = new Date(baseDate);
            endTime.setHours(hour, durationMinutes, 0, 0);

            if (endTime.getHours() > endHour) continue;
            if (endTime.getHours() === endHour && endTime.getMinutes() > 0) continue;

            slots.push({
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                hour,
                is_peak: this._isPeakHour(hour),
                duration_minutes: durationMinutes
            });
        }

        return slots;
    }

    /**
     * Find optimal start time for multiple services
     */
    static findOptimalStartTime(services, availableSlots, date) {
        const totalDuration = services.reduce((sum, s) => sum + (s.duration_minutes || 60) + (s.buffer_minutes || 15), 0);

        // Filter slots that can fit all services
        const validSlots = availableSlots.filter(slot => {
            const startHour = new Date(slot.start_time).getHours();
            const endHour = startHour + Math.ceil(totalDuration / 60);
            return endHour <= 20; // Must finish by 8 PM
        });

        if (validSlots.length === 0) return null;

        // Return best scored slot
        const bestSlots = this.getBestTimeSlots(validSlots, { avoidPeak: true });
        return bestSlots[0] || validSlots[0];
    }
}

module.exports = ScheduleOptimizer;