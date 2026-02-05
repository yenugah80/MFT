/**
 * Services Index
 *
 * Central export point for all production services.
 * Import from here for cleaner imports throughout the codebase.
 */

// Core Analytics & Monitoring
export { default as analyticsEventPipeline, AnalyticsEventPipeline } from './analyticsEventPipeline.js';
export { default as performanceMonitoringService } from './performanceMonitoringService.js';
export { default as abTestingFramework } from './abTestingFramework.js';

// Personalization & Recommendations
export { default as feedbackLoopService } from './feedbackLoopService.js';
export { default as contextAwareEngine } from './contextAwareEngine.js';
export { default as smartNotificationEngine } from './smartNotificationEngine.js';

// Health & Gamification
export { default as healthPlatformService } from './healthPlatformService.js';
export { default as enhancedGamificationService } from './enhancedGamificationService.js';

// Existing Services
export { default as smartNutritionResolver } from './smartNutritionResolver.js';
export { default as smartRecommendationEngine } from './smartRecommendationEngine.js';
