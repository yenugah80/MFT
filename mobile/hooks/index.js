/**
 * Hooks Index - Centralized exports for all custom hooks
 *
 * Usage:
 *   import { useFoodLog, useAnalytics, useDashboard } from '../hooks';
 */

// Data hooks
export { default as useFoodLog } from './useFoodLog';
export { default as useWaterLog } from './useWaterLog';
export { default as useMoodLog } from './useMoodLog';
export { default as useSleepLog } from './useSleepLog';
export { default as useStressLog } from './useStressLog';
export { default as useActivityLog } from './useActivityLog';

// Dashboard & Profile
export { useDashboard } from './useDashboard';
export { useProfile } from './useProfile';
export { default as useProfileForm } from './useProfileForm';
export { default as useGamification } from './useGamification';
export { default as useAchievements } from './useAchievements';

// Analytics & Intelligence
export { default as useAnalytics } from './useAnalytics';
export { default as useUnifiedAnalytics } from './useUnifiedAnalytics';
export { default as useIntelligence } from './useIntelligence';
export { default as useUnifiedIntelligence } from './useUnifiedIntelligence';
export { useOrchestrator } from './useOrchestrator';
export { default as useIntelligenceOrchestrator } from './useIntelligenceOrchestrator';

// Insights & Predictions
export { default as useInsights } from './useInsights';
export { default as useMoodInsights } from './useMoodInsights';
export { default as useWellnessInsights } from './useWellnessInsights';
export { default as usePredictions } from './usePredictions';
export { default as useMLPredictions } from './useMLPredictions';
export { default as usePredictionCheckIn } from './usePredictionCheckIn';
export { default as useOutcomes } from './useOutcomes';

// Recommendations
export { useRecommendations, useRecommendationHistory } from './useRecommendations';

// Activity & Hydration
export { default as useActivityAnalytics } from './useActivityAnalytics';
export { default as useHydrationAnalytics } from './useHydrationAnalytics';
export { default as useWellnessHistory } from './useWellnessHistory';
export { default as useMoodTrends } from './useMoodTrends';

// Food Analysis
export { default as useFoodAnalysis } from './useFoodAnalysis';
export { default as useCalendarData } from './useCalendarData';

// Voice
export { default as useBackendVoice } from './useBackendVoice';
export { default as useServerVoice } from './useServerVoice';
export { default as useInstantVoice } from './useInstantVoice';

// Utilities
export { default as useDebounce } from './useDebounce';
export { default as useErrorHandler } from './useErrorHandler';
export { default as usePersistedState } from './usePersistedState';
export { default as useResponsiveLayout } from './useResponsiveLayout';
export { default as useTheme } from './useTheme';

// Feature Flags & Preferences
export { default as useFeatureFlags } from './useFeatureFlags';
export { default as useFeatureAccess } from './useFeatureAccess';
export { default as usePreferences } from './usePreferences';

// Health & Metrics
export { default as useHealthMetrics } from './useHealthMetrics';

// Notifications & Reminders
export { default as useSmartNotifications } from './useSmartNotifications';
export { default as useSmartReminders } from './useSmartReminders';

// Security
export { default as useTurnstile } from './useTurnstile';

// Feedback
export { default as useInsightFeedback } from './useInsightFeedback';
