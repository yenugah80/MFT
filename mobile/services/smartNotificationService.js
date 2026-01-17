/**
 * ============================================================================
 * Smart Notification Service - Zomato-Style Engagement Engine
 * ============================================================================
 *
 * Inspired by Zomato's legendary notification strategy:
 * - Witty, personality-driven messages
 * - Contextual timing based on user behavior
 * - Personalized based on past patterns
 * - Local (offline) + Push (FCM) support
 *
 * Features:
 * - Hydration reminders with smart timing
 * - Meal logging nudges
 * - Activity motivation
 * - Mood check-ins
 * - Streak celebrations
 * - Re-engagement for inactive users
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// NOTIFICATION CONFIG
// ============================================================================

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage keys
const STORAGE_KEYS = {
  PUSH_TOKEN: '@notification_push_token',
  USER_PATTERNS: '@notification_user_patterns',
  LAST_NOTIFICATIONS: '@notification_last_sent',
  NOTIFICATION_SETTINGS: '@notification_settings',
};

// ============================================================================
// ZOMATO-STYLE MESSAGE TEMPLATES
// ============================================================================

/**
 * Witty, personality-driven messages inspired by Zomato
 * - Casual, conversational tone
 * - Relatable humor
 * - Gentle guilt-tripping
 * - Pop culture references
 */
const HYDRATION_MESSAGES = {
  morning: [
    { title: "Rise and hydrate! ☀️", body: "Your cells are throwing a dehydration party. Let's crash it with some water." },
    { title: "Good morning, thirsty human", body: "Even your organs are hitting snooze until you drink water." },
    { title: "Plot twist:", body: "That tiredness? Might just be dehydration in disguise. 💧" },
    { title: "Your body's morning wish:", body: "More water, less coffee... okay maybe equal amounts. 🤷" },
  ],
  midday: [
    { title: "Lunch without water?", body: "That's like watching a movie without popcorn. Unacceptable." },
    { title: "Hydration check! 💧", body: "Your afternoon productivity is directly proportional to your water intake." },
    { title: "Quick math:", body: "You + Water = Better decisions. It's science, probably." },
    { title: "Hey bestie", body: "Your water bottle is feeling neglected. Give it some attention? 🥺" },
  ],
  afternoon: [
    { title: "Afternoon slump?", body: "Before reaching for caffeine, try water. Your kidneys will thank you." },
    { title: "3 PM reality check:", body: "Are you tired or just dehydrated? (Spoiler: probably both)" },
    { title: "Your brain rn:", body: "Running on 3% hydration. Please plug in some water. 🔌" },
    { title: "Friendly reminder:", body: "That headache might just be your body's creative way of asking for water." },
  ],
  evening: [
    { title: "Evening H2O time", body: "Hydrate now so your midnight self doesn't wake up parched." },
    { title: "Plot twist:", body: "Drinking water before bed = waking up feeling human. Revolutionary, we know." },
    { title: "Your skin tomorrow:", body: "Will thank you for every sip you take tonight. ✨" },
  ],
  streak: [
    { title: "Streak on fire! 🔥", body: "{streak} days of crushing hydration goals. Legend behavior." },
    { title: "{streak} days strong!", body: "Your commitment to hydration is lowkey inspiring. Keep it up! 💪" },
    { title: "Hydration royalty 👑", body: "{streak} day streak! Your water bottle is probably feeling famous." },
  ],
  behindPace: [
    { title: "Quick check-in", body: "You're {amount}ml behind today. Nothing a few glasses can't fix! 💧" },
    { title: "Gentle nudge:", body: "Your hydration bar is looking a bit sad. Let's fix that?" },
    { title: "Your water bottle:", body: "\"Remember me? We used to be close...\" 😢" },
  ],
  goalAchieved: [
    { title: "GOAL CRUSHED! 🎉", body: "You did it! Your organs are literally celebrating right now." },
    { title: "Hydration hero!", body: "Daily goal achieved. Your future self is already grateful." },
    { title: "100% hydrated!", body: "This is the energy we needed. Go conquer the rest of your day! 💪" },
  ],
};

const MEAL_LOGGING_MESSAGES = {
  breakfast: [
    { title: "Breakfast time? 🍳", body: "Quick log = better nutrition insights. Takes 10 seconds!" },
    { title: "Morning fuel check:", body: "What's powering your day? Log it before you forget! 📝" },
  ],
  lunch: [
    { title: "Lunch logged?", body: "Your future self analyzing nutrition data will thank you. Trust." },
    { title: "Midday meal moment:", body: "Snap it, log it, forget it. Your health journey needs the data! 📸" },
  ],
  dinner: [
    { title: "Dinner time! 🍽️", body: "Last meal of the day deserves to be remembered. Log it!" },
    { title: "Evening eats:", body: "What's for dinner? Your nutrition tracker is curious. 🤔" },
  ],
  snack: [
    { title: "Snack attack?", body: "No judgment here. Log it for accurate daily totals! 🍿" },
  ],
};

