/**
 * Local/remote reminder de-duplication mapping.
 *
 * Ownership model: the backend's smart-reminder cron is the PRIMARY sender
 * for every local reminder category whenever the device has connectivity —
 * it has real-time server data an on-device schedule fixed hours in advance
 * cannot. The device's local expo-notifications schedule exists ONLY as an
 * offline fallback for when connectivity isn't available at send time.
 *
 * Maps each REMINDER_TYPES value (recorded server-side per send, in
 * notification_delivery_log) to the local NOTIFICATION_CATEGORIES value the
 * mobile scheduler uses, so the client can ask "did the server already
 * deliver today's reminder for category X" without keeping its own copy of
 * this mapping.
 */
const REMINDER_TYPE_PREFIX_TO_LOCAL_CATEGORY = [
  ['hydration', 'hydration_nudge'],
  ['food', 'daily_reminder'],
  ['mood', 'mood_checkin'],
  ['activity', 'activity_reminder'],
  ['streak_at_risk', 'streak_at_risk'],
];

export function mapReminderTypesToLocalCategories(notificationTypes) {
  const deliveredCategories = new Set();
  for (const type of notificationTypes) {
    for (const [prefix, category] of REMINDER_TYPE_PREFIX_TO_LOCAL_CATEGORY) {
      if (type === prefix || type?.startsWith(prefix)) {
        deliveredCategories.add(category);
      }
    }
  }
  return Array.from(deliveredCategories);
}
