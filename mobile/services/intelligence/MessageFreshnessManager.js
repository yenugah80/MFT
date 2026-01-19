/**
 * Message Freshness Manager
 *
 * Senior Architecture Design:
 * - Ensures users see variety in messages
 * - Tracks recently shown messages per category
 * - Persists across sessions via AsyncStorage
 * - Configurable freshness windows per category
 *
 * Design Principles:
 * 1. Single Responsibility: Only manages message freshness
 * 2. Open/Closed: Easy to add new categories without modification
 * 3. Dependency Inversion: Storage layer is abstracted
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY = '@message_freshness_history';

/**
 * Freshness configuration per category
 * - windowSize: How many recent messages to track before allowing repeats
 * - maxAge: How long (ms) before a message can repeat regardless of window
 */
const FRESHNESS_CONFIG = {
  // High-frequency messages (user sees often) - larger windows
  'hydration.logged': { windowSize: 6, maxAge: 24 * 60 * 60 * 1000 }, // 24h
  'food.logged': { windowSize: 6, maxAge: 24 * 60 * 60 * 1000 },
  'mood.logged': { windowSize: 4, maxAge: 12 * 60 * 60 * 1000 },
  'activity.logged': { windowSize: 6, maxAge: 24 * 60 * 60 * 1000 },

  // Medium-frequency messages
  'streak.continued': { windowSize: 4, maxAge: 48 * 60 * 60 * 1000 },
  'general.success': { windowSize: 4, maxAge: 12 * 60 * 60 * 1000 },
  'general.error': { windowSize: 4, maxAge: 6 * 60 * 60 * 1000 },

  // Low-frequency messages - smaller windows
  'streak.milestone': { windowSize: 2, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  'goals.reached': { windowSize: 2, maxAge: 7 * 24 * 60 * 60 * 1000 },
  'hydration.goalReached': { windowSize: 3, maxAge: 48 * 60 * 60 * 1000 },

  // Critical emotional moments - ensure variety
  'streak.lost': { windowSize: 6, maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days (rare but important)
  'streak.saved': { windowSize: 3, maxAge: 7 * 24 * 60 * 60 * 1000 },
  'streak.restart': { windowSize: 4, maxAge: 14 * 24 * 60 * 60 * 1000 },
  'streak.closeCall': { windowSize: 3, maxAge: 7 * 24 * 60 * 60 * 1000 },
  'streak.atRisk': { windowSize: 3, maxAge: 24 * 60 * 60 * 1000 },

  // Reminders (shown less frequently)
  'reminders.hydration': { windowSize: 4, maxAge: 8 * 60 * 60 * 1000 },
  'reminders.nutrition': { windowSize: 3, maxAge: 8 * 60 * 60 * 1000 },
  'reminders.activity': { windowSize: 3, maxAge: 8 * 60 * 60 * 1000 },
  'reminders.mood': { windowSize: 2, maxAge: 8 * 60 * 60 * 1000 },

  // Engagement messages (rare)
  'engagement': { windowSize: 2, maxAge: 7 * 24 * 60 * 60 * 1000 },

  // Pattern discoveries (should feel fresh)
  'patterns.discoveries': { windowSize: 5, maxAge: 3 * 24 * 60 * 60 * 1000 },

  // Gamification messages (celebrations should feel fresh)
  'gamification.levelUp': { windowSize: 4, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  'gamification.xpEarned': { windowSize: 6, maxAge: 24 * 60 * 60 * 1000 }, // High frequency
  'gamification.xpBonus': { windowSize: 4, maxAge: 48 * 60 * 60 * 1000 },
  'gamification.achievementUnlocked': { windowSize: 5, maxAge: 14 * 24 * 60 * 60 * 1000 }, // Rare
  'gamification.badgeEarned': { windowSize: 4, maxAge: 14 * 24 * 60 * 60 * 1000 },
  'gamification.tierUpgrade': { windowSize: 3, maxAge: 30 * 24 * 60 * 60 * 1000 }, // Very rare
  'gamification.challengeCompleted': { windowSize: 4, maxAge: 24 * 60 * 60 * 1000 },
  'gamification.weeklyGoalCompleted': { windowSize: 3, maxAge: 7 * 24 * 60 * 60 * 1000 },
  'gamification.almostLevelUp': { windowSize: 3, maxAge: 12 * 60 * 60 * 1000 },
  'gamification.almostAchievement': { windowSize: 3, maxAge: 24 * 60 * 60 * 1000 },
  'gamification.leaderboard.rankUp': { windowSize: 3, maxAge: 24 * 60 * 60 * 1000 },
  'gamification.leaderboard.topPercent': { windowSize: 2, maxAge: 7 * 24 * 60 * 60 * 1000 },
  'gamification.firstTime.firstLog': { windowSize: 1, maxAge: 365 * 24 * 60 * 60 * 1000 }, // Once per year
  'gamification.firstTime.firstStreak': { windowSize: 1, maxAge: 365 * 24 * 60 * 60 * 1000 },
  'gamification.firstTime.firstGoal': { windowSize: 1, maxAge: 365 * 24 * 60 * 60 * 1000 },
  'gamification.firstTime.firstAchievement': { windowSize: 1, maxAge: 365 * 24 * 60 * 60 * 1000 },

  // Default for unconfigured categories
  default: { windowSize: 3, maxAge: 24 * 60 * 60 * 1000 },
};

// ============================================================================
// MESSAGE FRESHNESS MANAGER CLASS
// ============================================================================

class MessageFreshnessManager {
  constructor() {
    this.history = new Map(); // category -> [{ index, timestamp }]
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize by loading persisted history
   */
  async initialize() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._loadFromStorage();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Pick a fresh message from an array, avoiding recent repeats
   *
   * @param {Array} messages - Array of messages to choose from
   * @param {string} category - Category key (e.g., 'hydration.logged')
   * @returns {any} - Selected message
   */
  pickFresh(messages, category) {
    if (!messages || messages.length === 0) return null;
    if (messages.length === 1) return messages[0];

    const config = FRESHNESS_CONFIG[category] || FRESHNESS_CONFIG.default;
    const recentHistory = this._getRecentHistory(category, config);

    // Get indices that are NOT in recent history
    const availableIndices = messages
      .map((_, index) => index)
      .filter(index => !recentHistory.includes(index));

    // If all messages have been shown recently, reset and pick any
    const pickFromIndices = availableIndices.length > 0
      ? availableIndices
      : messages.map((_, i) => i);

    // Random selection from available
    const selectedIndex = pickFromIndices[
      Math.floor(Math.random() * pickFromIndices.length)
    ];

    // Record this selection
    this._recordSelection(category, selectedIndex);

    return messages[selectedIndex];
  }

  /**
   * Pick fresh with a selector function (for dynamic messages)
   * Used when messages are generated with parameters
   *
   * @param {Array} messageGenerators - Array of message generator functions
   * @param {string} category - Category key
   * @param {...any} args - Arguments to pass to the generator
   * @returns {string} - Generated message
   */
  pickFreshGenerated(messageGenerators, category, ...args) {
    const selectedGenerator = this.pickFresh(messageGenerators, category);
    return typeof selectedGenerator === 'function'
      ? selectedGenerator(...args)
      : selectedGenerator;
  }

  /**
   * Get recent history for a category, filtered by config
   */
  _getRecentHistory(category, config) {
    const history = this.history.get(category) || [];
    const now = Date.now();

    // Filter by both window size and max age
    return history
      .filter(entry => (now - entry.timestamp) < config.maxAge)
      .slice(-config.windowSize)
      .map(entry => entry.index);
  }

  /**
   * Record a message selection
   */
  _recordSelection(category, index) {
    const history = this.history.get(category) || [];

    history.push({
      index,
      timestamp: Date.now(),
    });

    // Trim history to reasonable size (max 20 entries per category)
    const trimmed = history.slice(-20);
    this.history.set(category, trimmed);

    // Debounced persistence
    this._schedulePersist();
  }

  /**
   * Debounced persistence to avoid excessive writes
   */
  _schedulePersist() {
    if (this._persistTimeout) return;

    this._persistTimeout = setTimeout(() => {
      this._persistToStorage();
      this._persistTimeout = null;
    }, 5000); // Persist after 5 seconds of inactivity
  }

  /**
   * Persist history to AsyncStorage
   */
  async _persistToStorage() {
    try {
      const data = {};
      this.history.forEach((value, key) => {
        data[key] = value;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[MessageFreshness] Failed to persist:', error);
    }
  }

  /**
   * Load history from AsyncStorage
   */
  async _loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.history.set(key, value);
        });
      }
    } catch (error) {
      console.warn('[MessageFreshness] Failed to load:', error);
    }
  }

  /**
   * Clear all history (e.g., on logout)
   */
  async clearHistory() {
    this.history.clear();
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[MessageFreshness] Failed to clear:', error);
    }
  }

  /**
   * Get stats for debugging
   */
  getStats() {
    const stats = {};
    this.history.forEach((value, key) => {
      stats[key] = {
        totalShown: value.length,
        recentCount: value.filter(
          e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000
        ).length,
      };
    });
    return stats;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const messageFreshnessManager = new MessageFreshnessManager();

// ============================================================================
// CONVENIENCE WRAPPER FOR WITTY MESSAGES
// ============================================================================

/**
 * Enhanced pick function that uses freshness manager
 * Drop-in replacement for the basic pick() function
 */
export const pickFresh = (messages, category) => {
  return messageFreshnessManager.pickFresh(messages, category);
};

/**
 * Initialize freshness manager (call on app start)
 */
export const initializeMessageFreshness = () => {
  return messageFreshnessManager.initialize();
};

export default messageFreshnessManager;
