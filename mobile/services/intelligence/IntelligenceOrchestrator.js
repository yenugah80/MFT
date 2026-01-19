/**
 * Intelligence Orchestrator - Unified Intelligence Pipeline
 *
 * This is the MAIN entry point for all intelligent features.
 * It orchestrates the full pipeline:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    USER INTERACTION                         │
 * └─────────────────────────┬───────────────────────────────────┘
 *                           │
 *                           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              CONTEXT BUILDER (Layer 1)                      │
 * │  - Time of day, meal windows                                │
 * │  - Recent activity (last 2 hours)                           │
 * │  - Goal progress and urgencies                              │
 * │  - User engagement state                                    │
 * └─────────────────────────┬───────────────────────────────────┘
 *                           │
 *                           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              DECISION BRAIN (Layer 2 - Backend)             │
 * │  - Correlation Engine                                       │
 * │  - Thompson Sampling                                        │
 * │  - Pattern Detection                                        │
 * │  - ML-powered Recommendations                               │
 * └─────────────────────────┬───────────────────────────────────┘
 *                           │
 *                           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              OUTPUT RANKER (Layer 3)                        │
 * │  - Urgency scoring                                          │
 * │  - Fatigue prevention                                       │
 * │  - User response tracking                                   │
 * │  - Deduplication                                            │
 * └─────────────────────────┬───────────────────────────────────┘
 *                           │
 *                           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              DELIVERY ENGINE (Layer 4)                      │
 * │  - Witty copy selection (150+ variations)                   │
 * │  - Channel selection (in-app vs push)                       │
 * │  - Personalization by user state                            │
 * └─────────────────────────┬───────────────────────────────────┘
 *                           │
 *                           ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    FINAL OUTPUT                             │
 * │  - Ranked recommendations with witty copy                   │
 * │  - Filtered patterns                                        │
 * │  - Delivery instructions                                    │
 * └─────────────────────────────────────────────────────────────┘
 */

import { contextBuilder } from './ContextBuilder';
import { outputRanker } from './OutputRanker';
import { deliveryEngine, WITTY_COPY } from './DeliveryEngine';
import apiClient from '../apiClient';
import {
  analyzeWellness,
  analyzeFoodMoodCorrelations,
  generateSmartRecommendations,
} from '../../utils/smartWellnessEngine';
import { trackIntelligenceEvent, INTELLIGENCE_EVENTS } from '../../utils/intelligenceAnalytics';

// ============================================================================
// INTELLIGENCE ORCHESTRATOR CLASS
// ============================================================================

export class IntelligenceOrchestrator {
  constructor() {
    this.lastOrchestration = null;
    this.cache = new Map();
    this.cacheExpiry = 2 * 60 * 1000; // 2 minutes
    this.isAppActive = true;
  }

