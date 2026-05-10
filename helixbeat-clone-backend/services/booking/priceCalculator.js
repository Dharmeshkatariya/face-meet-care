// services/booking/priceCalculator.js

class PriceCalculator {
    static TAX_PERCENTAGE = 18;
    static INSURANCE_PERCENTAGE = 5;
    static PLATFORM_FEE_PERCENTAGE = 0; // No platform fee currently

    /**
     * Calculate full price breakdown
     */
    static calculate({
        basePrice = 0,
        discountPercentage = 0,
        couponCode = null,
        addInsurance = false,
        addons = [],
        platformFee = 0,
        currency = 'INR'
    }) {
        // Calculate addons total
        const addonsTotal = (addons || []).reduce((sum, addon) => {
            return sum + ((addon.price || 0) * (addon.quantity || 1));
        }, 0);

        // Calculate subtotal
        const subtotal = basePrice + addonsTotal;

        // Calculate discount
        const discountAmount = Math.round(subtotal * (discountPercentage / 100) * 100) / 100;

        // Coupon discount (passed in from coupon validation)
        let couponDiscount = 0;
        if (couponCode && this._couponDiscounts[couponCode]) {
            couponDiscount = this._couponDiscounts[couponCode];
        }

        // Total discount
        const totalDiscount = discountAmount + couponDiscount;

        // Discounted price
        const discountedPrice = Math.max(subtotal - totalDiscount, 0);

        // Calculate tax
        const taxAmount = Math.round(discountedPrice * (this.TAX_PERCENTAGE / 100) * 100) / 100;

        // Platform fee
        const platformFeeAmount = platformFee || Math.round(subtotal * (this.PLATFORM_FEE_PERCENTAGE / 100) * 100) / 100;

        // Insurance
        const insuranceCost = addInsurance
            ? Math.round(basePrice * (this.INSURANCE_PERCENTAGE / 100) * 100) / 100
            : 0;

        // Final amount
        const finalAmount = Math.round((discountedPrice + taxAmount + platformFeeAmount + insuranceCost) * 100) / 100;

        return {
            basePrice: Math.round(basePrice * 100) / 100,
            addonsTotal: Math.round(addonsTotal * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            discountAmount,
            discountPercentage,
            couponDiscount: Math.round(couponDiscount * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            discountedPrice: Math.round(discountedPrice * 100) / 100,
            taxAmount,
            taxPercentage: this.TAX_PERCENTAGE,
            platformFee: platformFeeAmount,
            insuranceCost,
            insurancePercentage: addInsurance ? this.INSURANCE_PERCENTAGE : 0,
            finalAmount,
            savings: Math.round(totalDiscount * 100) / 100,
            currency,
            breakdown: {
                serviceCharge: basePrice,
                addons: addons.map(a => ({
                    name: a.name || 'Addon',
                    price: a.price || 0,
                    quantity: a.quantity || 1,
                    total: (a.price || 0) * (a.quantity || 1)
                })),
                discount: { percentage: discountPercentage, amount: discountAmount },
                coupon: { code: couponCode, amount: couponDiscount },
                tax: { percentage: this.TAX_PERCENTAGE, amount: taxAmount },
                insurance: addInsurance ? { percentage: this.INSURANCE_PERCENTAGE, cost: insuranceCost } : null,
                total: finalAmount
            }
        };
    }

    /**
     * Calculate refund amount based on cancellation policy
     */
    static calculateRefund(totalAmount, hoursUntilService, policy = 'moderate') {
        const refundRates = {
            flexible: [
                { hours: 24, rate: 1.0 },   // Full refund 24hrs+
                { hours: 0, rate: 0.50 }     // 50% refund after
            ],
            moderate: [
                { hours: 48, rate: 1.0 },    // Full refund 48hrs+
                { hours: 24, rate: 0.75 },   // 75% refund 24-48hrs
                { hours: 0, rate: 0.25 }     // 25% refund after
            ],
            strict: [
                { hours: 72, rate: 0.50 },   // 50% refund 72hrs+
                { hours: 0, rate: 0.0 }      // No refund after
            ]
        };

        const rates = refundRates[policy] || refundRates.moderate;
        const sortedRates = [...rates].sort((a, b) => b.hours - a.hours);

        for (const rate of sortedRates) {
            if (hoursUntilService >= rate.hours) {
                return Math.round(totalAmount * rate.rate * 100) / 100;
            }
        }

        return 0;
    }

    /**
     * Calculate peak pricing surcharge
     */
    static calculatePeakSurcharge(basePrice, hour, dayOfWeek) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Weekend peak
        if (isWeekend && hour >= 9 && hour <= 12) return { surcharge: 25, label: 'Weekend Morning Peak' };
        if (isWeekend && hour >= 16 && hour <= 19) return { surcharge: 25, label: 'Weekend Evening Peak' };

        // Weekday peak
        if (hour >= 8 && hour <= 10) return { surcharge: 15, label: 'Morning Peak' };
        if (hour >= 17 && hour <= 19) return { surcharge: 20, label: 'Evening Peak' };

        return { surcharge: 0, label: null };
    }

    /**
     * Calculate bulk discount for group bookings
     */
    static calculateGroupDiscount(totalServices, totalAmount) {
        if (totalServices >= 5) return { percentage: 25, amount: Math.round(totalAmount * 0.25 * 100) / 100 };
        if (totalServices >= 4) return { percentage: 20, amount: Math.round(totalAmount * 0.20 * 100) / 100 };
        if (totalServices >= 3) return { percentage: 15, amount: Math.round(totalAmount * 0.15 * 100) / 100 };
        if (totalServices >= 2) return { percentage: 10, amount: Math.round(totalAmount * 0.10 * 100) / 100 };
        return { percentage: 0, amount: 0 };
    }

    /**
     * Calculate recurring booking discount
     */
    static calculateRecurringDiscount(totalBookings) {
        if (totalBookings >= 20) return 25;
        if (totalBookings >= 10) return 20;
        if (totalBookings >= 5) return 15;
        if (totalBookings >= 3) return 10;
        if (totalBookings >= 2) return 5;
        return 0;
    }

    /**
     * Validate coupon code (static version)
     */
    static validateCouponStatic(code, bookingAmount) {
        const coupons = {
            'FIRST50': { type: 'percentage', value: 50, maxDiscount: 200, minAmount: 200, description: '50% OFF up to ₹200' },
            'SAVE20': { type: 'percentage', value: 20, maxDiscount: 100, minAmount: 300, description: '20% OFF up to ₹100' },
            'FLAT100': { type: 'fixed', value: 100, minAmount: 500, description: 'Flat ₹100 OFF' },
            'WELCOME30': { type: 'percentage', value: 30, maxDiscount: 150, minAmount: 250, description: '30% OFF up to ₹150' },
            'CLEAN15': { type: 'percentage', value: 15, maxDiscount: 75, minAmount: 400, description: '15% OFF on Cleaning' },
            'NEWUSER': { type: 'percentage', value: 40, maxDiscount: 200, minAmount: 300, description: '40% OFF for New Users' },
            'WEEKEND20': { type: 'percentage', value: 20, maxDiscount: 150, minAmount: 500, description: '20% OFF Weekend Special' },
            'FESTIVE50': { type: 'fixed', value: 50, minAmount: 200, description: 'Flat ₹50 OFF Festive Special' }
        };

        const code = (code || '').toUpperCase().trim();
        const coupon = coupons[code];

        if (!coupon) {
            return { code, isValid: false, errorMessage: 'Invalid coupon code. Please check and try again.' };
        }

        if (bookingAmount < coupon.minAmount) {
            return {
                code,
                isValid: false,
                errorMessage: `Minimum booking amount of ₹${coupon.minAmount} required. Add ₹${coupon.minAmount - bookingAmount} more.`
            };
        }

        let discountAmount = 0;
        if (coupon.type === 'percentage') {
            discountAmount = Math.min(
                bookingAmount * (coupon.value / 100),
                coupon.maxDiscount || Infinity
            );
        } else {
            discountAmount = Math.min(coupon.value, bookingAmount);
        }

        return {
            code,
            isValid: true,
            type: coupon.type,
            value: coupon.value,
            description: coupon.description,
            discountAmount: Math.round(discountAmount * 100) / 100,
            discountPercentage: coupon.type === 'percentage' ? coupon.value : null,
            maxDiscount: coupon.maxDiscount || null,
            minBookingAmount: coupon.minAmount,
            savings: Math.round(discountAmount * 100) / 100
        };
    }

    /**
     * Format price for display
     */
    static formatPrice(amount, currency = '₹') {
        if (amount === null || amount === undefined) return `${currency}0`;
        if (Number.isInteger(amount)) return `${currency}${amount.toLocaleString('en-IN')}`;
        return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /**
     * Format discount display
     */
    static formatDiscount(value, type = 'percentage') {
        if (type === 'percentage') return `${value}% OFF`;
        return `₹${value} OFF`;
    }

    // ========== PRIVATE ==========

    static _couponDiscounts = {};
}

module.exports = PriceCalculator;