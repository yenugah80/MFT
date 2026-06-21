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

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useNotification } from '../providers/NotificationProvider';
import { useDashboard } from '../hooks/useDashboard';
import SmartNotificationEngine from '../services/smartNotificationEngine';
import { RATE_LIMITS } from '../constants/notificationTypes';

// Use unified rate limits from constants (aliased for clarity)
const CHECK_INTERVALS = RATE_LIMITS;

export default function SmartNotificationInitializer({ children }) {
  const { isSignedIn } = useAuth();
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
  const appStateRef = useRef(AppState.currentState);

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
    if (!dashboard || !notify) return;

    const trends = dashboard.trends || {};

    // Check streak milestones
    const currentStreak = trends.currentStreak || 0;
    const previousStreak = lastGoalsRef.current.streakDays || 0;

    // Celebrate streak milestones (7, 14, 30, 50, 100 days)
    const milestones = [7, 14, 30, 50, 100];
    for (const milestone of milestones) {
      if (currentStreak >= milestone && previousStreak < milestone) {
        notify.celebrateGoal?.('streak', `${milestone} days of consistency! You're in the elite club now.`, {
          title: `${milestone} Day Streak! 🔥`,
        });
        console.log(`[SmartNotifications] Streak milestone ${milestone} celebration triggered`);
        break; // Only celebrate one milestone at a time
      }
    }
    lastGoalsRef.current.streakDays = currentStreak;

  }, [dashboard, notify]);

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
