/**
 * Zod Validation Middleware
 * Validates request body, params, and query against Zod schemas
 */

import { ZodError } from 'zod';
import errors from '../utils/errorResponse.js';

/**
 * Create validation middleware for request body
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errors.badRequest(res, 'Validation failed', formattedErrors);
      }
      return errors.internal(res, 'Validation error');
    }
  };
}

/**
 * Create validation middleware for request params
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errors.badRequest(res, 'Invalid URL parameters', formattedErrors);
      }
      return errors.internal(res, 'Validation error');
    }
  };
}

/**
 * Create validation middleware for request query
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errors.badRequest(res, 'Invalid query parameters', formattedErrors);
      }
      return errors.internal(res, 'Validation error');
    }
  };
}

export default { validateBody, validateParams, validateQuery };
