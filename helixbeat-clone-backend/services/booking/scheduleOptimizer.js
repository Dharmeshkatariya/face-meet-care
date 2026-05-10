class ScheduleOptimizer {
    /**
     * Optimize schedule for group booking
     */
    static optimize(serviceRequests, preferredDate) {
        const schedule = [];
        let currentTime = new Date(preferredDate || Date.now());
        currentTime.setHours(9, 0, 0, 0);

        const sortedRequests = [...serviceRequests].sort((a, b) => {
            const durationA = a.duration_minutes || 60;
            const durationB = b.duration_minutes || 60;
            return durationB - durationA;
        });

        for (const request of sortedRequests) {
            const duration = request.duration_minutes || 60;
            const buffer = request.buffer_minutes || 15;
            const endTime = new Date(currentTime.getTime() + duration * 60000);

            schedule.push({
                ...request,
                start_time: currentTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_minutes: duration
            });

            currentTime = new Date(endTime.getTime() + buffer * 60000);

            // Skip lunch break
            if (currentTime.getHours() === 13 && currentTime.getMinutes() < 30) {
                currentTime.setHours(14, 0, 0, 0);
            }
        }

        return schedule;
    }
}

module.exports = ScheduleOptimizer;