// routes/providerRoutes.js
const express = require('express');
const router = express.Router();
const {
    getProviderByUserId,
    getAllProviders,
    createProvider
} = require('../controllers/providerController');

// Get all providers
router.get('/', getAllProviders);

// Get provider by user ID
router.get('/:userId', getProviderByUserId);

// Create provider
router.post('/', createProvider);

module.exports = router;