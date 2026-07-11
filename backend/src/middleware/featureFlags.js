/**
 * Feature Flags Middleware
 *
 * Provides reversible feature rollout with:
 * - Per-user flag evaluation
 * - Percentage-based rollouts
 * - Allowlist/blocklist support
 * - Platform-specific flags
 * - Minimum data requirements
 *
 * Usage:
 *   import { requireFlag, isFeatureEnabled } from './middleware/featureFlags.js';
 *
 *   // As middleware
 *   router.get('/new-feature', requireFlag('HYDRATION_V2'), handler);
 *
 *   // In handler
 *   if (await isFeatureEnabled('HYDRATION_V2', userId)) { ... }
 */

// Feature flag definitions
// Note: In production, these would be stored in a database or config service
// For now, we use in-memory config that can be updated via admin API
const FLAGS = {
  // Hydration V2 - New premium dashboard card
  HYDRATION_V2_DASHBOARD: {
    enabled: false,
    rolloutPercent: 0,
    allowlist: [],
    blocklist: [],
    description: 'New premium hydration dashboard card with predictions',
  },

  // Predictive insights - Requires calendar integration
  PREDICTIVE_INSIGHTS: {
    enabled: false,
    rolloutPercent: 0,
    allowlist: [],
    blocklist: [],
    requiresCalendarPermission: true,
    minimumDataDays: 7,
    description: 'AI-powered hydration predictions based on calendar and patterns',
  },

  // Calendar integration - Platform specific
  CALENDAR_INTEGRATION: {
    enabled: false,
    rolloutPercent: 0,
    allowlist: [],
    blocklist: [],
    platforms: ['ios', 'android'],
    description: 'Apple and Google Calendar integration for predictions',
  },

  // Hydration analytics - Backend analytics endpoints
  HYDRATION_ANALYTICS: {
    enabled: false,
    rolloutPercent: 0,
    allowlist: [],
    blocklist: [],
    description: 'Advanced hydration pattern analytics and persona detection',
  },

  // Cold start experience - Progressive disclosure
  COLD_START_UX: {
    enabled: false,
    rolloutPercent: 0,
    allowlist: [],
    blocklist: [],
    description: 'Progressive disclosure UX for new users',
  },
};

// In-memory flag cache (for hot path)
let flagCache = { ...FLAGS };
let lastCacheUpdate = Date.now();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Hash user ID to a consistent number 0-99 for percentage rollouts
 * Uses simple hash to ensure consistent results across requests
 */
function getUserBucket(userId) {
  if (!userId) return 100; // No user = no flag access

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash) % 100;
}

/**
 * Check if a feature flag is enabled for a specific user
 *
 * @param {string} flagName - The flag identifier
 * @param {string} userId - The user's ID
 * @param {object} context - Additional context (platform, dataAge, etc.)
 * @returns {Promise<boolean>} - Whether the flag is enabled
 */
export async function isFeatureEnabled(flagName, userId, context = {}) {
  const flag = flagCache[flagName];

  if (!flag) {
    console.warn(`[FeatureFlags] Unknown flag: ${flagName}`);
    return false;
  }

  // Global kill switch
  if (!flag.enabled) {
    return false;
  }

  // Check blocklist first (highest priority)
  if (flag.blocklist?.includes(userId)) {
    return false;
  }

  // Check allowlist (bypass percentage check)
  if (flag.allowlist?.includes(userId)) {
    return true;
  }

  // Check platform requirements
  if (flag.platforms && context.platform) {
    if (!flag.platforms.includes(context.platform)) {
      return false;
    }
  }

  // Check minimum data requirements
  if (flag.minimumDataDays && context.dataDays !== undefined) {
    if (context.dataDays < flag.minimumDataDays) {
      return false;
    }
  }

  // Check calendar permission requirement
  if (flag.requiresCalendarPermission && !context.hasCalendarPermission) {
    return false;
  }

  // Percentage-based rollout
  const userBucket = getUserBucket(userId);
  return userBucket < flag.rolloutPercent;
}

