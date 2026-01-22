/**
 * QuietConfidenceCard - Backwards Compatibility Wrapper
 *
 * @deprecated Use MomentumCard directly for new implementations
 *
 * This file now re-exports MomentumCard for backwards compatibility.
 * The new MomentumCard provides:
 * - Data-driven variable reinforcement (rotates highlights)
 * - Personal comparisons (streak, consistency, variety, hydration)
 * - Swipe-to-dismiss gesture
 * - Premium gradient styling
 * - Meaningful contextual messaging
 *
 * Migration: Replace QuietConfidenceCard with MomentumCard and pass metrics props
 */

import MomentumCard from './MomentumCard';

export { MomentumCard as QuietConfidenceCard };
export default MomentumCard;
