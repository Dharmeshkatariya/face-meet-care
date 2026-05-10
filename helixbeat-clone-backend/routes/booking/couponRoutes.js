// routes/booking/couponRoutes.js

const express = require('express');
const router = express.Router();
const couponController = require('../../controllers/booking/couponController');

// Coupon validation & pricing
router.post('/validate', couponController.validateCoupon);
router.post('/calculate-price', couponController.calculatePrice);

// Coupon management (admin)
router.get('/', couponController.getAllCoupons);
router.post('/', couponController.createCoupon);
router.put('/:couponId', couponController.updateCoupon);
router.delete('/:couponId', couponController.deleteCoupon);
router.get('/:couponId/stats', couponController.getCouponStats);

// Bulk pricing
router.post('/bulk-calculate', couponController.bulkCalculatePrice);

module.exports = router;