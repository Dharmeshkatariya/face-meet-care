const express = require('express');
const router = express.Router();
const { getFeatureSwitches, createFeatureSwitch, updateFeatureSwitch } = require('../controllers/featureSwitchController');
const { protect, setTenant } = require('../middleware/auth');

router.get('/', setTenant, getFeatureSwitches);
router.post('/', protect, createFeatureSwitch);
router.put('/:id', protect, updateFeatureSwitch);

module.exports = router;