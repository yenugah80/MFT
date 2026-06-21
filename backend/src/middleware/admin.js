/**
 * Admin Authorization Middleware
 * Secures admin-only endpoints
 *
 * Security model:
 * 1. Requires authentication (via Clerk)
 * 2. Checks if user is in admin allowlist
 * 3. Logs all admin access attempts
 *
 * Configuration:
 * - Set ADMIN_USER_IDS env var with comma-separated Clerk user IDs
 * - Example: ADMIN_USER_IDS=user_abc123,user_def456
 */

// Admin user IDs loaded from environment
const ADMIN_USER_IDS = new Set(
  (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

/**
 * Check if a user ID is an admin
 * @param {string} userId - Clerk user ID
 * @returns {boolean}
 */
export function isAdmin(userId) {
  if (!userId) return false;
  return ADMIN_USER_IDS.has(userId);
}

/**
 * Admin Authorization Middleware
 * Must be used AFTER requireAuth middleware
 *
 * Usage:
 *   router.get('/admin/endpoint', requireAuth(), requireAdmin, handler);
 */
export function requireAdmin(req, res, next) {
  const userId = req.auth?.userId;

  // In production, if no admin IDs are configured the endpoint is completely closed.
  if (process.env.NODE_ENV === 'production' && ADMIN_USER_IDS.size === 0) {
    console.error('[Admin] CRITICAL: Admin endpoint hit but ADMIN_USER_IDS is not configured');
    return res.status(503).json({
      success: false,
      error: 'Admin access is not configured on this server',
    });
  }

  console.log(`[Admin] Access attempt: ${userId || 'unauthenticated'} -> ${req.method} ${req.path}`);

  if (!userId) {
    console.warn('[Admin] Unauthorized: No user ID');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!isAdmin(userId)) {
    console.warn(`[Admin] Forbidden: User ${userId} is not an admin`);
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  console.log(`[Admin] Access granted: ${userId}`);
  next();
}

/**
 * Optional admin check - doesn't block, just sets req.isAdmin
 * Useful for endpoints that behave differently for admins
 */
export function checkAdmin(req, res, next) {
  req.isAdmin = isAdmin(req.auth?.userId);
  next();
}

/**
 * Get list of admin user IDs (for debugging)
 * Only returns count in production for security
 */
export function getAdminInfo() {
  if (process.env.NODE_ENV === 'production') {
    return {
      configured: ADMIN_USER_IDS.size > 0,
      count: ADMIN_USER_IDS.size,
    };
  }
  return {
    configured: ADMIN_USER_IDS.size > 0,
    count: ADMIN_USER_IDS.size,
    ids: Array.from(ADMIN_USER_IDS),
  };
}

// Log admin configuration on startup
if (ADMIN_USER_IDS.size === 0) {
  console.warn('[Admin] ⚠️  No admin users configured. Set ADMIN_USER_IDS env var.');
} else {
  console.log(`[Admin] Configured with ${ADMIN_USER_IDS.size} admin user(s)`);
}

export default {
  isAdmin,
  requireAdmin,
  checkAdmin,
  getAdminInfo,
};
