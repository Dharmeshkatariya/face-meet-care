@"
const { body, validationResult } = require('express-validator');

// Validation rules for user registration
exports.validateRegister = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('username')
        .isLength({ min: 3 })
        .trim()
        .withMessage('Username must be at least 3 characters long'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('confirm_password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validation rules for login
exports.validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validation rules for tenant creation
exports.validateTenant = [
    body('url')
        .notEmpty()
        .withMessage('URL is required')
        .isURL()
        .withMessage('Please provide a valid URL'),
    body('name')
        .notEmpty()
        .withMessage('Tenant name is required'),
    body('country')
        .optional()
        .isLength({ min: 2, max: 2 })
        .withMessage('Country code must be 2 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validation rules for feature switch
exports.validateFeatureSwitch = [
    body('name')
        .notEmpty()
        .withMessage('Feature name is required')
        .isLength({ min: 3 })
        .withMessage('Feature name must be at least 3 characters'),
    body('active')
        .optional()
        .isBoolean()
        .withMessage('Active must be a boolean'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validation rules for provider
exports.validateProvider = [
    body('name')
        .notEmpty()
        .withMessage('Provider name is required'),
    body('type')
        .optional()
        .isIn(['EXT', 'INT'])
        .withMessage('Type must be EXT or INT'),
    body('provider_type')
        .optional()
        .isIn(['RESIDENT', 'ATTENDING', 'CONSULTANT'])
        .withMessage('Invalid provider type'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validation rules for device details
exports.validateDeviceDetails = [
    body('device_detail.make')
        .optional()
        .isString()
        .withMessage('Device make must be a string'),
    body('device_detail.model')
        .optional()
        .isString()
        .withMessage('Device model must be a string'),
    body('device_detail.ip_address')
        .optional()
        .isIP()
        .withMessage('Invalid IP address'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Middleware to handle validation errors
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};
"@ | Out-File -FilePath middleware/validation.js -Encoding utf8