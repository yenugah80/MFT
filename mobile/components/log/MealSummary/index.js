/**
 * MealSummary Module Exports
 * Premium meal analysis UI components
 */

export { default as MealSummaryScreen } from './MealSummaryScreen';
export { default as MealScoreDial } from './MealScoreDial';
export { default as NutriScoreCard } from './NutriScoreCard';
export { default as MacroProgressSection } from './MacroProgressSection';
export { default as IngredientsSection } from './IngredientsSection';
export { default as MicrosGrid } from './MicrosGrid';
export { default as ActionButtons } from './ActionButtons';

// Utility exports
export { calculateMealScore, getScoreLabel } from './MealScoreDial';
export { calculateNutriScoreGrade, NUTRITION_GRADES } from './NutriScoreCard';
