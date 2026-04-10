
// utils/imageProcessor.js
const sharp = require('sharp');
const fs = require('fs').promises;

const processImage = async (inputPath, outputPath, options = {}) => {
    try {
        const {
            width = null,
            height = null,
            quality = 80,
            format = 'jpeg'
        } = options;

        let pipeline = sharp(inputPath);

        if (width && height) {
            pipeline = pipeline.resize(width, height, {
                fit: 'cover',
                position: 'center'
            });
        } else if (width) {
            pipeline = pipeline.resize(width, null);
        } else if (height) {
            pipeline = pipeline.resize(null, height);
        }

        pipeline = pipeline[format]({ quality });

        await pipeline.toFile(outputPath);

        // Get file info
        const stats = await fs.stat(outputPath);

        return {
            size: stats.size,
            width: width,
            height: height,
            format: format
        };

    } catch (error) {
        console.error('Image processing error:', error);
        throw error;
    }
};

const generateThumbnail = async (inputPath, outputPath, size = 150) => {
    return await processImage(inputPath, outputPath, {
        width: size,
        height: size,
        quality: 70,
        format: 'jpeg'
    });
};

module.exports = {
    processImage,
    generateThumbnail
};