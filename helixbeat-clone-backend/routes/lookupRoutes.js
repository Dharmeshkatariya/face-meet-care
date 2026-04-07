@"
const express = require('express');
const router = express.Router();
const { getLookups, createLookup, updateLookup } = require('../controllers/lookupController');
const { protect, setTenant } = require('../middleware/auth');

router.get('/', protect, setTenant, getLookups);
router.post('/', protect, createLookup);
router.put('/:id', protect, updateLookup);

module.exports = router;
"@ | Out-File -FilePath routes/lookupRoutes.js -Encoding utf8