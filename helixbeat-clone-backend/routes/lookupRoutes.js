const express = require('express');
const router = express.Router();

// Get all lookups
router.get('/', (req, res) => {
    res.json({ 
        status: true, 
        message: 'Lookup routes working',
        data: []
    });
});

// Get lookup by ID
router.get('/:id', (req, res) => {
    res.json({ 
        status: true, 
        message: 'Get lookup by ID',
        id: req.params.id
    });
});

// Create lookup
router.post('/', (req, res) => {
    res.json({ 
        status: true, 
        message: 'Create lookup',
        data: req.body
    });
});

module.exports = router;