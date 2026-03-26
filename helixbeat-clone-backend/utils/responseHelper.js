@"
class ResponseHelper {
    // Success response
    success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            status: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    // Error response
    error(res, message = 'Error occurred', statusCode = 500, errors = null) {
        const response = {
            status: false,
            message,
            timestamp: new Date().toISOString()
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    // Paginated response
    paginated(res, data, page, limit, total, message = 'Success') {
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return res.status(200).json({
            status: true,
            message,
            data: {
                items: data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext,
                    hasPrev,
                    nextPage: hasNext ? page + 1 : null,
                    prevPage: hasPrev ? page - 1 : null
                }
            },
            timestamp: new Date().toISOString()
        });
    }

    // Validation error response
    validationError(res, errors) {
        return res.status(400).json({
            status: false,
            message: 'Validation failed',
            errors,
            timestamp: new Date().toISOString()
        });
    }

    // Authentication error
    unauthorized(res, message = 'Unauthorized access') {
        return res.status(401).json({
            status: false,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Forbidden error
    forbidden(res, message = 'Access forbidden') {
        return res.status(403).json({
            status: false,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Not found error
    notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            status: false,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Conflict error (duplicate)
    conflict(res, message = 'Resource already exists') {
        return res.status(409).json({
            status: false,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Rate limit error
    tooManyRequests(res, message = 'Too many requests') {
        return res.status(429).json({
            status: false,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Created response
    created(res, data = null, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    // No content response
    noContent(res) {
        return res.status(204).send();
    }

    // Format single item
    formatItem(item, transformer = null) {
        if (!item) return null;
        return transformer ? transformer(item) : item;
    }

    // Format collection
    formatCollection(items, transformer = null) {
        if (!items || !Array.isArray(items)) return [];
        return transformer ? items.map(transformer) : items;
    }

    // Add metadata to response
    withMetadata(res, data, metadata = {}) {
        return res.status(200).json({
            status: true,
            data,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Custom response with extra fields
    custom(res, status, data, message = null) {
        const response = {
            status: status === 200 || status === 201,
            data,
            timestamp: new Date().toISOString()
        };

        if (message) {
            response.message = message;
        }

        return res.status(status).json(response);
    }
}

module.exports = new ResponseHelper();
"@ | Out-File -FilePath utils/responseHelper.js -Encoding utf8