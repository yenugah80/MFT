/**
 * MomentumCard - Premium "Keep it up" component
 *
 * Architecture:
 * - MomentumCard: Core UI component with animations and gestures
 * - MomentumEngine: Logic layer for highlight selection and display rules
 * - MomentumCardWrapper: Smart integration wrapper that extracts dashboard metrics
 *
 * Usage:
 * 1. Direct: <MomentumCard streak={7} level={3} ... />
 * 2. Smart: <MomentumCardWrapper dashboardData={data} gamification={gamification} />
 */

export { default } from './MomentumCard';
export { default as MomentumCard } from './MomentumCard';
export { default as MomentumCardWrapper } from './MomentumCardWrapper';

export {
  HIGHLIGHT_TYPES,
  shouldShowMomentumCard,
  selectHighlight,
  getSecondaryMetrics,
  recordMomentumShown,
  getLastMomentumShown,
} from './MomentumEngine';
