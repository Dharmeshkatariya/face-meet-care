const express = require('express');
const router = express.Router();

// Get all states
router.get('/', (req, res) => {
    res.json({ 
        status: true, 
        message: 'State routes working',
        data: []
    });
});

// Get state by ID
router.get('/:id', (req, res) => {
    res.json({ 
        status: true, 
        message: 'Get state by ID',
        id: req.params.id
    });
});

module.exports = router;