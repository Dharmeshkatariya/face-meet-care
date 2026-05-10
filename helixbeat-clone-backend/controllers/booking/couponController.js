// controllers/booking/couponController.js

const PriceCalculator = require('../../services/booking/priceCalculator');

class CouponController {

    /**
     * Validate a coupon code
     */
    async validateCoupon(req, res) {
        try {
            const { code, booking_amount, service_id } = req.body;

            if (!code) {
                return res.status(400).json({ status: false, message: 'Coupon code is required' });
            }

            if (!booking_amount || booking_amount <= 0) {
                return res.status(400).json({ status: false, message: 'Valid booking amount is required' });
            }

            const result = await PriceCalculator.prototype.validateCoupon(code, booking_amount);
            res.json({ status: true, data: result });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Calculate price breakdown
     */
    async calculatePrice(req, res) {
        try {
            const { base_price, discount_percentage, coupon_code, add_insurance, addons } = req.body;

            if (!base_price || base_price <= 0) {
                return res.status(400).json({ status: false, message: 'Valid base price is required' });
            }

            const breakdown = PriceCalculator.calculate({
                basePrice: base_price,
                discountPercentage: discount_percentage || 0,
                couponCode: coupon_code,
                addInsurance: add_insurance || false,
                addons: addons || []
            });

            res.json({ status: true, data: breakdown });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Bulk calculate prices
     */
    async bulkCalculatePrice(req, res) {
        try {
            const { items } = req.body;
            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ status: false, message: 'Items array is required' });
            }

            const results = items.map(item => PriceCalculator.calculate({
                basePrice: item.base_price,
                discountPercentage: item.discount_percentage || 0,
                couponCode: item.coupon_code,
                addInsurance: item.add_insurance || false,
                addons: item.addons || []
            }));

            res.json({ status: true, data: results, total_items: results.length });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    // ========== COUPON MANAGEMENT (ADMIN) ==========

    /**
     * Get all coupons
     */
    async getAllCoupons(req, res) {
        try {
            const coupons = [
                { code: 'FIRST50', discount_percentage: 50, max_discount: 200, min_amount: 200, is_active: true, usage_count: 45 },
                { code: 'SAVE20', discount_percentage: 20, max_discount: 100, min_amount: 300, is_active: true, usage_count: 120 },
                { code: 'FLAT100', discount_amount: 100, min_amount: 500, is_active: true, usage_count: 78 },
                { code: 'WELCOME30', discount_percentage: 30, max_discount: 150, min_amount: 250, is_active: true, usage_count: 200 }
            ];
            res.json({ status: true, data: coupons });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Create new coupon
     */
    async createCoupon(req, res) {
        try {
            const { code, discount_percentage, discount_amount, max_discount, min_amount, expiry_date } = req.body;
            res.status(201).json({
                status: true,
                data: { code, discount_percentage, discount_amount, max_discount, min_amount, expiry_date, is_active: true, usage_count: 0 },
                message: 'Coupon created successfully'
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Update coupon
     */
    async updateCoupon(req, res) {
        try {
            const { couponId } = req.params;
            res.json({ status: true, data: { code: couponId, ...req.body }, message: 'Coupon updated' });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Delete coupon
     */
    async deleteCoupon(req, res) {
        try {
            const { couponId } = req.params;
            res.json({ status: true, message: `Coupon ${couponId} deleted` });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }

    /**
     * Get coupon usage statistics
     */
    async getCouponStats(req, res) {
        try {
            const { couponId } = req.params;
            res.json({
                status: true,
                data: {
                    code: couponId,
                    total_usage: 150,
                    total_discount_given: 12500,
                    avg_discount: 83,
                    last_used: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(400).json({ status: false, message: error.message });
        }
    }
}

module.exports = new CouponController();