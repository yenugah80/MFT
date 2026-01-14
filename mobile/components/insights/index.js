/**
 * Insights Components - Unified Exports
 *
 * This barrel file exports all reusable insight components
 * to ensure consistent usage across screens.
 *
 * Components:
 * - HalfGaugeChart: Beautiful semicircular progress visualization
 * - ColdStartCard: Onboarding state for new users
 * - PersonaCard: User persona display with recommendations
 * - InsightFeedback: User feedback collection
 * - RelatedInsights: Cross-linking navigation component
 */

// Gauge Charts
export { default as HalfGaugeChart, MiniHalfGauge, ComparisonGauge } from './HalfGaugeChart';

// Cold Start
export { default as ColdStartCard, ColdStartProgress } from './ColdStartCard';

// Persona
export { default as PersonaCard, PersonaBadge, PersonaProgress } from './PersonaCard';

// Feedback
export { default as InsightFeedback, InlineFeedback, StarRating } from './InsightFeedback';

// Navigation / Cross-linking
export { default as RelatedInsights, RelatedInsightLink } from './RelatedInsights';
