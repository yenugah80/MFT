/**
 * Streak Components - Snapchat-Style Streak Management
 *
 * Components for handling streak lifecycle:
 * - StreakManager: Orchestrates all streak UI (recommended)
 * - StreakBrokenModal: Shows when streak is lost, offers restoration
 * - StreakSavedModal: Shows when freeze auto-saved the streak
 * - StreakAtRiskBanner: Floating banner for at-risk streaks
 *
 * Usage:
 * ```jsx
 * import { StreakManager } from '../components/streak';
 *
 * // In your layout or dashboard
 * <StreakManager onNavigateToLog={() => router.push('/(tabs)/log')} />
 * ```
 */

export { default as StreakManager } from './StreakManager';
export { default as StreakBrokenModal } from './StreakBrokenModal';
export { default as StreakSavedModal } from './StreakSavedModal';
export { default as StreakAtRiskBanner } from './StreakAtRiskBanner';
