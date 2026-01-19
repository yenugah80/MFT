/**
 * Intelligence Services - Unified Export
 *
 * This module exports all intelligence pipeline components:
 *
 * Pipeline Flow:
 * 1. ContextBuilder - Gathers time, user state, goals context
 * 2. (Decision Brain) - Backend ML layer (not exported here)
 * 3. OutputRanker - Ranks, filters, prevents fatigue
 * 4. DeliveryEngine - Applies witty copy, selects channel
 * 5. IntelligenceOrchestrator - Ties everything together
 * 6. MessageFreshnessManager - Ensures message variety
 *
 * Usage:
 * ```javascript
 * // Full orchestration (recommended)
 * import { intelligenceOrchestrator } from '../services/intelligence';
 *
 * // Individual components
 * import { contextBuilder, outputRanker, deliveryEngine } from '../services/intelligence';
 *
 * // Message freshness (for variety)
 * import { initializeMessageFreshness } from '../services/intelligence';
 *
 * // Witty copy library
 * import { WITTY_COPY } from '../services/intelligence';
 * ```
 */

// Core services
export { contextBuilder, ContextBuilder } from './ContextBuilder';
export { outputRanker, OutputRanker } from './OutputRanker';
export { deliveryEngine, DeliveryEngine, WITTY_COPY } from './DeliveryEngine';
export {
  intelligenceOrchestrator,
  IntelligenceOrchestrator,
} from './IntelligenceOrchestrator';

// Message freshness management
export {
  messageFreshnessManager,
  pickFresh,
  initializeMessageFreshness,
} from './MessageFreshnessManager';

// Default export is the main orchestrator
export { intelligenceOrchestrator as default } from './IntelligenceOrchestrator';
