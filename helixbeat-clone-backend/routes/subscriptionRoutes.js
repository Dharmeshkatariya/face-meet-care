@"
const express = require('express');
const router = express.Router();
const { getSubscriptions, createSubscription } = require('../controllers/subscriptionController');
const { protect, setTenant } = require('../middleware/auth');

router.get('/tenant-subscriptions', protect, setTenant, getSubscriptions);
router.post('/subscriptions', protect, createSubscription);

module.exports = router;
"@ | Out-File -FilePath routes/subscriptionRoutes.js -Encoding utf8