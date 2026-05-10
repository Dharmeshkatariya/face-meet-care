// routes/booking/serviceRoutes.js

const express = require('express');
const router = express.Router();
const serviceController = require('../../controllers/booking/serviceController');

// Service catalog
router.get('/', serviceController.getAllServices);
router.get('/categories', serviceController.getCategories);
router.get('/featured', serviceController.getFeaturedServices);
router.get('/popular', serviceController.getPopularServices);
router.get('/search', serviceController.searchServices);

// Service details
router.get('/:serviceId', serviceController.getServiceById);
router.get('/:serviceId/providers', serviceController.getServiceProviders);
router.get('/:serviceId/reviews', serviceController.getServiceReviews);
router.get('/:serviceId/faqs', serviceController.getServiceFAQs);

// Service pricing
router.get('/:serviceId/pricing', serviceController.getServicePricing);

module.exports = router;