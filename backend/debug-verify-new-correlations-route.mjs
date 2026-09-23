import { computeUserCorrelations } from './src/services/correlationEngineService.js';
import {
  filterAndDeduplicateCorrelations,
  formatCorrelationTitle,
  generateSuggestionForCorrelation,
} from './src/services/decisionBrainService.js';

const FOOD_MOOD_CORRELATION_TYPES = ['mood_food', 'stress_eating', 'meal_timing_mood', 'carryover_next_day'];
const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

const result = await computeUserCorrelations(userId, { windowTypes: ['7d', '14d'] });
console.log(`Total correlations found: ${result.correlations.length}`);
console.log('correlationTypes present:', [...new Set(result.correlations.map(c => c.correlationType))]);

const foodMood = result.correlations.filter(c => FOOD_MOOD_CORRELATION_TYPES.includes(c.correlationType));
console.log(`\nFood-mood correlations: ${foodMood.length}`);

const deduped = filterAndDeduplicateCorrelations(foodMood, 5, 0.6);
console.log(`After dedup/threshold filter: ${deduped.length}`);

const transformed = deduped.slice(0, 5).map(c => ({
  id: c.ruleName,
  pattern: formatCorrelationTitle(c.ruleName),
  explanation: c.expectedOutcome,
  confidence: Math.round((parseFloat(c.confidence) || 0) * 100),
  occurrences: c.occurrences || 0,
  suggestion: generateSuggestionForCorrelation(c) || c.expectedOutcome,
  type: c.healthImpactSeverity === 'positive' ? 'positive' : 'negative',
}));

console.log('\nFinal transformed output:');
console.log(JSON.stringify(transformed, null, 2));
process.exit(0);
