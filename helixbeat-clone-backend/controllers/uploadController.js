// controllers/uploadController.js
const fs = require('fs').promises;
const path = require('path');
const { processImage, generateThumbnail } = require('../utils/imageProcessor');

// Single file upload
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                message: 'No file uploaded'
            });
        }

        const fileData = {
            id: req.file.filename.split('.')[0],
            originalName: req.file.originalname,
            fileName: req.file.filename,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadDate: new Date().toISOString(),
            url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        };

        // Process image if it's an image file
        if (req.file.mimetype.startsWith('image/')) {
            const thumbnailPath = `uploads/thumbnails/${req.file.filename}`;
            await generateThumbnail(req.file.path, thumbnailPath);
            fileData.thumbnailUrl = `${req.protocol}://${req.get('host')}/uploads/thumbnails/${req.file.filename}`;
        }

        res.json({
            status: true,
            message: 'File uploaded successfully',
            data: fileData
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            status: false,
            message: 'File upload failed',
            error: error.message
        });
    }
};

// Multiple files upload
exports.uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'No files uploaded'
            });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            const fileData = {
                id: file.filename.split('.')[0],
                originalName: file.originalname,
                fileName: file.filename,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadDate: new Date().toISOString(),
                url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
            };

            // Process image if it's an image file
            if (file.mimetype.startsWith('image/')) {
                const thumbnailPath = `uploads/thumbnails/${file.filename}`;
                await generateThumbnail(file.path, thumbnailPath);
                fileData.thumbnailUrl = `${req.protocol}://${req.get('host')}/uploads/thumbnails/${file.filename}`;
            }

            uploadedFiles.push(fileData);
        }

        res.json({
            status: true,
            message: `${uploadedFiles.length} files uploaded successfully`,
            data: uploadedFiles
        });

    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({
            status: false,
            message: 'File upload failed',
            error: error.message
        });
    }
};

// Base64 file upload (for camera images)
exports.uploadBase64 = async (req, res) => {
    try {
        const { base64, fileName, fileType } = req.body;

        if (!base64) {
            return res.status(400).json({
                status: false,
                message: 'No base64 data provided'
            });
        }

        // Remove data URL prefix if present
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const uniqueName = `${uuidv4()}.${fileType || 'jpg'}`;
        const filePath = `uploads/images/${uniqueName}`;

        await fs.writeFile(filePath, buffer);

        res.json({
            status: true,
            message: 'Base64 image uploaded successfully',
            data: {
                fileName: uniqueName,
                filePath: filePath,
                url: `${req.protocol}://${req.get('host')}/uploads/images/${uniqueName}`
            }
        });

    } catch (error) {
        console.error('Base64 upload error:', error);
        res.status(500).json({
            status: false,
            message: 'Base64 upload failed',
            error: error.message
        });
    }
};

// Get file info
exports.getFileInfo = async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(__dirname, '..', 'uploads', fileId);

        try {
            await fs.access(filePath);

            res.json({
                status: true,
                data: {
                    fileId: fileId,
                    url: `${req.protocol}://${req.get('host')}/uploads/${fileId}`
                }
            });

        } catch (error) {
            res.status(404).json({
                status: false,
                message: 'File not found'
            });
        }

    } catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
};

// Delete file
exports.deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(__dirname, '..', 'uploads', fileId);

        try {
            await fs.unlink(filePath);

            // Also delete thumbnail if exists
            const thumbnailPath = path.join(__dirname, '..', 'uploads', 'thumbnails', fileId);
            try {
                await fs.unlink(thumbnailPath);
            } catch (e) {
                // Thumbnail might not exist
            }

            res.json({
                status: true,
                message: 'File deleted successfully'
            });

        } catch (error) {
            res.status(404).json({
                status: false,
                message: 'File not found'
            });
        }

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error'
        });
    }
};