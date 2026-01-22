/**
 * Production-safe logger utility
 *
 * All logging is automatically disabled in production builds.
 * Use this instead of console.log/warn/error throughout the app.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.log('[Component] Message');
 *   logger.warn('[Component] Warning');
 *   logger.error('[Component] Error', error);
 */

const noop = () => {};

// In production, all logging methods are no-ops
const logger = __DEV__
  ? {
      log: (...args) => console.log(...args),
      warn: (...args) => console.warn(...args),
      error: (...args) => console.error(...args),
      info: (...args) => console.info(...args),
      debug: (...args) => console.debug(...args),
      group: (...args) => console.group(...args),
      groupEnd: () => console.groupEnd(),
      table: (...args) => console.table(...args),
    }
  : {
      log: noop,
      warn: noop,
      error: noop,
      info: noop,
      debug: noop,
      group: noop,
      groupEnd: noop,
      table: noop,
    };

export default logger;

// Named exports for specific log levels
export const { log, warn, error, info, debug } = logger;