  /**
   * Main orchestration method - runs the full pipeline
   *
   * @param {Object} options
   * @param {Object} options.dashboardData - Data from useDashboard hook
   * @param {Object} options.decisionBrainData - Data from Decision Brain hooks
   * @param {Object} options.recentLogs - Recent logs from various sources
   * @param {Object} options.historicalPatterns - Historical pattern data
   * @param {string} options.domain - Optional: filter to specific domain
   * @returns {Object} - Orchestrated intelligence output
   */
  async orchestrate({
    dashboardData,
    decisionBrainData,
    recentLogs = {},
    historicalPatterns = {},
    domain = 'all',
  }) {
    const startTime = Date.now();

    try {
      // ========== LAYER 1: BUILD CONTEXT ==========
      const context = contextBuilder.buildContext({
        dashboardData,
        recentLogs,
        userPreferences: dashboardData?.userPreferences || {},
        historicalPatterns,
      });

      // ========== LAYER 2: GET DECISION BRAIN DATA ==========
      // (Already passed in from hooks, but we can augment)
      const rawRecommendations = this.extractRecommendations(decisionBrainData, domain);
      const rawPatterns = this.extractPatterns(decisionBrainData, domain);
      const rawCorrelations = this.extractCorrelations(decisionBrainData, domain);

      // If no Decision Brain data, fall back to local smartWellnessEngine
      let augmentedRecommendations = rawRecommendations;
      if (rawRecommendations.length === 0 && dashboardData) {
        const localAnalysis = analyzeWellness({
          today: dashboardData.today,
          goals: dashboardData.goals,
          historicalData: dashboardData.historicalData || [],
          streak: dashboardData.gamification?.streak || 0,
        });
        augmentedRecommendations = localAnalysis.recommendations || [];
      }

      // ========== LAYER 3: RANK & FILTER ==========
      const rankedRecommendations = await outputRanker.rankRecommendations(
        augmentedRecommendations,
        context
      );
      const rankedPatterns = await outputRanker.rankPatterns(rawPatterns, context);

      // ========== LAYER 4: APPLY WITTY COPY ==========
      const finalRecommendations = rankedRecommendations.map(rec =>
        deliveryEngine.selectCopy(rec, context)
      );

      // ========== COMPILE FINAL OUTPUT ==========
      const output = {
        // Main outputs
        recommendations: finalRecommendations,
        patterns: rankedPatterns,
        correlations: rawCorrelations,

        // Context summary
        context: {
          timeOfDay: context.temporal.mealWindow?.label || deliveryEngine.getTimeOfDay(),
          userState: context.engagement.state,
          priorityDomain: context.urgencies.priorityDomain,
          priorityUrgency: context.urgencies.priorityUrgency,
          hoursRemaining: context.temporal.hoursRemaining,
        },

        // Hero message (top recommendation with witty copy)
        heroMessage: this.buildHeroMessage(finalRecommendations, context),

        // Quick actions based on urgencies
        quickActions: this.buildQuickActions(context),

        // Delivery instructions
        delivery: {
          channel: deliveryEngine.getDeliveryChannel(
            finalRecommendations[0],
            { ...context, isAppActive: this.isAppActive }
          ),
          shouldBatch: deliveryEngine.shouldBatch(finalRecommendations, context),
        },

        // Stats for analytics
        stats: {
          orchestrationMs: Date.now() - startTime,
          recommendationsInput: augmentedRecommendations.length,
          recommendationsOutput: finalRecommendations.length,
          patternsInput: rawPatterns.length,
          patternsOutput: rankedPatterns.length,
          rankerStats: outputRanker.getStats(),
        },

        // Metadata
        meta: {
          orchestratedAt: new Date().toISOString(),
          domain,
          hasData: finalRecommendations.length > 0 || rankedPatterns.length > 0,
        },
      };

      // Track orchestration
      trackIntelligenceEvent(INTELLIGENCE_EVENTS.DECISION_SHOWN, {
        recommendationsCount: output.recommendations.length,
        patternsCount: output.patterns.length,
        domain,
        userState: context.engagement.state,
      });

      this.lastOrchestration = output;
      return output;

    } catch (error) {
      console.error('[IntelligenceOrchestrator] Orchestration failed:', error);

      // Return minimal fallback
      return {
        recommendations: [],
        patterns: [],
        correlations: [],
        context: null,
        heroMessage: null,
        quickActions: [],
        delivery: { channel: 'in_app', shouldBatch: false },
        stats: { error: error.message },
        meta: { orchestratedAt: new Date().toISOString(), hasData: false },
      };
    }
  }

  /**
   * Get orchestrated recommendations for a specific domain
   */
  async getRecommendationsForDomain(domain, dashboardData, decisionBrainData) {
    const result = await this.orchestrate({
      dashboardData,
      decisionBrainData,
      domain,
    });
    return result.recommendations;
  }

  /**
   * Build hero message (top recommendation with extra polish)
   */
  buildHeroMessage(recommendations, context) {
    if (recommendations.length === 0) {
      // Check user state for engagement message
      const engagementMsg = deliveryEngine.getEngagementMessage(context.engagement.state);
      return {
        type: 'engagement',
        title: engagementMsg,
        description: 'Your wellness journey continues!',
        icon: 'sparkles',
        color: '#6B4EFF',
      };
    }

    const top = recommendations[0];
    const urgency = context.urgencies[top.domain];

    return {
      type: 'recommendation',
      title: top.title,
      description: top.description,
      icon: top.icon || this.getDomainIcon(top.domain),
      color: this.getDomainColor(top.domain),
      domain: top.domain,
      urgency: urgency?.urgency || 0.5,
      action: top.action,
      scoreBreakdown: top._scoreBreakdown,
    };
  }

  /**
   * Build quick actions based on context urgencies
   */
  buildQuickActions(context) {
    const actions = [];
    const urgencies = context.urgencies;

    // Sort domains by urgency
    const domainUrgencies = [
      { domain: 'nutrition', urgency: urgencies.nutrition?.urgency || 0 },
      { domain: 'hydration', urgency: urgencies.hydration?.urgency || 0 },
      { domain: 'activity', urgency: urgencies.activity?.urgency || 0 },
    ].sort((a, b) => b.urgency - a.urgency);

    // Top 2 urgent domains become quick actions
    domainUrgencies.slice(0, 2).forEach(({ domain, urgency }) => {
      if (urgency > 0.3) {
        actions.push({
          domain,
          label: this.getQuickActionLabel(domain),
          icon: this.getDomainIcon(domain),
          color: this.getDomainColor(domain),
          urgency,
          route: this.getDomainRoute(domain),
        });
      }
    });

    // Always include mood if user hasn't logged today
    if (!context.userState.hasLoggedMoodToday) {
      actions.push({
        domain: 'mood',
        label: 'Log Mood',
        icon: 'happy-outline',
        color: '#F59E0B',
        urgency: 0.4,
        route: '/log/mood',
      });
    }

    return actions.slice(0, 3); // Max 3 quick actions
  }

