/**
 * Delivery Engine - Intelligence Layer 4
 *
 * Final stage of the intelligence pipeline:
 * - Selects witty, contextual copy for recommendations
 * - Determines optimal delivery channel (in-app vs push)
 * - Manages notification timing and batching
 * - Tracks delivery effectiveness
 *
 * Uses centralized wittyMessages.js for all copy (100+ variations)
 */

// Import centralized witty messages (single source of truth)
import wittyMessages, {
  hydrationMessages,
  moodMessages,
  foodMessages,
  activityMessages,
  streakMessages,
  generalMessages,
  reminderMessages,
  engagementMessages,
  patternMessages,
} from '../../utils/wittyMessages';

// ============================================================================
// UTILITIES
// ============================================================================

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickWeighted = (arr, weights) => {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    random -= weights[i];
    if (random <= 0) return arr[i];
  }
  return arr[arr.length - 1];
};

// Re-export for backwards compatibility
export const WITTY_COPY = wittyMessages;

// ============================================================================
// DELIVERY ENGINE CLASS
// ============================================================================

export class DeliveryEngine {
  constructor() {
    this.deliveryHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Select contextual copy for a recommendation
   *
   * @param {Object} rec - Recommendation object
   * @param {Object} context - Context from ContextBuilder
   * @returns {Object} - Recommendation with witty copy
   */
  selectCopy(rec, context) {
    const domain = rec.domain || this.inferDomain(rec);
    const timeOfDay = this.getTimeOfDay();
    const urgency = rec.priority || 'medium';
    const userState = context?.engagement?.state || 'casual';

    // Get appropriate copy pool
    const copyPool = this.getCopyPool(domain, rec.type, timeOfDay, urgency);

    if (!copyPool || copyPool.length === 0) {
      // Fallback to original copy
      return rec;
    }

    // Select copy with weighting based on user state
    const selectedCopy = this.selectWithPersonality(copyPool, userState);

    return {
      ...rec,
      title: selectedCopy.title || rec.title,
      description: selectedCopy.description || rec.description,
      _originalTitle: rec.title,
      _originalDescription: rec.description,
      _copySource: 'delivery_engine',
    };
  }

  /**
   * Get copy pool based on context
   */
  getCopyPool(domain, type, timeOfDay, urgency) {
    // Use reminderMessages for context-aware copy
    const domainReminders = reminderMessages[domain];

    // Check for urgent messages first
    if ((urgency === 'high' || urgency === 'critical') && domainReminders?.urgent) {
      return domainReminders.urgent.map(text => ({ title: text, description: '' }));
    }

    // Time-based copy from reminderMessages
    if (domainReminders?.[timeOfDay]) {
      return domainReminders[timeOfDay].map(text => ({ title: text, description: '' }));
    }

    // Map timeOfDay to meal-specific keys for nutrition
    if (domain === 'nutrition') {
      const mealMap = { morning: 'breakfast', afternoon: 'lunch', evening: 'dinner' };
      const mealKey = mealMap[timeOfDay];
      if (mealKey && domainReminders?.[mealKey]) {
        return domainReminders[mealKey].map(text => ({ title: text, description: '' }));
      }
    }

    return null;
  }

  /**
   * Select copy with personality matching
   */
  selectWithPersonality(pool, userState) {
    // Weight selection based on user state
    // Power users get more casual/witty copy
    // New users get more helpful copy

    if (userState === 'new') {
      // Prefer first items (usually more explanatory)
      return pool[0];
    }

    if (userState === 'power_user') {
      // Random selection with preference for later items (more witty)
      const weights = pool.map((_, i) => i + 1);
      return pickWeighted(pool, weights);
    }

    // Default: random
    return pick(pool);
  }

  /**
   * Get success message for completed action
   */
  getSuccessMessage(domain, action, data = {}) {
    // Use domain-specific message modules
    if (action === 'logged') {
      if (domain === 'mood' && data.mood) {
        return moodMessages.logged(data.mood);
      }
      if (domain === 'hydration' && data.amount) {
        return hydrationMessages.logged(data.amount, data.type);
      }
      if (domain === 'nutrition' || domain === 'food') {
        return foodMessages.logged();
      }
      if (domain === 'activity' && data.minutes) {
        return activityMessages.logged(data.minutes, data.type);
      }
    }

    if (action === 'goalReached') {
      if (domain === 'hydration') {
        return hydrationMessages.goalReached();
      }
      return generalMessages.success();
    }

    // Fallback
    return generalMessages.success();
  }

  /**
   * Get streak message based on event type
   */
  getStreakMessage(domain, days, eventType = 'continued') {
    // Handle different streak events
    switch (eventType) {
      case 'lost':
        return streakMessages.lost(days); // days = previous streak length
      case 'saved':
        return streakMessages.saved();
      case 'restart':
        return streakMessages.restart();
      case 'closeCall':
        return streakMessages.closeCall();
      case 'atRisk':
        return streakMessages.atRisk(days); // days = hours remaining
      case 'milestone':
        return streakMessages.milestone(days);
      case 'freezeEarned':
        return streakMessages.freezeEarned();
      case 'continued':
      default:
        // Check for milestone (every 7 days)
        if (days > 0 && days % 7 === 0) {
          return streakMessages.milestone(days);
        }
        return streakMessages.continued(days);
    }
  }

  /**
   * Get streak lost message (convenience method)
   */
  getStreakLostMessage(previousDays) {
    return streakMessages.lost(previousDays);
  }

  /**
   * Get streak saved message (when freeze is used)
   */
  getStreakSavedMessage() {
    return streakMessages.saved();
  }

  /**
   * Get streak at risk message (for notifications)
   */
  getStreakAtRiskMessage(hoursLeft) {
    return streakMessages.atRisk(hoursLeft);
  }

  /**
   * Get pattern/correlation message
   */
  getPatternMessage(domain, impactType) {
    // Use patternMessages from wittyMessages
    if (patternMessages.discoveries?.length > 0) {
      return pick(patternMessages.discoveries);
    }

    // Fallback to impact-based messages
    const pool = patternMessages[impactType || 'neutral'] || patternMessages.neutral;
    return pick(pool);
  }

  /**
   * Get engagement message based on user state
   */
  getEngagementMessage(userState) {
    // Use engagementMessages from wittyMessages
    const stateKey = userState === 'returning' ? 'returning' :
                     userState === 'power_user' ? 'powerUser' :
                     userState === 'at_risk' ? 'atRisk' : 'newUser';

    const pool = engagementMessages[stateKey] || engagementMessages.newUser;
    return pick(pool);
  }

  /**
   * Determine optimal delivery channel
   */
  getDeliveryChannel(rec, context) {
    // High urgency + user not in app = push
    if (rec.priority === 'high' && !context?.isAppActive) {
      return 'push';
    }

    // User is active = in-app
    if (context?.isAppActive) {
      return 'in_app';
    }

    // Default to in-app for next session
    return 'in_app_next';
  }

  /**
   * Check if notification should be batched
   */
  shouldBatch(recs, context) {
    // Batch if multiple low-urgency items
    const lowUrgencyCount = recs.filter(r => r.priority !== 'high').length;
    return lowUrgencyCount >= 3;
  }

  /**
   * Format for push notification
   */
  formatForPush(rec, context) {
    const copy = this.selectCopy(rec, context);

    return {
      title: copy.title,
      body: copy.description || '',
      data: {
        type: rec.domain,
        action: rec.action || 'open_app',
        recId: rec.id,
      },
    };
  }

  /**
   * Get time of day category
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Infer domain from recommendation
   */
  inferDomain(rec) {
    const text = ((rec.title || '') + ' ' + (rec.description || '')).toLowerCase();

    if (text.includes('water') || text.includes('hydrat') || text.includes('drink')) {
      return 'hydration';
    }
    if (text.includes('protein') || text.includes('calorie') || text.includes('meal') || text.includes('eat') || text.includes('food')) {
      return 'nutrition';
    }
    if (text.includes('exercise') || text.includes('active') || text.includes('movement') || text.includes('walk') || text.includes('workout')) {
      return 'activity';
    }
    if (text.includes('mood') || text.includes('feel') || text.includes('energy')) {
      return 'mood';
    }

    return 'general';
  }

  /**
   * Record delivery for analytics
   */
  recordDelivery(rec, channel, context) {
    this.deliveryHistory.push({
      recId: rec.id,
      domain: rec.domain,
      channel,
      timestamp: Date.now(),
      userState: context?.engagement?.state,
    });

    // Trim history
    if (this.deliveryHistory.length > this.maxHistorySize) {
      this.deliveryHistory = this.deliveryHistory.slice(-this.maxHistorySize);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const deliveryEngine = new DeliveryEngine();
export default deliveryEngine;
