/**
 * Analytics tracking for Behavioral Health Intelligence System
 *
 * Tracks user interactions with recommendations, patterns, and decisions
 * Integrates with existing analytics service (if available)
 */

import apiClient from '../services/apiClient';

/**
 * Event types for intelligence system
 */
export const INTELLIGENCE_EVENTS = {
  // Decision events
  DECISION_SHOWN: 'intelligence_decision_shown',
  DECISION_ACTED: 'intelligence_decision_acted',
  DECISION_DISMISSED: 'intelligence_decision_dismissed',

  // Pattern events
  PATTERN_VIEWED: 'intelligence_pattern_viewed',
  PATTERN_EXPANDED: 'intelligence_pattern_expanded',
  PATTERN_COLLAPSED: 'intelligence_pattern_collapsed',

  // Feedback events
  FEEDBACK_SUBMITTED: 'intelligence_feedback_submitted',
  ACTION_TAKEN: 'intelligence_action_taken',

  // Learning events
  LEARNING_GATE_TRIGGERED: 'intelligence_learning_gate_triggered',
  LIFECYCLE_STAGE_CHANGED: 'intelligence_lifecycle_stage_changed',
};

/**
 * Track intelligence event
 * @param {string} eventType - Event type from INTELLIGENCE_EVENTS
 * @param {Object} data - Event data
 */
export async function trackIntelligenceEvent(eventType, data = {}) {
  try {
    await apiClient.post('/analytics/event', {
      eventType,
      timestamp: new Date().toISOString(),
      data: {
        // Always include basic context
        ...data,
      },
    });
  } catch (error) {
    // Silently fail analytics - don't interrupt user experience
    console.debug('[IntelligenceAnalytics] Event tracking failed:', error);
  }
}

/**
 * Track decision display
 * @param {Object} decision - Decision object
 * @param {Object} context - Additional context
 */
export function trackDecisionShown(decision, context = {}) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.DECISION_SHOWN, {
    decisionType: decision?.type,
    confidence: decision?.confidence,
    hasActions: Boolean(decision?.actions?.length),
    hasCorrelations: Boolean(context?.correlationsCount),
    lifecycleStage: context?.lifecycleStage,
  });
}

/**
 * Track user action on decision
 * @param {string} actionType - Type of action taken
 * @param {Object} context - Additional context
 */
export function trackDecisionAction(actionType, context = {}) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.DECISION_ACTED, {
    actionType,
    decisionType: context?.decisionType,
    confidence: context?.confidence,
    timeToAction: context?.timeToActionMs,
  });
}

/**
 * Track pattern dismissal
 * @param {string} dismissReason - Reason for dismissal
 * @param {Object} context - Additional context
 */
export function trackPatternDismissed(dismissReason, context = {}) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.DECISION_DISMISSED, {
    dismissReason,
    pattern: context?.pattern,
    confidence: context?.confidence,
    timeToAction: context?.timeToActionMs,
  });
}

/**
 * Track pattern expansion/view
 * @param {Object} pattern - Pattern object
 */
export function trackPatternViewed(pattern) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.PATTERN_VIEWED, {
    patternId: pattern?.id,
    pattern: pattern?.pattern,
    confidence: pattern?.confidence,
    occurrences: pattern?.occurrences,
  });
}

/**
 * Track feedback submission
 * @param {string} feedbackType - Type of feedback
 * @param {Object} context - Additional context
 */
export function trackFeedbackSubmitted(feedbackType, context = {}) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.FEEDBACK_SUBMITTED, {
    feedbackType,
    correlationId: context?.correlationId,
    decisionType: context?.decisionType,
    success: context?.success,
    error: context?.error,
  });
}

/**
 * Track lifecycle stage change
 * @param {string} newStage - New stage name
 * @param {Object} context - Additional context
 */
export function trackLifecycleStageChanged(newStage, context = {}) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.LIFECYCLE_STAGE_CHANGED, {
    newStage,
    previousStage: context?.previousStage,
    daysSinceStart: context?.daysSinceStart,
    dataPoints: context?.dataPoints,
  });
}

/**
 * Track learning gate trigger
 * @param {string} gateName - Name of learning gate (e.g., 'canShowCorrelations')
 * @param {boolean} triggered - Whether gate is now active
 * @param {Object} context - Additional context
 */
export function trackLearningGateTriggered(gateName, triggered, context = {}) {
  trackIntelligenceEvent(INTELLIGENCE_EVENTS.LEARNING_GATE_TRIGGERED, {
    gateName,
    triggered,
    dataCount: context?.dataCount,
    threshold: context?.threshold,
  });
}
