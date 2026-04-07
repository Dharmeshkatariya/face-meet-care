const express = require('express');
const router = express.Router();

// Get all providers
router.get('/', (req, res) => {
    res.json({
        status: true,
        message: 'Provider routes working',
        data: []
    });
});

// Get provider by ID
router.get('/:id', (req, res) => {
    res.json({
        status: true,
        message: 'Get provider by ID',
        id: req.params.id
    });
});

module.exports = router;