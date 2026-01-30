/**
 * Utils Index - Centralized exports for utility functions
 *
 * Usage:
 *   import { dateHelpers, haptics, storage } from '../utils';
 */

// Date & Time
export * as dateHelpers from './dateHelpers';

// Storage & Persistence
export { default as storage } from './storage';
export { default as offlineQueue } from './offlineQueue';
export { default as queryPersistence } from './queryPersistence';
export { default as preferences } from './preferences';

// UI & Feedback
export { default as haptics } from './haptics';
export { default as hapticFeedback } from './hapticFeedback';
export * as animations from './animations';
export { default as profileAnimations } from './profileAnimations';
export { default as responsiveLayout } from './responsiveLayout';

// Error Handling
export { default as errorHandler } from './errorHandler';
export * as errors from './errors';

// Validation
export { default as profileValidation } from './profileValidation';
export { default as sanitizeGoalsForApi } from './sanitizeGoalsForApi';
export { default as safeNumbers } from './safeNumbers';

// Nutrition Calculations
export { default as nutritionTargets } from './nutritionTargets';
export { default as nutritionNormalizer } from './nutritionNormalizer';
export { default as microsCalculations } from './microsCalculations';
export { default as macroBalance } from './macroBalance';
export { default as healthCalculations } from './healthCalculations';
export { default as healthMetrics } from './healthMetrics';

// Food & Mood Analysis
export { default as wellnessScore } from './wellnessScore';
export { default as moodNutrients } from './moodNutrients';
export { default as moodAggregation } from './moodAggregation';
export { default as allergenDetection } from './allergenDetection';
export { default as cuisineDiversity } from './cuisineDiversity';

// Activity
export { default as activityAnalytics } from './activityAnalytics';
export { default as activityNutrition } from './activityNutrition';

// Intelligence & Analytics
export { default as bodyIntelligenceEngine } from './bodyIntelligenceEngine';
export { default as smartWellnessEngine } from './smartWellnessEngine';
export { default as personalizedPatternEngine } from './personalizedPatternEngine';
export { default as intelligenceAnalytics } from './intelligenceAnalytics';
export { default as multiFactorAnalytics } from './multiFactorAnalytics';
export { default as confidenceUtils } from './confidenceUtils';

// Onboarding
export { default as onboardingCalculations } from './onboardingCalculations';
export { default as onboardingSmartSuggestions } from './onboardingSmartSuggestions';

// Compliance
export { default as complianceCalculations } from './complianceCalculations';

// Messaging
export { default as wittyMessages } from './wittyMessages';
export { default as notify } from './notify';

// Auth
export { default as auth } from './auth';

// IDs
export { default as idGenerator } from './idGenerator';

// Parsing
export { default as numberParsing } from './numberParsing';
export { default as processingLabels } from './processingLabels';

// Logging
export { default as logger } from './logger';
