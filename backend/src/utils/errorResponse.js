/**
 * Standardized Error Response Utility
 * Ensures consistent error format across all API endpoints
 */

// Standard error codes
export const ErrorCodes = {
  // 400 - Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE: 'INVALID_VALUE',

  // 401 - Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // 403 - Forbidden
  FORBIDDEN: 'FORBIDDEN',

  // 404 - Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 409 - Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',

  // 500 - Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};

/**
 * Create a standardized error response
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Human-readable error message
 * @param {string} [code] - Error code from ErrorCodes
 * @param {object} [details] - Additional error details
 */
export function errorResponse(res, status, message, code = null, details = null) {
  const response = {
    error: message,
    ...(code && { code }),
    ...(details && { details }),
  };
  return res.status(status).json(response);
}

// Convenience methods for common error types
export const errors = {
  badRequest: (res, message, details = null) =>
    errorResponse(res, 400, message, ErrorCodes.VALIDATION_ERROR, details),

  missingField: (res, fieldName) =>
    errorResponse(res, 400, `${fieldName} is required`, ErrorCodes.MISSING_FIELD),

  invalidFormat: (res, fieldName, expected) =>
    errorResponse(res, 400, `Invalid ${fieldName} format. Expected: ${expected}`, ErrorCodes.INVALID_FORMAT),

  invalidValue: (res, fieldName, reason) =>
    errorResponse(res, 400, `Invalid ${fieldName}: ${reason}`, ErrorCodes.INVALID_VALUE),

  unauthorized: (res, message = 'Authentication required') =>
    errorResponse(res, 401, message, ErrorCodes.UNAUTHORIZED),

  forbidden: (res, message = 'Access denied') =>
    errorResponse(res, 403, message, ErrorCodes.FORBIDDEN),

  notFound: (res, resource = 'Resource') =>
    errorResponse(res, 404, `${resource} not found`, ErrorCodes.NOT_FOUND),

  conflict: (res, message) =>
    errorResponse(res, 409, message, ErrorCodes.CONFLICT),

  internal: (res, message = 'An unexpected error occurred') =>
    errorResponse(res, 500, message, ErrorCodes.INTERNAL_ERROR),

  database: (res, operation = 'operation') =>
    errorResponse(res, 500, `Database ${operation} failed`, ErrorCodes.DATABASE_ERROR),

  externalService: (res, service) =>
    errorResponse(res, 500, `${service} service unavailable`, ErrorCodes.EXTERNAL_SERVICE_ERROR),
};

export default errors;
