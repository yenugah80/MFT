/**
 * Output Ranker - Intelligence Layer 3
 *
 * Ranks, filters, and deduplicates recommendations to prevent:
 * - Recommendation fatigue (showing same advice repeatedly)
 * - Information overload (too many recommendations at once)
 * - Irrelevant advice (wrong time, wrong context)
 *
 * Uses:
 * - Urgency scoring (time-sensitive recommendations first)
 * - Recency tracking (avoid repeating recent advice)
 * - User response tracking (deprioritize ignored recommendations)
 * - Context matching (right advice at right time)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  SHOWN_RECOMMENDATIONS: '@output_ranker_shown',
  USER_RESPONSES: '@output_ranker_responses',
  DISMISSED_PATTERNS: '@output_ranker_dismissed',
  LAST_SHOWN_BY_TYPE: '@output_ranker_last_shown',
};

// ============================================================================
// CONSTANTS
// ============================================================================

const RECOMMENDATION_COOLDOWNS = {
  // Domain-level cooldowns (hours)
  nutrition: 4,
  hydration: 2,
  activity: 6,
  mood: 8,

  // Specific type cooldowns (hours)
  'nutrition.protein': 6,
  'nutrition.calories': 4,
  'nutrition.fiber': 12,
  'hydration.goal': 3,
  'hydration.reminder': 1.5,
  'activity.exercise': 8,
  'activity.movement': 4,
  'mood.checkin': 12,
  'mood.pattern': 24,
};

const MAX_RECOMMENDATIONS_PER_SESSION = 3;
const MAX_PATTERNS_SHOWN = 2;
const IGNORED_PENALTY_DAYS = 7; // Deprioritize for 7 days if ignored 3+ times

// ============================================================================
// OUTPUT RANKER CLASS
// ============================================================================

export class OutputRanker {
  constructor() {
    this.sessionShown = new Set();
    this.sessionStartTime = Date.now();
    this.loaded = false;
    this.shownHistory = {};
    this.userResponses = {};
    this.dismissedPatterns = new Set();
  }

  /**
   * Load persisted state from storage
   */
  async loadState() {
    if (this.loaded) return;

    try {
      const [shown, responses, dismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SHOWN_RECOMMENDATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_RESPONSES),
        AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_PATTERNS),
      ]);

      this.shownHistory = shown ? JSON.parse(shown) : {};
      this.userResponses = responses ? JSON.parse(responses) : {};
      this.dismissedPatterns = new Set(dismissed ? JSON.parse(dismissed) : []);
      this.loaded = true;
    } catch (error) {
      console.warn('[OutputRanker] Failed to load state:', error);
    }
  }

  /**
   * Save state to persistent storage
   */
  async saveState() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SHOWN_RECOMMENDATIONS, JSON.stringify(this.shownHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.USER_RESPONSES, JSON.stringify(this.userResponses)),
        AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_PATTERNS, JSON.stringify([...this.dismissedPatterns])),
      ]);
    } catch (error) {
      console.warn('[OutputRanker] Failed to save state:', error);
    }
  }

  /**
   * Rank and filter recommendations
   *
   * @param {Array} recommendations - Raw recommendations from Decision Brain
   * @param {Object} context - Context from ContextBuilder
   * @returns {Array} - Ranked, filtered recommendations
   */
  async rankRecommendations(recommendations, context) {
    await this.loadState();

    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    const now = Date.now();
    const scored = [];

    for (const rec of recommendations) {
      // Skip if on cooldown
      if (this.isOnCooldown(rec, now)) {
        continue;
      }

      // Skip if user has repeatedly ignored this type
      if (this.isUserFatigued(rec)) {
        continue;
      }

      // Calculate composite score
      const score = this.calculateScore(rec, context, now);

      if (score > 0) {
        scored.push({
          ...rec,
          _rankScore: score,
          _scoreBreakdown: this.getScoreBreakdown(rec, context, now),
        });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b._rankScore - a._rankScore);

    // Limit to max per session
    const limited = scored.slice(0, MAX_RECOMMENDATIONS_PER_SESSION);

    // Record that we're showing these
    limited.forEach(rec => {
      this.recordShown(rec);
    });

    await this.saveState();

    return limited;
  }

  /**
   * Rank and filter patterns (more aggressive deduplication)
   *
   * @param {Array} patterns - Detected patterns from Decision Brain
   * @param {Object} context - Context from ContextBuilder
   * @returns {Array} - Ranked, filtered patterns
   */
  async rankPatterns(patterns, context) {
    await this.loadState();

    if (!patterns || patterns.length === 0) {
      return [];
    }

    // Filter out dismissed patterns
    const notDismissed = patterns.filter(p =>
      !this.dismissedPatterns.has(this.getPatternKey(p))
    );

    // Score remaining patterns
    const scored = notDismissed.map(pattern => {
      const score = this.calculatePatternScore(pattern, context);
      return {
        ...pattern,
        _rankScore: score,
      };
    });

    // Sort and limit
    scored.sort((a, b) => b._rankScore - a._rankScore);
    return scored.slice(0, MAX_PATTERNS_SHOWN);
  }

  /**
   * Calculate composite score for a recommendation
   */
  calculateScore(rec, context, now) {
    let score = 50; // Base score

    // 1. Urgency boost (0-30 points)
    const urgency = this.getUrgencyScore(rec, context);
    score += urgency * 30;

    // 2. Relevance boost (0-20 points)
    const relevance = this.getRelevanceScore(rec, context);
    score += relevance * 20;

    // 3. Freshness penalty (0 to -20 points)
    const lastShown = this.shownHistory[this.getRecKey(rec)]?.lastShown;
    if (lastShown) {
      const hoursSince = (now - lastShown) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        score -= (24 - hoursSince) * 0.8; // Up to -20 if shown recently
      }
    }

    // 4. User engagement boost (0-15 points)
    const engagement = this.getUserEngagementScore(rec);
    score += engagement * 15;

    // 5. Priority boost (0-15 points)
    if (rec.priority === 'high') score += 15;
    else if (rec.priority === 'medium') score += 8;

    // 6. Confidence boost (0-10 points)
    if (rec.confidence) {
      score += rec.confidence * 10;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate urgency score based on context
   */
  getUrgencyScore(rec, context) {
    const domain = rec.domain || this.inferDomain(rec);
    const urgencyData = context?.urgencies?.[domain];

    if (urgencyData) {
      return urgencyData.urgency || 0;
    }

    // Time-based urgency
    const hour = new Date().getHours();
    const hoursLeft = 24 - hour;

    // Evening urgency boost for unmet goals
    if (hoursLeft <= 4) {
      return 0.8;
    } else if (hoursLeft <= 8) {
      return 0.5;
    }

    return 0.3;
  }

  /**
   * Calculate relevance score based on context
   */
  getRelevanceScore(rec, context) {
    let relevance = 0.5; // Base

    const domain = rec.domain || this.inferDomain(rec);
    const goals = context?.goals?.[domain];
    const temporal = context?.temporal;
    const userState = context?.userState;

    // Check if recommendation matches current need
    if (goals) {
      if (goals.status === 'behind' || goals.status === 'started') {
        relevance += 0.3; // User needs help with this
      }
      if (goals.status === 'almost') {
        relevance += 0.2; // Close to goal, encourage finish
      }
    }

    // Time-of-day relevance
    if (temporal?.mealWindow && domain === 'nutrition') {
      relevance += 0.2; // Nutrition advice during meal windows
    }
    if (temporal?.hydrationWindow && domain === 'hydration') {
      relevance += 0.2;
    }
    if (temporal?.activityWindow && domain === 'activity') {
      relevance += 0.15;
    }

    // Recent activity relevance
    if (userState) {
      if (domain === 'hydration' && userState.hoursSinceWater > 2) {
        relevance += 0.25;
      }
      if (domain === 'nutrition' && userState.hoursSinceFood > 4) {
        relevance += 0.2;
      }
    }

    return Math.min(1, relevance);
  }

  /**
   * Get user engagement score based on past responses
   */
  getUserEngagementScore(rec) {
    const key = this.getRecKey(rec);
    const response = this.userResponses[key];

    if (!response) return 0.5; // Neutral

    const { acted, ignored, dismissed } = response;
    const total = acted + ignored + dismissed;

    if (total === 0) return 0.5;

    // High action rate = boost
    const actionRate = acted / total;
    if (actionRate > 0.5) return actionRate;

    // High dismiss rate = penalty
    const dismissRate = dismissed / total;
    if (dismissRate > 0.3) return -dismissRate * 0.5;

    return 0.3;
  }

  /**
   * Calculate pattern score
   */
  calculatePatternScore(pattern, context) {
    let score = 50;

    // Confidence boost
    if (pattern.confidence) {
      score += pattern.confidence * 30;
    }

    // Occurrence frequency boost
    if (pattern.occurrences > 5) {
      score += 15;
    } else if (pattern.occurrences > 3) {
      score += 10;
    }

    // Recency boost
    if (pattern.recentlyObserved) {
      score += 10;
    }

    // Impact magnitude boost
    if (pattern.impact && Math.abs(pattern.impact) > 0.5) {
      score += 20;
    }

    return score;
  }

  /**
   * Check if recommendation is on cooldown
   */
  isOnCooldown(rec, now) {
    const key = this.getRecKey(rec);
    const lastShown = this.shownHistory[key]?.lastShown;

    if (!lastShown) return false;

    const domain = rec.domain || this.inferDomain(rec);
    const type = rec.type || 'general';
    const specificKey = `${domain}.${type}`;

    const cooldownHours = RECOMMENDATION_COOLDOWNS[specificKey] ||
                          RECOMMENDATION_COOLDOWNS[domain] ||
                          4;

    const hoursSince = (now - lastShown) / (1000 * 60 * 60);
    return hoursSince < cooldownHours;
  }

  /**
   * Check if user is fatigued from this recommendation type
   */
  isUserFatigued(rec) {
    const key = this.getRecKey(rec);
    const response = this.userResponses[key];

    if (!response) return false;

    // If ignored 3+ times in last 7 days, user is fatigued
    const recentIgnores = response.ignoreTimestamps?.filter(ts =>
      Date.now() - ts < IGNORED_PENALTY_DAYS * 24 * 60 * 60 * 1000
    ).length || 0;

    return recentIgnores >= 3;
  }

  /**
   * Record that a recommendation was shown
   */
  recordShown(rec) {
    const key = this.getRecKey(rec);

    if (!this.shownHistory[key]) {
      this.shownHistory[key] = {
        firstShown: Date.now(),
        showCount: 0,
      };
    }

    this.shownHistory[key].lastShown = Date.now();
    this.shownHistory[key].showCount += 1;

    // Track in session
    this.sessionShown.add(key);
  }

  /**
   * Record user response to a recommendation
   */
  async recordResponse(rec, responseType) {
    await this.loadState();

    const key = this.getRecKey(rec);

    if (!this.userResponses[key]) {
      this.userResponses[key] = {
        acted: 0,
        ignored: 0,
        dismissed: 0,
        ignoreTimestamps: [],
        dismissTimestamps: [],
        lastResponse: null,
      };
    }

    const response = this.userResponses[key];
    response.lastResponse = Date.now();

    switch (responseType) {
      case 'acted':
        response.acted += 1;
        break;
      case 'ignored':
        response.ignored += 1;
        response.ignoreTimestamps.push(Date.now());
        // Keep only last 10 timestamps
        response.ignoreTimestamps = response.ignoreTimestamps.slice(-10);
        break;
      case 'dismissed':
        response.dismissed += 1;
        response.dismissTimestamps.push(Date.now());
        response.dismissTimestamps = response.dismissTimestamps.slice(-10);
        break;
    }

    await this.saveState();
  }

  /**
   * Dismiss a pattern (won't show again)
   */
  async dismissPattern(pattern) {
    await this.loadState();
    this.dismissedPatterns.add(this.getPatternKey(pattern));
    await this.saveState();
  }

  /**
   * Get breakdown of score components (for debugging/analytics)
   */
  getScoreBreakdown(rec, context, now) {
    return {
      base: 50,
      urgency: Math.round(this.getUrgencyScore(rec, context) * 30),
      relevance: Math.round(this.getRelevanceScore(rec, context) * 20),
      engagement: Math.round(this.getUserEngagementScore(rec) * 15),
      priority: rec.priority === 'high' ? 15 : rec.priority === 'medium' ? 8 : 0,
      confidence: rec.confidence ? Math.round(rec.confidence * 10) : 0,
    };
  }

  /**
   * Infer domain from recommendation content
   */
  inferDomain(rec) {
    const text = (rec.title + ' ' + (rec.description || '')).toLowerCase();

    if (text.includes('water') || text.includes('hydrat') || text.includes('drink')) {
      return 'hydration';
    }
    if (text.includes('protein') || text.includes('calorie') || text.includes('meal') || text.includes('eat')) {
      return 'nutrition';
    }
    if (text.includes('exercise') || text.includes('active') || text.includes('movement') || text.includes('walk')) {
      return 'activity';
    }
    if (text.includes('mood') || text.includes('feel') || text.includes('energy')) {
      return 'mood';
    }

    return 'general';
  }

  /**
   * Generate unique key for recommendation
   */
  getRecKey(rec) {
    const domain = rec.domain || this.inferDomain(rec);
    const type = rec.type || rec.id || 'general';
    return `${domain}:${type}`;
  }

  /**
   * Generate unique key for pattern
   */
  getPatternKey(pattern) {
    return pattern.id || `${pattern.category || 'general'}:${pattern.title?.slice(0, 20) || 'unknown'}`;
  }

  /**
   * Reset session (call when app comes to foreground after long time)
   */
  resetSession() {
    this.sessionShown.clear();
    this.sessionStartTime = Date.now();
  }

  /**
   * Get statistics for analytics
   */
  getStats() {
    return {
      sessionShownCount: this.sessionShown.size,
      totalTrackedRecs: Object.keys(this.shownHistory).length,
      totalTrackedResponses: Object.keys(this.userResponses).length,
      dismissedPatternsCount: this.dismissedPatterns.size,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const outputRanker = new OutputRanker();
export default outputRanker;
