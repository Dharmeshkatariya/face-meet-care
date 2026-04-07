@"
const express = require('express');
const router = express.Router();
const { getStates, createState } = require('../controllers/stateController');
const { protect, setTenant } = require('../middleware/auth');

router.get('/states', protect, setTenant, getStates);
router.post('/states', protect, createState);

module.exports = router;
"@ | Out-File -FilePath routes/stateRoutes.js -Encoding utf8