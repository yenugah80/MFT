/**
 * Number Parsing Utilities
 * Strict and safe number parsing with validation
 */

/**
 * Parse a string to a number, allowing decimals and commas
 * @param {string} value - String to parse
 * @returns {number|null} Parsed number or null if invalid
 */
export const parseNumber = (value) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(",", "."));
  return Number.isFinite(num) ? num : null;
};

/**
 * Parse a string to an integer
 * @param {string} value - String to parse
 * @returns {number|null} Parsed integer or null if invalid
 */
export const parseInteger = (value) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  return Number.isFinite(num) ? num : null;
};

/**
 * Parse and validate a number with bounds
 * @param {string} value - String to parse
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {Object} { value: number|null, error: string|null }
 */
export const parseWithBounds = (value, min, max) => {
  const num = parseNumber(value);
  
  if (num === null) {
    return { value: null, error: null };
  }
  
  if (num < min) {
    return { value: num, error: `Must be at least ${min}` };
  }
  
  if (num > max) {
    return { value: num, error: `Must be at most ${max}` };
  }
  
  return { value: num, error: null };
};

/**
 * Format number for display
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 0) => {
  if (value == null) return '-';
  return value.toFixed(decimals);
};

/**
 * Sanitize numeric input (strip non-numeric characters)
 * @param {string} value - Input value
 * @param {boolean} allowDecimals - Allow decimal point
 * @returns {string} Sanitized value
 */
export const sanitizeNumericInput = (value, allowDecimals = true) => {
  if (!value) return '';
  if (allowDecimals) {
    return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  }
  return value.replace(/[^\d]/g, '');
};
