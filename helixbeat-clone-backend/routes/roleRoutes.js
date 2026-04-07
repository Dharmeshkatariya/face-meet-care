@"
const express = require('express');
const router = express.Router();
const { getRolesPermissions, createRole } = require('../controllers/roleController');
const { protect, setTenant } = require('../middleware/auth');

router.get('/roles-permissions', protect, setTenant, getRolesPermissions);
router.post('/roles', protect, createRole);

module.exports = router;
"@ | Out-File -FilePath routes/roleRoutes.js -Encoding utf8