// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const {
    uploadFile,
    uploadMultipleFiles,
    uploadBase64,
    getFileInfo,
    deleteFile
} = require('../controllers/uploadController');

// All upload routes require authentication
router.use(protect);

// Single file upload
router.post('/single', uploadSingle, uploadFile);

// Multiple files upload
router.post('/multiple', uploadMultiple, uploadMultipleFiles);

// Base64 upload (for camera)
router.post('/base64', uploadBase64);

// Get file info
router.get('/:fileId', getFileInfo);

// Delete file
router.delete('/:fileId', deleteFile);

module.exports = router;