  /**
   * Extract recommendations from Decision Brain data
   */
  extractRecommendations(data, domain) {
    if (!data) return [];

    const recommendations = [];

    // Handle different data structures
    if (Array.isArray(data.recommendations)) {
      recommendations.push(...data.recommendations);
    }

    // For domain-specific hooks
    if (domain !== 'all' && data.success) {
      if (data.recommendations) {
        recommendations.push(...data.recommendations.map(r => ({
          ...r,
          domain,
        })));
      }
    }

    return recommendations;
  }

  /**
   * Extract patterns from Decision Brain data
   */
  extractPatterns(data, domain) {
    if (!data) return [];

    if (Array.isArray(data.patterns)) {
      return data.patterns.map(p => ({
        ...p,
        domain: p.domain || domain,
      }));
    }

    return [];
  }

  /**
   * Extract correlations from Decision Brain data
   */
  extractCorrelations(data, domain) {
    if (!data) return [];

    if (Array.isArray(data.correlations)) {
      return data.correlations;
    }

    return [];
  }

  /**
   * Get domain icon
   */
  getDomainIcon(domain) {
    const icons = {
      nutrition: 'restaurant-outline',
      hydration: 'water-outline',
      activity: 'fitness-outline',
      mood: 'happy-outline',
    };
    return icons[domain] || 'sparkles-outline';
  }

  /**
   * Get domain color
   */
  getDomainColor(domain) {
    const colors = {
      nutrition: '#10B981',
      hydration: '#3B82F6',
      activity: '#EF4444',
      mood: '#F59E0B',
    };
    return colors[domain] || '#6B4EFF';
  }

  /**
   * Get quick action label
   */
  getQuickActionLabel(domain) {
    const labels = {
      nutrition: 'Log Meal',
      hydration: 'Log Water',
      activity: 'Log Activity',
      mood: 'Log Mood',
    };
    return labels[domain] || 'Log';
  }

  /**
   * Get domain route
   */
  getDomainRoute(domain) {
    const routes = {
      nutrition: '/(tabs)/log',
      hydration: '/(tabs)/dashboard',
      activity: '/(tabs)/log',
      mood: '/(tabs)/dashboard',
    };
    return routes[domain] || '/(tabs)/dashboard';
  }

  /**
   * Record user response to recommendation
   */
  async recordResponse(recommendation, responseType) {
    await outputRanker.recordResponse(recommendation, responseType);

    trackIntelligenceEvent(INTELLIGENCE_EVENTS.DECISION_ACTED, {
      actionType: responseType,
      domain: recommendation.domain,
      recType: recommendation.type,
    });
  }

  /**
   * Dismiss a pattern
   */
  async dismissPattern(pattern) {
    await outputRanker.dismissPattern(pattern);

    trackIntelligenceEvent(INTELLIGENCE_EVENTS.DECISION_DISMISSED, {
      patternId: pattern.id,
      category: pattern.category,
    });
  }

  /**
   * Set app active state (affects delivery channel selection)
   */
  setAppActive(isActive) {
    this.isAppActive = isActive;
  }

  /**
   * Get success message for completed action
   */
  getSuccessMessage(domain, action, data = {}) {
    return deliveryEngine.getSuccessMessage(domain, action, data);
  }

  /**
   * Get streak message
   */
  getStreakMessage(domain, days) {
    return deliveryEngine.getStreakMessage(domain, days);
  }

  /**
   * Get pattern message
   */
  getPatternMessage(domain, impactType) {
    return deliveryEngine.getPatternMessage(domain, impactType);
  }

  /**
   * Clear caches (call on logout)
   */
  clearCaches() {
    this.cache.clear();
    this.lastOrchestration = null;
    outputRanker.resetSession();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const intelligenceOrchestrator = new IntelligenceOrchestrator();
export default intelligenceOrchestrator;

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export { WITTY_COPY } from './DeliveryEngine';
export { contextBuilder } from './ContextBuilder';
export { outputRanker } from './OutputRanker';
export { deliveryEngine } from './DeliveryEngine';
