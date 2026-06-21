/**
 * Feature Flags Routes
 *
 * Provides endpoints for:
 * - Getting all flag states for a user
 * - Admin flag management
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import {
  getAllFlagStates,
  getFlagConfig,
  updateFlag,
  enableFlag,
  disableFlag,
  addToAllowlist,
  removeFromAllowlist,
  FLAG_NAMES,
} from '../middleware/featureFlags.js';

const router = express.Router();

// ============================================================================
// PUBLIC ENDPOINTS (Require Auth)
// ============================================================================

/**
 * GET /api/flags
 * Returns all feature flag states for the authenticated user
 * Query params:
 *   platform: 'ios' | 'android' | 'web'
 *   dataDays: number of days of data the user has
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Build context from request
    const context = {
      platform: req.headers['x-platform'] || req.query.platform,
      dataDays: req.query.dataDays ? parseInt(req.query.dataDays) : undefined,
      hasCalendarPermission: req.headers['x-calendar-permission'] === 'true',
    };

    const flags = await getAllFlagStates(userId, context);

    res.json({
      flags,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Flags] Error getting flag states:', error);
    res.status(500).json({ error: 'Failed to get flag states' });
  }
});

/**
 * GET /api/flags/:flagName
 * Returns a specific flag state for the authenticated user
 */
router.get('/:flagName', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { flagName } = req.params;

    // Build context from request
    const context = {
      platform: req.headers['x-platform'] || req.query.platform,
      dataDays: req.query.dataDays ? parseInt(req.query.dataDays) : undefined,
      hasCalendarPermission: req.headers['x-calendar-permission'] === 'true',
    };

    const flags = await getAllFlagStates(userId, context);
    const enabled = flags[flagName];

    if (enabled === undefined) {
      return res.status(404).json({ error: `Unknown flag: ${flagName}` });
    }

    res.json({
      flag: flagName,
      enabled,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Flags] Error getting flag state:', error);
    res.status(500).json({ error: 'Failed to get flag state' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// Secured with requireAdmin middleware - only users in ADMIN_USER_IDS can access
// ============================================================================

/**
 * GET /api/flags/admin/config
 * Returns all flag configurations (admin only)
 */
router.get('/admin/config', requireAuth(), requireAdmin, adminLimiter, async (req, res) => {
  try {
    const config = getFlagConfig();

    res.json({
      flags: config,
      flagNames: FLAG_NAMES,
    });
  } catch (error) {
    console.error('[Flags] Error getting config:', error);
    res.status(500).json({ error: 'Failed to get flag config' });
  }
});

/**
 * POST /api/flags/admin/:flagName/enable
 * Enables a flag for all users (100% rollout)
 */
router.post('/admin/:flagName/enable', requireAuth(), requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { flagName } = req.params;

    enableFlag(flagName);

    res.json({
      success: true,
      flag: flagName,
      config: getFlagConfig(flagName),
    });
  } catch (error) {
    console.error('[Flags] Error enabling flag:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/flags/admin/:flagName/disable
 * Disables a flag for all users (kill switch)
 */
router.post('/admin/:flagName/disable', requireAuth(), requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { flagName } = req.params;

    disableFlag(flagName);

    res.json({
      success: true,
      flag: flagName,
      config: getFlagConfig(flagName),
    });
  } catch (error) {
    console.error('[Flags] Error disabling flag:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/flags/admin/:flagName
 * Updates flag configuration
 * Body:
 *   enabled: boolean
 *   rolloutPercent: number 0-100
 */
router.patch('/admin/:flagName', requireAuth(), requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { flagName } = req.params;
    const updates = req.body;

    updateFlag(flagName, updates);

    res.json({
      success: true,
      flag: flagName,
      config: getFlagConfig(flagName),
    });
  } catch (error) {
    console.error('[Flags] Error updating flag:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/flags/admin/:flagName/allowlist
 * Adds a user to the flag allowlist
 * Body:
 *   userId: string
 */
router.post('/admin/:flagName/allowlist', requireAuth(), requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    addToAllowlist(flagName, userId);

    res.json({
      success: true,
      flag: flagName,
      config: getFlagConfig(flagName),
    });
  } catch (error) {
    console.error('[Flags] Error adding to allowlist:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/flags/admin/:flagName/allowlist/:userId
 * Removes a user from the flag allowlist
 */
router.delete('/admin/:flagName/allowlist/:userId', requireAuth(), requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { flagName, userId } = req.params;

    removeFromAllowlist(flagName, userId);

    res.json({
      success: true,
      flag: flagName,
      config: getFlagConfig(flagName),
    });
  } catch (error) {
    console.error('[Flags] Error removing from allowlist:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
