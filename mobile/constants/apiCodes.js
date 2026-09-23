/**
 * Machine-readable codes the API returns alongside HTTP status.
 *
 * These exist so the client can react precisely — prompting for consent in
 * place, say — instead of showing a generic failure. The value must match the
 * backend exactly; `backend/src/middleware/requireOpenAIConsent.js` exports the
 * same string. It has already drifted once: a caller compared against
 * 'OPENAI_CONSENT_REQUIRED' (upper case) and the branch was silently dead.
 */

/** Sent with 403 when a route needs OpenAI consent the user has not given. */
export const OPENAI_CONSENT_REQUIRED = 'openai_consent_required';

/**
 * True when an apiClient rejection is specifically a missing-consent denial.
 *
 * apiClient attaches the parsed body as `error.response.data`, so the code is
 * read from there. Matching on the code rather than the bare 403 matters:
 * other 403s (premium gates, for instance) must not be reported to the user as
 * a consent problem.
 *
 * @param {unknown} error Rejection from apiClient.
 * @returns {boolean}
 */
export function isOpenAIConsentError(error) {
  return error?.response?.data?.code === OPENAI_CONSENT_REQUIRED;
}
