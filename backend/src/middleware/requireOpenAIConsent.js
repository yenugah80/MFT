/**
 * OpenAI data-sharing consent gate
 *
 * The app already had a complete consent system — `profiles.openai_data_sharing_consent`,
 * POST /consent/give-openai-consent, POST /consent/revoke-openai-consent, and a
 * revoke response promising `effectiveImmediately: true` — but nothing ever read
 * the flag. Every route that calls OpenAI (voiceLog, resolve, food, nutrition,
 * recommendations) did so regardless of what the user had chosen, which meant
 * "revoke" changed a database column and nothing else.
 *
 * This closes that gap. It matters most on the voice path: audio is the one
 * input that can capture people who never agreed to anything — a bystander
 * talking while the user dictates a meal.
 *
 * Denials return 403 with a machine-readable `code` so the client can prompt for
 * consent in place rather than showing a generic failure.
 */

import { getAuth } from '@clerk/express';
import { premiumFeaturesService } from '../services/PremiumFeatures.js';

export const OPENAI_CONSENT_REQUIRED = 'openai_consent_required';

/**
 * Non-blocking variant: records the user's choice on `req.hasOpenAIConsent` and
 * always continues.
 *
 * Preferred wherever the route can still do something useful without OpenAI.
 * This app's food analysis tries a local canonical-ingredient lookup first and
 * only calls the model when that finds nothing — and the revoke endpoint
 * explicitly promises users "You will continue to use MFT, with regex-based
 * food analysis". Blocking those routes outright would break that promise and,
 * worse, make a privacy choice look like a broken app to anyone who declined.
 *
 * Routes read `req.hasOpenAIConsent` and skip the AI step when it is false.
 */
export function attachOpenAIConsent() {
  return async function openAIConsentAttach(req, _res, next) {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        req.hasOpenAIConsent = false;
        return next();
      }
      const status = await premiumFeaturesService.getOpenAIConsentStatus(userId);
      req.hasOpenAIConsent = status?.hasConsent === true;
    } catch (err) {
      // Same fail-closed rule: an unreadable consent state is treated as "no".
      console.error('[attachOpenAIConsent] Lookup failed, assuming no consent:', err);
      req.hasOpenAIConsent = false;
    }
    return next();
  };
}

/**
 * Blocks the request unless the user has actively consented to OpenAI processing.
 *
 * @param {object}  [options]
 * @param {string}  [options.purpose] Short description of what the data is used
 *   for, echoed back so the client can show a specific prompt
 *   ("transcribe your voice note") rather than a generic one.
 */
export function requireOpenAIConsent({ purpose = 'AI analysis' } = {}) {
  return async function openAIConsentGate(req, res, next) {
    try {
      const { userId } = getAuth(req);

      // These routers mount without `requireAuth` — the global clerkMiddleware
      // populates req.auth but does not enforce it. Returning 401 here would
      // therefore *add* an authentication requirement as a side effect of a
      // privacy change, which is a different decision from the one being made.
      // Defer to whatever the route already does about anonymous callers; with
      // no user there is also no stored consent to honour or violate.
      if (!userId) return next();

      const status = await premiumFeaturesService.getOpenAIConsentStatus(userId);

      if (status?.hasConsent === true) {
        return next();
      }

      return res.status(403).json({
        success: false,
        code: OPENAI_CONSENT_REQUIRED,
        error: 'AI processing requires your consent.',
        purpose,
        // Tells the client exactly where to send the user to resolve it.
        consentEndpoint: '/api/consent/give-openai-consent',
      });
    } catch (err) {
      // Fail CLOSED. An error reading consent must not become implicit consent —
      // that is the whole failure mode this middleware exists to prevent.
      console.error('[requireOpenAIConsent] Consent check failed, denying:', err);
      return res.status(503).json({
        success: false,
        error: 'Could not verify your privacy settings. Please try again.',
      });
    }
  };
}

export default requireOpenAIConsent;