const ACTIVITY_MESSAGES = {
  motivation: [
    { title: "Movement time! 🏃", body: "Even a 10-minute walk counts. Your body will thank you." },
    { title: "Activity check:", body: "How are those steps looking today? Every bit counts! 👟" },
    { title: "Gentle nudge:", body: "Sitting is the new smoking. Time for a quick stretch? 🧘" },
  ],
  celebration: [
    { title: "Look at you go! 🎯", body: "Activity goal crushed! This is the energy we love to see." },
    { title: "Movement champion!", body: "Your body just high-fived itself. Great job today! ✋" },
  ],
};

const MOOD_CHECKIN_MESSAGES = [
  { title: "Quick mood check 🌤️", body: "How are you really doing today? A quick log helps track patterns." },
  { title: "Feeling check-in:", body: "Take 5 seconds to log your mood. Future you will appreciate the data." },
  { title: "Vibe check! ✨", body: "Happy? Stressed? Meh? Log it to see how food & hydration affect your mood." },
];

const REENGAGEMENT_MESSAGES = [
  { title: "We miss you! 👋", body: "Your health tracking journey is waiting. Pick up where you left off?" },
  { title: "Been a while...", body: "Your nutrition insights are feeling lonely. Come say hi? 🥺" },
  { title: "Gentle reminder:", body: "Consistency > perfection. One log today is better than zero. Let's go! 💪" },
];

// ============================================================================
// SMART TIMING ENGINE
// ============================================================================

/**
 * Analyze user patterns to determine optimal notification times
 */
const analyzeUserPatterns = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PATTERNS);
    if (stored) {
      return JSON.parse(stored);
    }
    // Default patterns
    return {
      wakeTime: 7,
      sleepTime: 22,
      breakfastTime: 8,
      lunchTime: 12,
      dinnerTime: 19,
      hydrationFrequency: 2, // hours between reminders
      lastActiveDate: null,
      totalDaysActive: 0,
    };
  } catch {
    return null;
  }
};

/**
 * Update user patterns based on activity
 */
const updateUserPatterns = async (updates) => {
  try {
    const current = await analyzeUserPatterns();
    const updated = { ...current, ...updates, lastActiveDate: new Date().toISOString() };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PATTERNS, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[Notifications] Failed to update patterns:', error);
  }
};

/**
 * Get time period for contextual messages
 */
const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
};

/**
 * Get random message from category
 */
const getRandomMessage = (messages, replacements = {}) => {
  const msg = messages[Math.floor(Math.random() * messages.length)];
  let title = msg.title;
  let body = msg.body;

  // Replace placeholders
  Object.entries(replacements).forEach(([key, value]) => {
    title = title.replace(`{${key}}`, value);
    body = body.replace(`{${key}}`, value);
  });

  return { title, body };
};

// ============================================================================
// NOTIFICATION SCHEDULING
// ============================================================================

/**
 * Schedule a local notification
 */
const scheduleLocalNotification = async ({
  title,
  body,
  data = {},
  trigger,
  identifier,
}) => {
  try {
    // Cancel existing notification with same identifier
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
      identifier,
    });

    console.log(`[Notifications] Scheduled: ${identifier || notificationId} - "${title}"`);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Schedule failed:', error);
    return null;
  }
};

/**
 * Schedule hydration reminders throughout the day
 */
export const scheduleHydrationReminders = async (settings = {}) => {
  const {
    startHour = 8,
    endHour = 21,
    intervalHours = 2,
    enabled = true,
  } = settings;

  // Cancel all existing hydration reminders
  await cancelHydrationReminders();

  if (!enabled) {
    console.log('[Notifications] Hydration reminders disabled');
    return;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const reminders = [];

  // Schedule reminders for today and tomorrow
  for (let day = 0; day < 2; day++) {
    for (let hour = startHour; hour <= endHour; hour += intervalHours) {
      const reminderDate = new Date(now);
      reminderDate.setDate(reminderDate.getDate() + day);
      reminderDate.setHours(hour, 0, 0, 0);

      // Skip if time has passed today
      if (day === 0 && hour <= currentHour) continue;

      const period = hour < 11 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : 'evening';
      const message = getRandomMessage(HYDRATION_MESSAGES[period]);

      const id = await scheduleLocalNotification({
        title: message.title,
        body: message.body,
        data: { type: 'hydration_reminder', action: 'open_hydration' },
        trigger: reminderDate,
        identifier: `hydration_${day}_${hour}`,
      });

      if (id) reminders.push(id);
    }
  }

  console.log(`[Notifications] Scheduled ${reminders.length} hydration reminders`);
  return reminders;
};

/**
 * Cancel all hydration reminders
 */
export const cancelHydrationReminders = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const hydrationNotifications = scheduled.filter(n =>
    n.identifier?.startsWith('hydration_') || n.content.data?.type === 'hydration_reminder'
  );

  for (const notification of hydrationNotifications) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }

  console.log(`[Notifications] Cancelled ${hydrationNotifications.length} hydration reminders`);
};

/**
 * Schedule meal logging reminders
 */
