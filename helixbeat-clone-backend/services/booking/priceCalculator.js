class PriceCalculator {
    static TAX_PERCENTAGE = 18;
    static INSURANCE_PERCENTAGE = 5;

    /**
     * Calculate full price breakdown
     */
    static calculate({ basePrice, discountPercentage = 0, couponCode, addInsurance = false, addons = [] }) {
        let discountAmount = basePrice * (discountPercentage / 100);
        let couponDiscount = 0;

        if (couponCode) {
            const coupon = this.validateCouponStatic(couponCode, basePrice);
            if (coupon.isValid) {
                couponDiscount = coupon.discountAmount;
            }
        }

        const addonsTotal = (addons || []).reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0);
        const totalDiscount = discountAmount + couponDiscount;
        const discountedPrice = basePrice + addonsTotal - totalDiscount;
        const taxAmount = Math.round(discountedPrice * (this.TAX_PERCENTAGE / 100) * 100) / 100;
        const insuranceCost = addInsurance ? Math.round(basePrice * (this.INSURANCE_PERCENTAGE / 100) * 100) / 100 : 0;
        const finalAmount = Math.round((discountedPrice + taxAmount + insuranceCost) * 100) / 100;

        return {
            basePrice,
            addonsTotal,
            discountAmount: Math.round(discountAmount * 100) / 100,
            couponDiscount: Math.round(couponDiscount * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            taxAmount,
            taxPercentage: this.TAX_PERCENTAGE,
            insuranceCost,
            finalAmount,
            savings: Math.round(totalDiscount * 100) / 100
        };
    }

    /**
     * Calculate refund amount
     */
    static calculateRefund(totalAmount, hoursUntilService, policy) {
        const refundRates = {
            flexible: { 24: 1.0, 0: 0.5 },
            moderate: { 48: 1.0, 24: 0.75, 0: 0.25 },
            strict: { 72: 0.5, 0: 0 }
        };

        const rates = refundRates[policy] || refundRates.moderate;
        const thresholds = Object.keys(rates).map(Number).sort((a, b) => b - a);

        for (const threshold of thresholds) {
            if (hoursUntilService >= threshold) {
                return Math.round(totalAmount * rates[threshold] * 100) / 100;
            }
        }
        return 0;
    }

    /**
     * Validate coupon code
     */
    static validateCouponStatic(code, bookingAmount) {
        const coupons = {
            'FIRST50': { discountPercentage: 50, maxDiscount: 200, minAmount: 200 },
            'SAVE20': { discountPercentage: 20, maxDiscount: 100, minAmount: 300 },
            'FLAT100': { discountAmount: 100, minAmount: 500 },
            'WELCOME30': { discountPercentage: 30, maxDiscount: 150, minAmount: 250 },
            'CLEAN15': { discountPercentage: 15, maxDiscount: 75, minAmount: 400 }
        };

        const coupon = coupons[code?.toUpperCase()];
        if (!coupon) return { code, isValid: false, errorMessage: 'Invalid coupon code' };
        if (bookingAmount < (coupon.minAmount || 0)) return { code, isValid: false, errorMessage: `Minimum booking amount: ₹${coupon.minAmount}` };

        let discountAmount = 0;
        if (coupon.discountPercentage) {
            discountAmount = Math.min(bookingAmount * (coupon.discountPercentage / 100), coupon.maxDiscount || Infinity);
        } else if (coupon.discountAmount) {
            discountAmount = coupon.discountAmount;
        }

        return {
            code,
            isValid: true,
            description: coupon.discountPercentage ? `${coupon.discountPercentage}% OFF` : `₹${coupon.discountAmount} OFF`,
            discountAmount: Math.round(discountAmount * 100) / 100,
            discountPercentage: coupon.discountPercentage || null,
            maxDiscount: coupon.maxDiscount || null,
            minBookingAmount: coupon.minAmount
        };
    }

    /**
     * Validate coupon (async version - for controller)
     */
    async validateCoupon(code, bookingAmount) {
        return PriceCalculator.validateCouponStatic(code, bookingAmount);
    }
}

module.exports = PriceCalculator;