/**
 * Get all flag states for a user (for client sync)
 *
 * @param {string} userId - The user's ID
 * @param {object} context - Additional context
 * @returns {Promise<object>} - Map of flag names to boolean states
 */
export async function getAllFlagStates(userId, context = {}) {
  const states = {};

  for (const flagName of Object.keys(flagCache)) {
    states[flagName] = await isFeatureEnabled(flagName, userId, context);
  }

  return states;
}

/**
 * Express middleware to require a feature flag
 * Returns 404 if flag is not enabled (hides feature existence)
 *
 * @param {string} flagName - The flag identifier
 * @param {object} options - Optional configuration
 * @returns {Function} - Express middleware
 */
export function requireFlag(flagName, options = {}) {
  return async (req, res, next) => {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Build context from request
    const context = {
      platform: req.headers['x-platform'] || req.query.platform,
      dataDays: req.dataDays, // Set by earlier middleware if needed
      hasCalendarPermission: req.headers['x-calendar-permission'] === 'true',
      ...options.context,
    };

    const enabled = await isFeatureEnabled(flagName, userId, context);

    if (!enabled) {
      // Return 404 to hide feature existence from unauthorized users
      return res.status(404).json({
        error: 'Not found',
        message: 'The requested resource does not exist',
      });
    }

    // Add flag info to request for logging
    req.featureFlag = flagName;

    next();
  };
}

/**
 * Update flag configuration (admin only)
 * In production, this would validate permissions and persist to database
 *
 * @param {string} flagName - The flag identifier
 * @param {object} updates - Partial flag configuration
 */
export function updateFlag(flagName, updates) {
  if (!flagCache[flagName]) {
    throw new Error(`Unknown flag: ${flagName}`);
  }

  flagCache[flagName] = {
    ...flagCache[flagName],
    ...updates,
  };

  lastCacheUpdate = Date.now();

  console.log(`[FeatureFlags] Updated ${flagName}:`, flagCache[flagName]);
}

/**
 * Get flag configuration (for admin/debugging)
 *
 * @param {string} flagName - Optional specific flag name
 * @returns {object} - Flag configuration(s)
 */
export function getFlagConfig(flagName) {
  if (flagName) {
    return flagCache[flagName] || null;
  }
  return { ...flagCache };
}

/**
 * Enable a flag for all users (100% rollout)
 * Convenience method for production releases
 */
export function enableFlag(flagName) {
  updateFlag(flagName, { enabled: true, rolloutPercent: 100 });
}

/**
 * Disable a flag (kill switch)
 * Immediately disables for all users
 */
export function disableFlag(flagName) {
  updateFlag(flagName, { enabled: false });
}

/**
 * Add user to flag allowlist
 */
export function addToAllowlist(flagName, userId) {
  const flag = flagCache[flagName];
  if (!flag) throw new Error(`Unknown flag: ${flagName}`);

  if (!flag.allowlist.includes(userId)) {
    flag.allowlist.push(userId);
  }
}

/**
 * Remove user from flag allowlist
 */
export function removeFromAllowlist(flagName, userId) {
  const flag = flagCache[flagName];
  if (!flag) throw new Error(`Unknown flag: ${flagName}`);

  flag.allowlist = flag.allowlist.filter(id => id !== userId);
}

// Export flag names as constants for type safety
export const FLAG_NAMES = {
  HYDRATION_V2_DASHBOARD: 'HYDRATION_V2_DASHBOARD',
  PREDICTIVE_INSIGHTS: 'PREDICTIVE_INSIGHTS',
  CALENDAR_INTEGRATION: 'CALENDAR_INTEGRATION',
  HYDRATION_ANALYTICS: 'HYDRATION_ANALYTICS',
  COLD_START_UX: 'COLD_START_UX',
};

export default {
  isFeatureEnabled,
  getAllFlagStates,
  requireFlag,
  updateFlag,
  getFlagConfig,
  enableFlag,
  disableFlag,
  addToAllowlist,
  removeFromAllowlist,
  FLAG_NAMES,
};
