/**
 * useSmartNotifications - Hook for Triggering Smart Data-Driven Notifications
 *
 * This hook activates the smart notification system by:
 * - Checking for notification triggers on app state changes
 * - Triggering celebrations on goal achievements
 * - Running periodic checks for contextual reminders
 * - Integrating with the notification provider
 *
 * KEY PRINCIPLE: All notifications are data-driven with witty Gen-Z personality.
 * No generic messages - only contextual, personalized content.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useNotification } from '../providers/NotificationProvider';
import SmartNotificationEngine from '../services/smartNotificationEngine';

// Minimum intervals between checks (in ms)
const CHECK_INTERVALS = {
  hydration: 2 * 60 * 60 * 1000,  // 2 hours
  meal: 3 * 60 * 60 * 1000,       // 3 hours
  activity: 4 * 60 * 60 * 1000,   // 4 hours
  mood: 8 * 60 * 60 * 1000,       // 8 hours
  reengagement: 24 * 60 * 60 * 1000, // 24 hours
};

export function useSmartNotifications() {
  const { isSignedIn } = useAuth();
  const notify = useNotification();
  const lastCheckRef = useRef({
    hydration: 0,
    meal: 0,
    activity: 0,
    mood: 0,
    reengagement: 0,
  });
  const appStateRef = useRef(AppState.currentState);

  /**
   * Check if enough time has passed since last check for a type
   */
  const canCheck = useCallback((type) => {
    const lastCheck = lastCheckRef.current[type] || 0;
    const interval = CHECK_INTERVALS[type] || CHECK_INTERVALS.meal;
    return Date.now() - lastCheck > interval;
  }, []);

  /**
   * Try to trigger a smart notification of a specific type
   */
  const tryTrigger = useCallback(async (type) => {
    if (!isSignedIn || !notify?.smart?.trigger) return null;

    // Check rate limiting
    const canSend = await SmartNotificationEngine.shouldSendNotification(type);
    if (!canSend) {
      console.log(`[SmartNotifications] Rate limited: ${type}`);
      return null;
    }

    // Trigger the notification
    const result = await notify.smart.trigger(type);
    if (result) {
      lastCheckRef.current[type] = Date.now();
      console.log(`[SmartNotifications] Triggered ${type} notification`);
    }
    return result;
  }, [isSignedIn, notify]);

  /**
   * Run contextual checks based on current time and app state
   * Called when app becomes active or on periodic intervals
   */
  const runContextualChecks = useCallback(async () => {
    if (!isSignedIn) return;

    const hour = new Date().getHours();
    const results = [];

    // Morning checks (8-11am)
    if (hour >= 8 && hour < 11) {
      if (canCheck('hydration')) {
        results.push(await tryTrigger('hydration'));
      }
      if (canCheck('meal') && hour >= 9) {
        results.push(await tryTrigger('meal'));
      }
    }

    // Midday checks (12-14)
    if (hour >= 12 && hour < 14) {
      if (canCheck('meal')) {
        results.push(await tryTrigger('meal'));
      }
      if (canCheck('hydration')) {
        results.push(await tryTrigger('hydration'));
      }
    }

    // Afternoon checks (14-18)
    if (hour >= 14 && hour < 18) {
      if (canCheck('activity')) {
        results.push(await tryTrigger('activity'));
      }
      if (canCheck('hydration')) {
        results.push(await tryTrigger('hydration'));
      }
    }

    // Evening checks (18-22)
    if (hour >= 18 && hour < 22) {
      if (canCheck('meal')) {
        results.push(await tryTrigger('meal'));
      }
      if (canCheck('mood') && hour >= 19) {
        results.push(await tryTrigger('mood'));
      }
    }

    // Filter out null results
    return results.filter(Boolean);
  }, [isSignedIn, canCheck, tryTrigger]);

  /**
   * Trigger celebration for specific achievements
   * Called from components when goals are reached
   * Uses Lottie animations for premium feel
   */
  const celebrate = useCallback(async (type, data = {}) => {
    if (!isSignedIn || !notify) return null;

    try {
      const celebration = await SmartNotificationEngine.generateCelebrationMessage(type, data);
      if (celebration) {
        // Use celebrateGoal for goal-specific animations
        if (notify.celebrateGoal) {
          notify.celebrateGoal(
            celebration.data?.celebrationType || type,
            celebration.body,
            { title: celebration.title }
          );
        } else {
          // Fallback to celebrate method
          notify.celebrate(celebration.body, {
            title: celebration.title,
            domain: celebration.data?.celebrationType || 'streak',
          });
        }
        console.log(`[SmartNotifications] Celebration with Lottie triggered: ${type}`);
        return celebration;
      }
    } catch (error) {
      console.warn('[SmartNotifications] Celebration error:', error?.message);
    }
    return null;
  }, [isSignedIn, notify]);

  /**
   * Handle app state changes
   * Trigger contextual checks when app comes to foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App came to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Delay slightly to let the app settle
        setTimeout(() => {
          runContextualChecks();
        }, 2000);
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [runContextualChecks]);

  /**
   * Initial check when hook mounts (user just signed in)
   */
  useEffect(() => {
    if (isSignedIn) {
      // Delay initial checks to avoid overwhelming on app start
      const timeout = setTimeout(() => {
        runContextualChecks();
      }, 10000); // 10 second delay

      return () => clearTimeout(timeout);
    }
  }, [isSignedIn, runContextualChecks]);

  /**
   * Periodic check while app is active (every 30 minutes)
   */
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(() => {
      if (appStateRef.current === 'active') {
        runContextualChecks();
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(interval);
  }, [isSignedIn, runContextualChecks]);

  return {
    // Manual triggers
    triggerHydration: () => tryTrigger('hydration'),
    triggerMeal: () => tryTrigger('meal'),
    triggerActivity: () => tryTrigger('activity'),
    triggerMood: () => tryTrigger('mood'),
    triggerReengagement: () => tryTrigger('reengagement'),

    // Celebration triggers (for goal achievements)
    celebrateHydrationGoal: (streak) => celebrate('hydration_goal', { streak }),
    celebrateStreakMilestone: (days) => celebrate('streak_milestone', { days }),
    celebrateStepGoal: (steps) => celebrate('step_goal', { steps }),
    celebrateFirstLog: () => celebrate('first_log'),

    // Run all contextual checks
    runChecks: runContextualChecks,
  };
}

export default useSmartNotifications;
