/**
 * SmartNotificationInitializer - Activates Smart Data-Driven Notifications
 *
 * This component initializes the smart notification system that triggers:
 * - Contextual hydration reminders based on user patterns
 * - Meal logging nudges at optimal times
 * - Activity encouragement when behind pace
 * - Mood check-ins for established users
 * - Celebrations with Lottie animations for goal achievements
 *
 * Place this component inside the NotificationProvider.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useAuth } from '@clerk/clerk-expo';
import { useNotification } from '../providers/NotificationProvider';
import { useDashboard } from '../hooks/useDashboard';
import SmartNotificationEngine from '../services/smartNotificationEngine';
import { RATE_LIMITS } from '../constants/notificationTypes';

// A user who's kept a 7-day streak has demonstrated real habit formation —
// the standard ASO-recommended moment to ask for a review, since it's tied
// to a positive milestone rather than an arbitrary launch count. Own
// one-time guard on top of iOS's own throttling (max 3 requestReview calls
// per 365 days, OS-decided whether it actually shows) so this specific
// trigger only ever fires once per account, not once per app-milestone-path
// re-render.
const REVIEW_REQUESTED_KEY_PREFIX = '@review_requested_';

// Highest streak milestone (7/14/30/50/100) already celebrated, persisted
// across app restarts. Without this, lastGoalsRef below resets to 0 on
// every cold start, so a user at day 37 would see the "7 Day Streak!"
// celebration replay on every single launch — the milestone-crossing
// check (currentStreak >= milestone && previousStreak < milestone) always
// looks like a fresh crossing of the *lowest* milestone when the baseline
// itself never survives a restart.
// Scoped per Clerk userId (matches the shape of similar keys elsewhere,
// e.g. useStreakPopups.js's STREAK_POPUP_SHOWN_KEY + resetAt suffix) —
// without this, switching accounts on the same device would have the new
// user's milestones silently suppressed by whatever the previous account
// last celebrated.
const HIGHEST_CELEBRATED_MILESTONE_KEY_PREFIX = '@highest_celebrated_streak_milestone_';

// Use unified rate limits from constants (aliased for clarity)
const CHECK_INTERVALS = RATE_LIMITS;

export default function SmartNotificationInitializer({ children }) {
  const { isSignedIn, userId } = useAuth();
  const notify = useNotification();
  const { data: dashboard } = useDashboard();

  const lastCheckRef = useRef({
    hydration: 0,
    meal: 0,
    activity: 0,
    mood: 0,
  });
  const lastGoalsRef = useRef({
    streakDays: 0,
  });
  // Guards the milestone-check effect below from running against the
  // default streakDays: 0 before the persisted value has loaded. A state
  // (not a ref) so its change actually re-triggers that effect — dashboard
  // and notify are typically both already available on first render, so a
  // ref flip alone would never cause the check to re-run.
  const [persistedMilestoneLoaded, setPersistedMilestoneLoaded] = useState(false);
  // True when AsyncStorage had nothing stored — i.e. this device has never
  // recorded a milestone before (fresh install, or migrating from the old
  // buggy behavior). In that case the milestone-check effect seeds silently
  // from the CURRENT streak instead of comparing against 0, so a user
  // already at day 37 doesn't replay 7 -> 14 -> 30 across their next few
  // app opens before finally catching up.
  const isFirstEverLoadRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // Load the real baseline before any milestone check runs. Waits for
  // userId specifically (not just isSignedIn) since the key needs it.
  useEffect(() => {
    if (!userId) return;

    AsyncStorage.getItem(HIGHEST_CELEBRATED_MILESTONE_KEY_PREFIX + userId)
      .then((stored) => {
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed)) {
          lastGoalsRef.current.streakDays = parsed;
        } else {
          isFirstEverLoadRef.current = true;
        }
      })
      .catch(() => {
        // Non-blocking — worst case, this cold start re-celebrates once
        // more, same as before this fix, rather than crashing.
      })
      .finally(() => {
        setPersistedMilestoneLoaded(true);
      });
  }, [userId]);

  // Check if enough time has passed since last check
  const canCheck = (type) => {
    const lastCheck = lastCheckRef.current[type] || 0;
    const interval = CHECK_INTERVALS[type] || CHECK_INTERVALS.meal;
    return Date.now() - lastCheck > interval;
  };

  const tryTrigger = useCallback(async (type) => {
    if (!isSignedIn || !notify?.smart?.trigger) return null;

    const canSend = await SmartNotificationEngine.shouldSendNotification(type);
    if (!canSend) return null;

    const result = await notify.smart.trigger(type);
    if (result) {
      lastCheckRef.current[type] = Date.now();
      console.log(`[SmartNotifications] Triggered ${type} notification`);
    }
    return result;
  }, [isSignedIn, notify]);

  const runContextualChecks = useCallback(async () => {
    if (!isSignedIn) return;

    const hour = new Date().getHours();

    if (hour >= 8 && hour < 11) {
      if (canCheck('hydration')) await tryTrigger('hydration');
      if (canCheck('meal') && hour >= 9) await tryTrigger('meal');
    }
    if (hour >= 12 && hour < 14) {
      if (canCheck('meal')) await tryTrigger('meal');
      if (canCheck('hydration')) await tryTrigger('hydration');
    }
    if (hour >= 14 && hour < 18) {
      if (canCheck('activity')) await tryTrigger('activity');
      if (canCheck('hydration')) await tryTrigger('hydration');
    }
    if (hour >= 18 && hour < 22) {
      if (canCheck('meal')) await tryTrigger('meal');
      if (canCheck('mood') && hour >= 19) await tryTrigger('mood');
    }
  }, [isSignedIn, tryTrigger]);

  // Watch for goal achievements to trigger celebrations
  // NOTE: Hydration celebrations are handled by HydrationTracker's MilestoneToast
  // This only handles streak milestones to avoid duplicate notifications
  useEffect(() => {
    if (!dashboard || !notify || !persistedMilestoneLoaded) return;

    const trends = dashboard.trends || {};
    const currentStreak = trends.currentStreak || 0;

    // First time this device has ever run the check (no persisted value):
    // seed from the current streak with no celebration, rather than
    // comparing against 0 and replaying every milestone already passed.
    if (isFirstEverLoadRef.current) {
      isFirstEverLoadRef.current = false;
      lastGoalsRef.current.streakDays = currentStreak;
      AsyncStorage.setItem(HIGHEST_CELEBRATED_MILESTONE_KEY_PREFIX + userId, String(currentStreak)).catch(() => {});
      return;
    }

    const previousStreak = lastGoalsRef.current.streakDays || 0;

    // Celebrate streak milestones (7, 14, 30, 50, 100 days)
    const milestones = [7, 14, 30, 50, 100];
    for (const milestone of milestones) {
      if (currentStreak >= milestone && previousStreak < milestone) {
        notify.celebrateGoal?.('streak', `${milestone} days of consistency! You're in the elite club now.`, {
          title: `${milestone} Day Streak! 🔥`,
        });
        console.log(`[SmartNotifications] Streak milestone ${milestone} celebration triggered`);
        AsyncStorage.setItem(HIGHEST_CELEBRATED_MILESTONE_KEY_PREFIX + userId, String(milestone)).catch(() => {});

        // Ask for a review right after the FIRST real milestone (7 days) —
        // a moment of demonstrated value, not an arbitrary launch count.
        // Later milestones don't re-ask; one shot at this specific trigger.
        if (milestone === 7) {
          AsyncStorage.getItem(REVIEW_REQUESTED_KEY_PREFIX + userId).then((alreadyAsked) => {
            if (alreadyAsked) return;
            AsyncStorage.setItem(REVIEW_REQUESTED_KEY_PREFIX + userId, 'true').catch(() => {});
            // A brief delay so the review sheet doesn't compete with the
            // celebration animation/haptic that just fired above.
            setTimeout(() => {
              StoreReview.isAvailableAsync().then((available) => {
                if (available) StoreReview.requestReview();
              }).catch(() => {});
            }, 2500);
          }).catch(() => {});
        }
        break; // Only celebrate one milestone at a time
      }
    }
    lastGoalsRef.current.streakDays = currentStreak;

  }, [dashboard, notify, persistedMilestoneLoaded, userId]);

  // Handle app state changes - run checks when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        setTimeout(runContextualChecks, 3000);
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [runContextualChecks]);

  useEffect(() => {
    if (!isSignedIn) return;
    const timeout = setTimeout(runContextualChecks, 15000);
    return () => clearTimeout(timeout);
  }, [isSignedIn, runContextualChecks]);

  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(() => {
      if (appStateRef.current === 'active') runContextualChecks();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSignedIn, runContextualChecks]);

  return children;
}
