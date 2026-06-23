/**
 * User Consent Management Routes
 * Handles GDPR-compliant data sharing consent for OpenAI features
 *
 * Strategic Implementation:
 * - Premium users must explicitly consent to share meal data with OpenAI
 * - Consent is optional, tracked, and can be revoked anytime
 * - Without consent, premium users get regex-based parsing (fully compliant)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { premiumFeaturesService } from '../services/PremiumFeatures.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Rate limiting for consent changes
 * Prevent users from spamming consent/revoke requests
 *
 * ✅ FIX: Rate limit by userId instead of IP address
 * All consent endpoints require authentication, so we use userId as the rate limit key
 * This approach is:
 * - More secure: tracks real users, not IPs
 * - IPv6-compliant: doesn't rely on IP address handling
 * - Accurate: one limit per user, not per IP
 */
const consentLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 5,  // 5 requests per minute
  message: {
    success: false,
    error: 'Too many consent changes. Please try again later.',
  },
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Rate limit by userId (all consent endpoints require auth via requireAuth middleware)
    return req.auth?.userId || 'unauthenticated';
  },
});

/**
 * GET /api/consent/status
 * Get user's current consent status
 */
router.get('/status', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    const status = await premiumFeaturesService.getOpenAIConsentStatus(userId);

    res.json({
      success: true,
      consent: status,
    });
  } catch (err) {
    console.error('[Consent] Error getting status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get consent status',
    });
  }
});

/**
 * POST /api/consent/give-openai-consent
 * User gives explicit consent to share data with OpenAI for premium features
 *
 * Request body:
 * {
 *   "understand": true,  // User acknowledges they understand the implications
 *   "purpose": "ai-food-analysis"  // Purpose of data sharing
 * }
 */
router.post('/give-openai-consent', requireAuth(), consentLimiter, async (req, res) => {
  try {
    const userId = req.auth.userId;

    // SECURITY: Validate userId exists and is a string
    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { understand } = req.body;

    // SECURITY: Strict validation - understand must be exactly true (not truthy)
    if (understand !== true) {
      return res.status(400).json({
        success: false,
        error: 'You must explicitly acknowledge understanding of data sharing (understand must be exactly true)',
      });
    }

    // Check user is premium
    const userTier = await premiumFeaturesService.getUserTier(userId);
    if (userTier.tier !== 'premium') {
      return res.status(403).json({
        success: false,
        error: 'Only premium users can enable OpenAI features',
      });
    }

    // Set consent
    const newConsent = await premiumFeaturesService.setOpenAIConsent(
      userId,
      true
    );

    res.json({
      success: true,
      message: 'OpenAI data sharing consent given',
      consent: newConsent,
      details: {
        effectiveImmediately: true,
        canRevoke: true,
      },
    });
  } catch (err) {
    console.error('[Consent] Error giving consent:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update consent',
    });
  }
});

/**
 * POST /api/consent/revoke-openai-consent
 * User revokes consent to share data with OpenAI
 * Premium features will fall back to rule-based parsing
 */
router.post('/revoke-openai-consent', requireAuth(), consentLimiter, async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Revoke consent
    const newConsent = await premiumFeaturesService.setOpenAIConsent(
      userId,
      false
    );

    res.json({
      success: true,
      message: 'OpenAI data sharing consent revoked',
      consent: newConsent,
      details: {
        effectiveImmediately: true,
        fallback: 'You will continue to use MFT, with regex-based food analysis',
      },
    });
  } catch (err) {
    console.error('[Consent] Error revoking consent:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update consent',
    });
  }
});

/**
 * GET /api/consent/info
 * Public endpoint with consent information for frontend display
 * (No auth required - used for onboarding/settings)
 */
router.get('/info', (req, res) => {
  res.json({
    openaiConsent: {
      title: 'AI-Powered Food Analysis',
      description:
        'Premium users can enable OpenAI integration for more accurate food recognition.',
      dataShared: [
        'Your meal descriptions',
        'Ingredient lists you ask about',
        'Food preferences',
      ],
      dataNotShared: [
        'Your nutrition history or logs',
        'Health conditions or medications',
        'Personal information (name, email, etc.)',
        'Payment details',
      ],
      benefits: [
        'Higher accuracy in food recognition (92% vs 65%)',
        'Better support for regional cuisines',
        'Faster meal logging',
        'Smarter ingredient extraction',
      ],
      privacy: {
        canRevoke: true,
        storedByOpenAI: false,
        complianceLevel: 'GDPR-compliant with DPA',
      },
    },
  });
});

export default router;