export const scheduleMealReminders = async (settings = {}) => {
  const {
    breakfastTime = 8,
    lunchTime = 12,
    dinnerTime = 19,
    enabled = true,
  } = settings;

  // Cancel existing
  await cancelMealReminders();

  if (!enabled) return;

  const meals = [
    { meal: 'breakfast', hour: breakfastTime, delay: 30 }, // 30 min after typical meal time
    { meal: 'lunch', hour: lunchTime, delay: 45 },
    { meal: 'dinner', hour: dinnerTime, delay: 45 },
  ];

  for (const { meal, hour, delay } of meals) {
    const messages = MEAL_LOGGING_MESSAGES[meal];
    if (!messages) continue;

    const message = getRandomMessage(messages);
    const reminderTime = new Date();
    reminderTime.setHours(hour, delay, 0, 0);

    // If time passed today, schedule for tomorrow
    if (reminderTime < new Date()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    await scheduleLocalNotification({
      title: message.title,
      body: message.body,
      data: { type: 'meal_reminder', meal, action: 'open_log' },
      trigger: reminderTime,
      identifier: `meal_${meal}`,
    });
  }
};

/**
 * Cancel all meal reminders
 */
export const cancelMealReminders = async () => {
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
  for (const meal of meals) {
    await Notifications.cancelScheduledNotificationAsync(`meal_${meal}`).catch(() => {});
  }
};

/**
 * Schedule mood check-in
 */
export const scheduleMoodCheckIn = async (hour = 20) => {
  await Notifications.cancelScheduledNotificationAsync('mood_checkin').catch(() => {});

  const message = getRandomMessage(MOOD_CHECKIN_MESSAGES);
  const reminderTime = new Date();
  reminderTime.setHours(hour, 0, 0, 0);

  if (reminderTime < new Date()) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  return scheduleLocalNotification({
    title: message.title,
    body: message.body,
    data: { type: 'mood_checkin', action: 'open_mood' },
    trigger: reminderTime,
    identifier: 'mood_checkin',
  });
};

/**
 * Send immediate celebration notification
 */
export const sendCelebrationNotification = async (type, data = {}) => {
  let message;

  switch (type) {
    case 'hydration_goal':
      message = getRandomMessage(HYDRATION_MESSAGES.goalAchieved);
      break;
    case 'hydration_streak':
      message = getRandomMessage(HYDRATION_MESSAGES.streak, { streak: data.streak || 0 });
      break;
    case 'activity_goal':
      message = getRandomMessage(ACTIVITY_MESSAGES.celebration);
      break;
    default:
      return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: { type: 'celebration', celebrationType: type, ...data },
    },
    trigger: null, // Immediate
  });
};

/**
 * Send behind-pace nudge
 */
export const sendBehindPaceNudge = async (amountBehind) => {
  const message = getRandomMessage(HYDRATION_MESSAGES.behindPace, {
    amount: Math.round(amountBehind)
  });

  return Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: { type: 'nudge', nudgeType: 'behind_pace' },
    },
    trigger: null,
  });
};

// ============================================================================
// PUSH TOKEN MANAGEMENT (FCM)
// ============================================================================

/**
 * Register for push notifications
 */
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('[Notifications] Physical device required for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Get Expo push token (works with FCM)
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: '91264355-29bc-4019-be18-08002c3180c2', // From app.json
  });

  // Store token
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.data);

  // Android specific channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      description: 'Hydration, meal, and activity reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  console.log('[Notifications] Push token registered:', token.data.substring(0, 20) + '...');
  return token.data;
};

/**
 * Get stored push token
 */
export const getPushToken = async () => {
  return AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
};

// ============================================================================
// NOTIFICATION LISTENERS
// ============================================================================

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (user tapped)
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// ============================================================================
// SMART REMINDER INITIALIZATION
// ============================================================================

/**
 * Initialize all smart reminders based on user settings
 */
export const initializeSmartReminders = async (userSettings = {}) => {
  const {
    hydrationEnabled = true,
    hydrationStartHour = 8,
    hydrationEndHour = 21,
    hydrationInterval = 2,
    mealRemindersEnabled = true,
    breakfastTime = 8,
    lunchTime = 12,
    dinnerTime = 19,
    moodCheckInEnabled = true,
    moodCheckInHour = 20,
  } = userSettings;

  // Schedule all reminders
  await scheduleHydrationReminders({
    startHour: hydrationStartHour,
    endHour: hydrationEndHour,
    intervalHours: hydrationInterval,
    enabled: hydrationEnabled,
  });

  await scheduleMealReminders({
    breakfastTime,
    lunchTime,
    dinnerTime,
    enabled: mealRemindersEnabled,
  });

  if (moodCheckInEnabled) {
    await scheduleMoodCheckIn(moodCheckInHour);
  }

  console.log('[Notifications] Smart reminders initialized');
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] All notifications cancelled');
};

export default {
  registerForPushNotifications,
  getPushToken,
  scheduleHydrationReminders,
  cancelHydrationReminders,
  scheduleMealReminders,
  cancelMealReminders,
  scheduleMoodCheckIn,
  sendCelebrationNotification,
  sendBehindPaceNudge,
  initializeSmartReminders,
  cancelAllNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  analyzeUserPatterns,
  updateUserPatterns,
};
