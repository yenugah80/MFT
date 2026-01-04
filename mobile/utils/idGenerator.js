/**
 * Unique ID Generator Utility
 * Provides cryptographically-secure UUID v4 generation for client event IDs
 * Replaces `Date.now() + random` with proper UUID v4 (collision probability: 1 in 5.3 x 10^36)
 */

/**
 * Generate a UUID v4 identifier
 * Uses crypto.getRandomValues for cryptographic randomness
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @returns {string} UUID v4 identifier
 */
export const generateUUID = () => {
  // Create array of 16 random bytes
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version to 4 (random) - bits 12-15 of time_hi_and_version field
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set variant to RFC 4122 - bits 6-7 of clock_seq_hi_and_reserved field
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Format as UUID string
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
};

/**
 * Generate a client event ID for idempotency
 * Ensures uniqueness across all devices and time
 * Used for: food logs, mood logs, water logs, recommendations interactions
 *
 * @param {string} [userId] - Optional user ID to include in event ID
 * @returns {string} Unique client event ID
 */
export const generateClientEventId = (userId) => {
  const uuid = generateUUID();

  // If userId provided, include it for additional uniqueness scoping
  if (userId) {
    return `${userId}:${uuid}`;
  }

  return uuid;
};

/**
 * Generate a recommendation ID
 * Format: rec_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID v4 with prefix)
 *
 * @returns {string} Unique recommendation ID
 */
export const generateRecommendationId = () => {
  return `rec_${generateUUID()}`;
};

/**
 * Validate UUID v4 format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid UUID v4
 */
export const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validate client event ID format
 * Accepts: "uuid" or "userId:uuid"
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid client event ID
 */
export const isValidClientEventId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Check if it has userId prefix
  if (id.includes(':')) {
    const parts = id.split(':');
    if (parts.length !== 2) return false;
    return isValidUUID(parts[1]);
  }

  return isValidUUID(id);
};

export default {
  generateUUID,
  generateClientEventId,
  generateRecommendationId,
  isValidUUID,
  isValidClientEventId,
};
