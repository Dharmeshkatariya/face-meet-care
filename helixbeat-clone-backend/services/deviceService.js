@"
const crypto = require('crypto');
const os = require('os');

class DeviceService {
    constructor() {
        this.devices = new Map(); // Store device info in memory (use DB in production)
    }

    // Generate device fingerprint
    generateDeviceFingerprint(deviceInfo) {
        const data = JSON.stringify({
            make: deviceInfo.make,
            model: deviceInfo.model,
            userAgent: deviceInfo.userAgent,
            platform: deviceInfo.platform,
            screenResolution: deviceInfo.screenResolution,
            timezone: deviceInfo.timezone
        });

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Register new device
    registerDevice(userId, deviceInfo) {
        const fingerprint = this.generateDeviceFingerprint(deviceInfo);
        const deviceId = crypto.randomUUID();

        const device = {
            id: deviceId,
            user_id: userId,
            fingerprint: fingerprint,
            make: deviceInfo.make || 'Unknown',
            model: deviceInfo.model || 'Unknown',
            platform: deviceInfo.platform || 'Unknown',
            userAgent: deviceInfo.userAgent || '',
            ip_address: deviceInfo.ip_address || '',
            device_token: deviceInfo.device_token || '',
            first_login: new Date(),
            last_login: new Date(),
            is_trusted: false,
            login_count: 1
        };

        // Store device (in production, save to database)
        if (!this.devices.has(userId)) {
            this.devices.set(userId, []);
        }
        this.devices.get(userId).push(device);

        return device;
    }

    // Validate device
    async validateDevice(userId, deviceInfo) {
        const fingerprint = this.generateDeviceFingerprint(deviceInfo);
        const userDevices = this.devices.get(userId) || [];

        const existingDevice = userDevices.find(d => d.fingerprint === fingerprint);

        if (existingDevice) {
            // Update last login
            existingDevice.last_login = new Date();
            existingDevice.login_count += 1;
            existingDevice.ip_address = deviceInfo.ip_address || existingDevice.ip_address;

            return {
                isValid: true,
                isNewDevice: false,
                device: existingDevice
            };
        }

        // New device detected
        const newDevice = this.registerDevice(userId, deviceInfo);

        return {
            isValid: true,
            isNewDevice: true,
            device: newDevice,
            requiresOTP: true // Can require OTP for new devices
        };
    }

    // Trust a device
    trustDevice(userId, deviceId) {
        const userDevices = this.devices.get(userId) || [];
        const device = userDevices.find(d => d.id === deviceId);

        if (device) {
            device.is_trusted = true;
            return true;
        }

        return false;
    }

    // Revoke device access
    revokeDevice(userId, deviceId) {
        const userDevices = this.devices.get(userId) || [];
        const index = userDevices.findIndex(d => d.id === deviceId);

        if (index !== -1) {
            userDevices.splice(index, 1);
            return true;
        }

        return false;
    }

    // Get all devices for user
    getUserDevices(userId) {
        return this.devices.get(userId) || [];
    }

    // Get device info from request
    getDeviceInfoFromRequest(req) {
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

        // Parse user agent (simplified)
        let make = 'Unknown';
        let model = 'Unknown';
        let platform = 'Unknown';

        if (userAgent.includes('Windows')) platform = 'Windows';
        else if (userAgent.includes('Mac')) platform = 'Mac';
        else if (userAgent.includes('Linux')) platform = 'Linux';
        else if (userAgent.includes('Android')) platform = 'Android';
        else if (userAgent.includes('iPhone')) platform = 'iOS';

        if (userAgent.includes('Chrome')) model = 'Chrome';
        else if (userAgent.includes('Firefox')) model = 'Firefox';
        else if (userAgent.includes('Safari')) model = 'Safari';
        else if (userAgent.includes('Edge')) model = 'Edge';

        return {
            make,
            model,
            platform,
            userAgent,
            ip_address: ipAddress,
            device_token: req.body.device_detail?.device_token || '',
            screenResolution: req.body.device_detail?.screen_resolution || '',
            timezone: req.body.device_detail?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    // Generate device token for push notifications
    generateDeviceToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Check if device is trusted
    isDeviceTrusted(userId, deviceId) {
        const userDevices = this.devices.get(userId) || [];
        const device = userDevices.find(d => d.id === deviceId);
        return device ? device.is_trusted : false;
    }

    // Clean old devices (older than specified days)
    cleanOldDevices(userId, daysOld = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const userDevices = this.devices.get(userId) || [];
        const filteredDevices = userDevices.filter(device =>
            device.last_login > cutoffDate
        );

        this.devices.set(userId, filteredDevices);
        return userDevices.length - filteredDevices.length;
    }

    // Get device statistics
    getDeviceStats(userId) {
        const userDevices = this.devices.get(userId) || [];

        return {
            totalDevices: userDevices.length,
            trustedDevices: userDevices.filter(d => d.is_trusted).length,
            untrustedDevices: userDevices.filter(d => !d.is_trusted).length,
            devicesByPlatform: this.groupByPlatform(userDevices),
            recentDevices: userDevices
                .sort((a, b) => b.last_login - a.last_login)
                .slice(0, 5)
        };
    }

    // Group devices by platform
    groupByPlatform(devices) {
        const groups = {};
        devices.forEach(device => {
            const platform = device.platform;
            groups[platform] = (groups[platform] || 0) + 1;
        });
        return groups;
    }

    // Log device activity
    async logDeviceActivity(userId, deviceId, activity) {
        const userDevices = this.devices.get(userId) || [];
        const device = userDevices.find(d => d.id === deviceId);

        if (device) {
            if (!device.activityLog) {
                device.activityLog = [];
            }

            device.activityLog.push({
                activity,
                timestamp: new Date(),
                ip_address: activity.ip_address
            });

            // Keep only last 100 activities
            if (device.activityLog.length > 100) {
                device.activityLog = device.activityLog.slice(-100);
            }
        }
    }
}

module.exports = new DeviceService();
"@ | Out-File -FilePath services/deviceService.js -Encoding utf8