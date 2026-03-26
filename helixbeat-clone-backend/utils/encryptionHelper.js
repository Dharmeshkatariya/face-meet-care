@"
const crypto = require('crypto');

class EncryptionHelper {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.key = Buffer.from(process.env.ENCRYPTION_KEY || 'default_key_32_chars_long_here_123', 'utf-8');
        this.iv = Buffer.from(process.env.ENCRYPTION_IV || 'default_iv_16_chars', 'utf-8');
    }

    // Encrypt text
    encrypt(text) {
        try {
            const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    // Decrypt text
    decrypt(encryptedText) {
        try {
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // Generate secure random token
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Generate UUID
    generateUUID() {
        return crypto.randomUUID();
    }

    // Hash data with SHA256
    hashData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Create HMAC
    createHMAC(data, secret) {
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    // Verify HMAC
    verifyHMAC(data, hmac, secret) {
        const expectedHmac = this.createHMAC(data, secret);
        return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
    }

    // Generate RSA key pair (for advanced encryption)
    generateRSAKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        return { publicKey, privateKey };
    }

    // RSA encrypt
    rsaEncrypt(text, publicKey) {
        const buffer = Buffer.from(text, 'utf8');
        const encrypted = crypto.publicEncrypt(publicKey, buffer);
        return encrypted.toString('base64');
    }

    // RSA decrypt
    rsaDecrypt(encryptedText, privateKey) {
        const buffer = Buffer.from(encryptedText, 'base64');
        const decrypted = crypto.privateDecrypt(privateKey, buffer);
        return decrypted.toString('utf8');
    }

    // Mask sensitive data (like email, phone)
    maskEmail(email) {
        const [localPart, domain] = email.split('@');
        const maskedLocal = localPart.slice(0, 2) + '***' + localPart.slice(-1);
        return `${maskedLocal}@${domain}`;
    }

    maskPhone(phone) {
        if (!phone) return '';
        return phone.slice(0, 3) + '****' + phone.slice(-2);
    }
}

module.exports = new EncryptionHelper();
"@ | Out-File -FilePath utils/encryptionHelper.js -Encoding utf8