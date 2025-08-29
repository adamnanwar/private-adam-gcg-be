/**
 * Utility functions for consistent API responses
 */

const successResponse = (data, message = 'Success') => ({
  status: 'success',
  data,
  message
});

const errorResponse = (message, code = 'ERROR', details = null) => ({
  status: 'error',
  message,
  code,
  details
});

const paginatedResponse = (data, total, page, limit, message = 'Success') => ({
  status: 'success',
  data,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  },
  message
});

const validationErrorResponse = (message, details) => ({
  status: 'error',
  message,
  code: 'VALIDATION_ERROR',
  details
});

const notFoundResponse = (message = 'Resource not found') => ({
  status: 'error',
  message,
  code: 'NOT_FOUND'
});

const unauthorizedResponse = (message = 'Unauthorized') => ({
  status: 'error',
  message,
  code: 'UNAUTHORIZED'
});

const forbiddenResponse = (message = 'Forbidden') => ({
  status: 'error',
  message,
  code: 'FORBIDDEN'
});

const internalErrorResponse = (message = 'Internal server error') => ({
  status: 'error',
  message,
  code: 'INTERNAL_ERROR'
});

const conflictResponse = (message = 'Resource conflict') => ({
  status: 'error',
  message,
  code: 'CONFLICT'
});

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  internalErrorResponse,
  conflictResponse
};

