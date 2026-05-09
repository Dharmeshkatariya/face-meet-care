// utils/bookingUtils.js

/**
 * Generate mock time slots for a given date
 */
const generateTimeSlots = (date, providerId = 'demo_provider', providerName = 'Demo Provider') => {
    const slots = [];
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    const dayOfWeek = baseDate.getDay();
    if (dayOfWeek === 0) return slots; // No slots on Sunday

    // Morning slots (8 AM - 12 PM)
    for (let hour = 8; hour < 12; hour++) {
        const status = hour === 10 ? 'booked' : 'available';
        slots.push(createSlot(baseDate, hour, providerId, providerName, status, 'peak'));
    }

    // Afternoon slots (12 PM - 4 PM)
    for (let hour = 12; hour < 16; hour++) {
        const status = hour === 14 ? 'blocked' : 'available';
        slots.push(createSlot(baseDate, hour, providerId, providerName, status, 'normal'));
    }

    // Evening slots (4 PM - 8 PM)
    for (let hour = 16; hour < 20; hour++) {
        const isPeak = hour >= 17 && hour <= 19;
        slots.push(createSlot(baseDate, hour, providerId, providerName, 'available', isPeak ? 'peak' : 'low'));
    }

    return slots;
};

/**
 * Create a single time slot
 */
const createSlot = (baseDate, hour, providerId, providerName, status, demandLevel) => {
    const startTime = new Date(baseDate.getTime() + hour * 3600000);
    const endTime = new Date(baseDate.getTime() + (hour + 1) * 3600000);
    const isPeak = demandLevel === 'peak';

    return {
        id: `slot_${baseDate.toISOString().split('T')[0]}_${hour}_${Math.random().toString(36).substr(2, 6)}`,
        provider_id: providerId,
        provider_name: providerName,
        date: baseDate.toISOString(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: status,
        demand_level: demandLevel,
        base_price: 499,
        peak_price: isPeak ? 699 : null,
        effective_price: isPeak ? 699 : 499,
        max_bookings: 3,
        current_bookings: status === 'booked' ? 3 : Math.floor(Math.random() * 2),
        waitlist_count: status === 'booked' ? Math.floor(Math.random() * 5) : null,
        max_waitlist: 10,
        is_recurring_available: !isPeak || hour < 18,
        is_quick_book_available: status === 'available',
        timezone: 'Asia/Kolkata',
        last_updated: new Date().toISOString(),
        special_offer: hour === 13 ? '10% OFF' : null
    };
};

/**
 * Generate calendar availability for a date range
 */
const generateCalendarAvailability = (startDate, endDate, providerId, providerName) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = {};

    let current = new Date(start);
    while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();

        if (dayOfWeek !== 0) {
            dates[dateKey] = generateTimeSlots(current, providerId, providerName);
        }
        current.setDate(current.getDate() + 1);
    }

    return dates;
};

/**
 * Generate mock booking data
 */
const generateBooking = (bookingData) => {
    const now = new Date();
    return {
        id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        service_id: bookingData.service_id || 'demo_service',
        service_name: bookingData.service_name || 'Demo Service',
        service_image: null,
        provider_id: bookingData.provider_id || 'demo_provider',
        provider_name: bookingData.provider_name || 'Demo Provider',
        provider_image: null,
        provider_rating: 4.5 + Math.random() * 0.5,
        customer_id: 'customer_001',
        customer_name: 'Demo Customer',
        booking_type: bookingData.booking_type || 'instant',
        status: 'confirmed',
        booking_date: bookingData.preferred_date || now.toISOString(),
        start_time: bookingData.preferred_start_time || new Date(now.getTime() + 3600000).toISOString(),
        end_time: bookingData.preferred_start_time
            ? new Date(new Date(bookingData.preferred_start_time).getTime() + 3600000).toISOString()
            : new Date(now.getTime() + 7200000).toISOString(),
        address_id: bookingData.address_id || 'addr_001',
        address: '123 Main St, Demo City',
        address_label: 'Home',
        base_price: 499,
        discount: bookingData.coupon_code ? 50 : null,
        tax_amount: 89.82,
        total_amount: 538.82,
        coupon_code: bookingData.coupon_code || null,
        coupon_discount: bookingData.coupon_code ? 50 : null,
        has_cancellation_insurance: bookingData.add_cancellation_insurance || false,
        cancellation_policy: 'moderate',
        reschedule_penalty_type: 'none',
        waitlist_position: null,
        total_waitlisted: null,
        recurring_group_id: null,
        group_booking_id: null,
        grouped_service_ids: null,
        preferences: null,
        notes: bookingData.notes || null,
        cancellation_reason: null,
        cancelled_at: null,
        refund_amount: null,
        rescheduled_from: null,
        rescheduled_to: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        reschedule_count: 0,
        max_reschedules: 3,
        reschedule_fee: null,
        is_priority: false,
        qr_code: null
    };
};

/**
 * Calculate price breakdown
 */
const calculatePrice = (basePrice, options = {}) => {
    const { discount_percentage = 0, coupon_discount = 0, add_insurance = false } = options;

    const discountAmount = basePrice * (discount_percentage / 100);
    const discountedPrice = basePrice - discountAmount - coupon_discount;
    const taxAmount = discountedPrice * 0.18; // 18% GST
    const insuranceCost = add_insurance ? basePrice * 0.05 : 0;
    const totalAmount = discountedPrice + taxAmount;
    const finalAmount = totalAmount + insuranceCost;

    return {
        base_price: basePrice,
        discount_amount: Math.round(discountAmount * 100) / 100,
        coupon_discount: coupon_discount,
        tax_amount: Math.round(taxAmount * 100) / 100,
        tax_percentage: 18,
        insurance_cost: Math.round(insuranceCost * 100) / 100,
        insurance_percentage: 5,
        total_amount: Math.round(totalAmount * 100) / 100,
        final_amount: Math.round(finalAmount * 100) / 100,
        savings: Math.round((discountAmount + coupon_discount) * 100) / 100
    };
};

module.exports = {
    generateTimeSlots,
    generateCalendarAvailability,
    generateBooking,
    calculatePrice,
    createSlot
};