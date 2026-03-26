
const express = require('express');
const router = express.Router();
const { getCurrentTenant, createTenant } = require('../controllers/tenantController');
const { protect } = require('../middleware/auth');

router.get('/current-tenant', getCurrentTenant);
router.post('/tenants', protect, createTenant); // Admin only

module.exports = router;