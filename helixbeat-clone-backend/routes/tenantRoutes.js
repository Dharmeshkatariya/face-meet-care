const express = require('express');
const router = express.Router();

// Get tenant info
router.get('/', (req, res) => {
    res.json({
        status: true,
        message: 'Tenant routes working'
    });
});

// Get tenant by ID
router.get('/:id', (req, res) => {
    res.json({
        status: true,
        message: 'Get tenant by ID',
        id: req.params.id
    });
});

module.exports = router;