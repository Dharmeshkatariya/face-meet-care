

const crypto = require('crypto');

// Decrypt encrypted password (like in your login example)
exports.decryptPassword = (req, res, next) => {
    try {
        if (req.body.password && req.body.password.length > 100) {
            // This looks like an encrypted password
            const algorithm = 'aes-256-cbc';
            const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8');
            const iv = Buffer.from(process.env.ENCRYPTION_IV, 'utf-8');

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(req.body.password, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            req.body.password = decrypted;
        }
        next();
    } catch (error) {
        // If decryption fails, use original password
        next();
    }
};