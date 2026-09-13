import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import {
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
  accountSettingsTable,
  privacyConsentAuditTable,
} from "../db/schema.js";
import { sendDevError } from "../utils/sendDevError.js";
import {
  buildPrivacyAuditChanges,
  buildStoredPrivacyPatch,
  normalizePrivacySettings,
  parsePrivacyPatch,
  resolvePrivacyDependencies,
} from "../utils/privacySettings.js";
import {
  buildProfileExportPayload,
  CORE_WELLNESS_EXPORT_COLLECTIONS,
} from "../utils/profileDataExport.js";
import { buildExportZip, buildExportPDF } from "../utils/exportFormatters.js";
import { getDeliveredTodayForUser, acknowledgeDelivery } from "../utils/deliveryAck.js";
import {
  registerDevice,
  deregisterDevice,
  resolveDeviceRowId,
  setOwnership,
} from "../utils/deviceRegistry.js";
// Utility to ensure table shape (imported from server.js)
import { ensureProfilesTableShape } from "../server.js";

// Valid preference IDs (must match mobile/constants/onboardingConfig.js)
const VALID_DIETARY_PREFERENCES = [
  'balanced', 'vegan', 'keto', 'vegetarian', 'pescatarian', 'paleo', 'low_carb', 'gluten_free'
];

// Expanded allergen list following FDA Top 9 + EU regulations
const VALID_ALLERGIES = [
  // FDA Top 9
  'nuts', 'dairy', 'eggs', 'shellfish', 'soy', 'wheat', 'fish', 'peanuts', 'sesame',
  // Additional common allergens (EU regulations)
  'gluten', 'mustard', 'celery', 'sulfites', 'lupin', 'mollusks',
  // Specific nut types for granular tracking
  'tree_nuts', 'almonds', 'cashews', 'walnuts', 'pecans', 'pistachios', 'hazelnuts', 'macadamia',
];

const VALID_CUISINE_PREFERENCES = [
  'mediterranean', 'asian', 'mexican', 'indian', 'american', 'italian', 'middle_eastern', 'african'
];

// --- Push Token Management ---
export async function savePushToken(req, res) {
  try {
    const { userId } = getAuth(req);
    const { expoPushToken } = req.body;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({ error: 'Invalid push token' });
    }

    // Validate Expo push token format
    if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
      return res.status(400).json({
        error: 'Invalid Expo push token format',
        hint: 'Token should start with ExponentPushToken[ or ExpoPushToken['
      });
    }

    // Check if profile exists first (foreign key constraint)
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      // Profile doesn't exist yet - gracefully skip push token registration
      // This can happen when push token registration runs before profile creation
      console.log(`[savePushToken] Profile not found for user ${userId} - will retry after profile creation`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet, push token will be registered after profile creation',
        retryAfterProfileCreation: true
      });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        expoPushToken,
        pushTokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: {
          expoPushToken,
          pushTokenUpdatedAt: new Date(),
          updatedAt: new Date()
        },
      })
      .returning({ expoPushToken: accountSettingsTable.expoPushToken });

    console.log(`[savePushToken] Saved push token for user ${userId}`);
    res.status(200).json({
      success: true,
      tokenRegistered: true,
      expoPushToken: updated[0]?.expoPushToken
    });
  } catch (error) {
    // Handle foreign key constraint violation gracefully
    if (error.code === '23503') { // PostgreSQL foreign key violation
      console.log(`[savePushToken] Profile not found (FK error) for user ${getAuth(req)?.userId}`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }
    console.error('[savePushToken] Error saving push token:', error);
    sendDevError(res, error);
  }
}

export async function deletePushToken(req, res) {
  try {
    const { userId } = getAuth(req);

    await req.db
      .update(accountSettingsTable)
      .set({
        expoPushToken: null,
        pushTokenUpdatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(accountSettingsTable.userId, userId));

    console.log(`[deletePushToken] Removed push token for user ${userId}`);
    res.status(200).json({ success: true, tokenRegistered: false });
  } catch (error) {
    console.error('[deletePushToken] Error removing push token:', error);
    sendDevError(res, error);
  }
}

export async function getPushTokenStatus(req, res) {
  try {
    const { userId } = getAuth(req);

    const [settings] = await req.db
      .select({
        expoPushToken: accountSettingsTable.expoPushToken,
        pushTokenUpdatedAt: accountSettingsTable.pushTokenUpdatedAt
      })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    res.status(200).json({
      tokenRegistered: !!settings?.expoPushToken,
      lastUpdated: settings?.pushTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('[getPushTokenStatus] Error:', error);
    sendDevError(res, error);
  }
}

// --- Local/remote reminder de-duplication ---
//
// Ownership model: the backend's smart-reminder cron (smartReminderJob.js) is
// the PRIMARY sender for every local reminder category whenever the device
// has connectivity — it has real-time server data (today's actual logs,
// current streak) that an on-device schedule fixed hours in advance cannot.
// The device's local expo-notifications schedule (pushNotifications.js)
// exists ONLY as an offline fallback, for the case where connectivity isn't
// available when the remote send would have happened.
//
// notification_delivery_log's "sent" status means Firebase/APNs ACCEPTED the
// send request — it is NOT confirmation the device received anything.
// Cancelling the user's only remaining reminder based on a merely-accepted
// send risks a silent miss, which is worse than an occasional duplicate.
//
// Confirmation is message-specific, not a timestamp window: each send gets
// a unique deliveryId (generated in smartReminderJob.js's
// deliverNotification, embedded in the push's own data payload), stored on
// its own notification_delivery_log row. The receiving device acknowledges
// that exact ID; acked_at is only ever set once per row (first ack wins —
// see acknowledgePushReceived), so repeated acks from one device, or acks
// from a second device signed into the same account, are all safely
// idempotent instead of each counting as a fresh confirmation. An earlier
// version of this correlated by "any ack within 10 minutes of any send" at
// the account level — that could incorrectly confirm an unrelated send in
// the same window and had no way to validate the acker owns this specific
// delivery. Replaced outright before this was ever deployed.
export async function getDeliveredToday(req, res) {
  try {
    const { userId } = getAuth(req);
    const deliveredToday = await getDeliveredTodayForUser(req.db, userId);
    res.status(200).json({ deliveredToday });
  } catch (error) {
    console.error('[getDeliveredToday] Error:', error);
    // Fail toward "nothing confirmed delivered" — the local reminder stays
    // scheduled and fires. A missed dedup means at most one redundant
    // notification; a false "already delivered" would suppress the only
    // reminder the user gets that day. Same asymmetry the consent gate
    // resolves the same way (fail toward the safer redundant outcome).
    res.status(200).json({ deliveredToday: [] });
  }
}

/**
 * Called by the client whenever its JS runtime actually processes a push
 * (foreground onMessage, or the background message handler — which can run
 * even while the app is fully closed, given `content-available: 1` on iOS).
 * This is the real "device receipt" signal getDeliveredToday requires before
 * treating a category as safe to cancel locally. See acknowledgeDelivery for
 * the ownership + idempotency logic.
 */
export async function acknowledgePushReceived(req, res) {
  try {
    const { userId } = getAuth(req);
    const { deliveryId, deviceId } = req.body || {};

    if (!deliveryId || typeof deliveryId !== 'string') {
      return res.status(400).json({ success: false, error: 'deliveryId is required' });
    }

    // deviceId here is the client's own string id (SecureStore) — resolve it
    // to the real devices.id row so acknowledgeDelivery can check it against
    // the delivery log's numeric deviceId. Absent for pre-device-model
    // clients, which keeps today's userId-only ack check for them.
    const ackingDeviceRowId = deviceId ? await resolveDeviceRowId(req.db, userId, deviceId) : null;

    const result = await acknowledgeDelivery(req.db, userId, deliveryId, ackingDeviceRowId);

    if (result.ownershipViolation) {
      console.warn(`[acknowledgePushReceived] Ownership mismatch: user ${userId} tried to ack a delivery belonging to another device/account`);
      return res.status(403).json({ success: false, error: 'Not your delivery' });
    }

    return res.status(200).json({ success: result.ok, alreadyAcked: result.alreadyAcked });
  } catch (error) {
    console.error('[acknowledgePushReceived] Error:', error);
    // Non-critical: worst case, this send is treated as unconfirmed and the
    // local fallback stays scheduled — the safe direction to fail in.
    res.status(200).json({ success: false });
  }
}

// --- Device Registry & Per-Device Notification Ownership ---
//
// Additive alongside the legacy FCM/Expo token endpoints below, which stay
// untouched for app builds that haven't adopted this flow yet. See
// deviceRegistry.js and docs/architecture for the backward-compat design.

export async function registerDeviceEndpoint(req, res) {
  try {
    const { userId } = getAuth(req);
    const { deviceId, fcmToken, expoPushToken, platform } = req.body || {};

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    if (!fcmToken && !expoPushToken) {
      return res.status(400).json({ success: false, error: 'fcmToken or expoPushToken is required' });
    }

    // Same profile-not-ready race saveFCMToken already guards against.
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      return res.status(202).json({
        success: false,
        registered: false,
        message: 'Profile not ready yet, device will be registered after profile creation',
        retryAfterProfileCreation: true,
      });
    }

    await registerDevice(req.db, userId, { deviceId, fcmToken, expoPushToken, platform });
    console.log(`[registerDeviceEndpoint] Registered device ${deviceId} for user ${userId} (${platform || 'unknown platform'})`);
    res.status(200).json({ success: true, registered: true });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(202).json({ success: false, registered: false, retryAfterProfileCreation: true });
    }
    console.error('[registerDeviceEndpoint] Error:', error);
    sendDevError(res, error);
  }
}

export async function deregisterDeviceEndpoint(req, res) {
  try {
    const { userId } = getAuth(req);
    const { deviceId } = req.body || {};

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    const result = await deregisterDevice(req.db, userId, deviceId);
    console.log(`[deregisterDeviceEndpoint] Deregistered device ${deviceId} for user ${userId}: ${result.removed}`);
    res.status(200).json({ success: true, removed: result.removed });
  } catch (error) {
    console.error('[deregisterDeviceEndpoint] Error:', error);
    sendDevError(res, error);
  }
}

const VALID_OWNABLE_CATEGORIES = ['hydration_nudge', 'daily_reminder', 'mood_checkin', 'activity_reminder'];
const VALID_OWNERS = ['local', 'backend'];

export async function setNotificationOwnershipEndpoint(req, res) {
  try {
    const { userId } = getAuth(req);
    const { deviceId, category, owner } = req.body || {};

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    if (!VALID_OWNABLE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    if (!VALID_OWNERS.includes(owner)) {
      return res.status(400).json({ success: false, error: 'Invalid owner' });
    }

    const deviceRowId = await resolveDeviceRowId(req.db, userId, deviceId);
    if (!deviceRowId) {
      // The device must register itself before claiming ownership — this
      // ordering (register, confirm local scheduling succeeded, THEN claim
      // ownership) is what mobile's syncAllNotificationSchedules follows.
      return res.status(404).json({ success: false, error: 'Device not registered' });
    }

    await setOwnership(req.db, deviceRowId, category, owner);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[setNotificationOwnershipEndpoint] Error:', error);
    sendDevError(res, error);
  }
}

// --- FCM Token Management (Firebase Cloud Messaging) ---
export async function saveFCMToken(req, res) {
  try {
    const { userId } = getAuth(req);
    const { fcmToken, platform } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ error: 'Invalid FCM token' });
    }

    // Basic FCM token validation (tokens are typically 150+ characters)
    if (fcmToken.length < 100) {
      return res.status(400).json({
        error: 'Invalid FCM token format',
        hint: 'FCM tokens are typically 150+ characters'
      });
    }

    // Check if profile exists first (foreign key constraint)
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      console.log(`[saveFCMToken] Profile not found for user ${userId} - will retry after profile creation`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet, FCM token will be registered after profile creation',
        retryAfterProfileCreation: true
      });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        fcmToken,
        fcmTokenUpdatedAt: new Date(),
        fcmTokenPlatform: platform || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: {
          fcmToken,
          fcmTokenUpdatedAt: new Date(),
          fcmTokenPlatform: platform || null,
          updatedAt: new Date()
        },
      })
      .returning({ fcmToken: accountSettingsTable.fcmToken });

    console.log(`[saveFCMToken] Saved FCM token for user ${userId} (${platform || 'unknown platform'})`);
    res.status(200).json({
      success: true,
      tokenRegistered: true,
    });
  } catch (error) {
    // Handle foreign key constraint violation gracefully
    if (error.code === '23503') {
      console.log(`[saveFCMToken] Profile not found (FK error) for user ${getAuth(req)?.userId}`);
      return res.status(202).json({
        success: false,
        tokenRegistered: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }
    console.error('[saveFCMToken] Error saving FCM token:', error);
    sendDevError(res, error);
  }
}

export async function deleteFCMToken(req, res) {
  try {
    const { userId } = getAuth(req);

    await req.db
      .update(accountSettingsTable)
      .set({
        fcmToken: null,
        fcmTokenUpdatedAt: new Date(),
        fcmTokenPlatform: null,
        updatedAt: new Date()
      })
      .where(eq(accountSettingsTable.userId, userId));

    console.log(`[deleteFCMToken] Removed FCM token for user ${userId}`);
    res.status(200).json({ success: true, tokenRegistered: false });
  } catch (error) {
    console.error('[deleteFCMToken] Error removing FCM token:', error);
    sendDevError(res, error);
  }
}

export async function getFCMTokenStatus(req, res) {
  try {
    const { userId } = getAuth(req);

    const [settings] = await req.db
      .select({
        fcmToken: accountSettingsTable.fcmToken,
        fcmTokenUpdatedAt: accountSettingsTable.fcmTokenUpdatedAt,
        fcmTokenPlatform: accountSettingsTable.fcmTokenPlatform,
      })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    res.status(200).json({
      tokenRegistered: !!settings?.fcmToken,
      platform: settings?.fcmTokenPlatform || null,
      lastUpdated: settings?.fcmTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('[getFCMTokenStatus] Error:', error);
    sendDevError(res, error);
  }
}

// --- Combined Push Token Endpoint (Expo + FCM) ---
export async function saveBothPushTokens(req, res) {
  try {
    const { userId } = getAuth(req);
    const { expoPushToken, fcmToken, platform } = req.body;

    // Check if profile exists first
    const [profile] = await req.db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      console.log(`[saveBothPushTokens] Profile not found for user ${userId}`);
      return res.status(202).json({
        success: false,
        expoPushTokenRegistered: false,
        fcmTokenRegistered: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    // Add Expo token if provided
    if (expoPushToken) {
      if (expoPushToken.startsWith('ExponentPushToken[') || expoPushToken.startsWith('ExpoPushToken[')) {
        updateData.expoPushToken = expoPushToken;
        updateData.pushTokenUpdatedAt = new Date();
      } else {
        return res.status(400).json({
          error: 'Invalid Expo push token format',
          hint: 'Token should start with ExponentPushToken[ or ExpoPushToken['
        });
      }
    }

    // Add FCM token if provided
    if (fcmToken) {
      if (fcmToken.length >= 100) {
        updateData.fcmToken = fcmToken;
        updateData.fcmTokenUpdatedAt = new Date();
        updateData.fcmTokenPlatform = platform || null;
      } else {
        return res.status(400).json({
          error: 'Invalid FCM token format',
          hint: 'FCM tokens are typically 150+ characters'
        });
      }
    }

    await req.db
      .insert(accountSettingsTable)
      .values({ userId, ...updateData })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: updateData,
      });

    console.log(`[saveBothPushTokens] Saved tokens for user ${userId}`);
    res.status(200).json({
      success: true,
      expoPushTokenRegistered: !!expoPushToken,
      fcmTokenRegistered: !!fcmToken,
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(202).json({
        success: false,
        message: 'Profile not ready yet',
        retryAfterProfileCreation: true
      });
    }
    console.error('[saveBothPushTokens] Error:', error);
    sendDevError(res, error);
  }
}

// --- Notification Preferences ---
export async function getNotifications(req, res) {
  try {
    const { userId } = getAuth(req);
    const [settings] = await req.db
      .select({ notifications: accountSettingsTable.notifications })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (settings?.notifications) {
      return res.status(200).json(settings.notifications);
    }

    const [profile] = await req.db
      .select({ notifications: profilesTable.notifications })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const notifications = profile.notifications || {};
    await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        notifications,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { notifications, updatedAt: new Date() },
      });

    res.status(200).json(notifications);
  } catch (error) {
    console.log("Error fetching notifications", error);
    sendDevError(res, error);
  }
}

export async function saveNotifications(req, res) {
  try {
    const { userId } = getAuth(req);
    const { notifications } = req.body;
    if (typeof notifications !== "object" || notifications === null) {
      return res.status(400).json({ error: "Invalid notifications object" });
    }
    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        notifications,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { notifications, updatedAt: new Date() },
      })
      .returning({ notifications: accountSettingsTable.notifications });

    if (!updated[0]) return res.status(404).json({ error: "Settings not found" });
    res.status(200).json(updated[0].notifications || {});
  } catch (error) {
    console.log("Error saving notifications", error);
    sendDevError(res, error);
  }
}

export async function getPrivacySettings(req, res) {
  try {
    const { userId } = getAuth(req);
    const [settings] = await req.db
      .select({ privacy: accountSettingsTable.privacy })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (!settings) {
      return res.status(200).json(normalizePrivacySettings(null));
    }
    res.status(200).json(normalizePrivacySettings(settings.privacy));
  } catch (error) {
    console.log("Error fetching privacy settings", error);
    sendDevError(res, error);
  }
}

const PRIVACY_SOURCE_SCREENS = new Set(["privacy-security", "onboarding", "unknown"]);
const PRIVACY_DEVICE_PLATFORMS = new Set(["ios", "android", "web", "unknown"]);

function parsePrivacyRequestMetadata(body) {
  const sourceScreen = body?.sourceScreen ?? "unknown";
  const devicePlatform = body?.devicePlatform ?? "unknown";

  if (!PRIVACY_SOURCE_SCREENS.has(sourceScreen)) {
    return { success: false, field: "sourceScreen" };
  }
  if (!PRIVACY_DEVICE_PLATFORMS.has(devicePlatform)) {
    return { success: false, field: "devicePlatform" };
  }
  return { success: true, sourceScreen, devicePlatform };
}

function encodePrivacyAuditCursor(row) {
  return Buffer.from(JSON.stringify({
    changedAt: row.changedAt.toISOString(),
    id: row.id,
  })).toString("base64url");
}

function decodePrivacyAuditCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const changedAt = new Date(parsed.changedAt);
    if (!Number.isInteger(parsed.id) || Number.isNaN(changedAt.getTime())) return null;
    return { changedAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function savePrivacySettings(req, res) {
  try {
    const { userId } = getAuth(req);
    const { privacy } = req.body;
    const parsed = parsePrivacyPatch(privacy);
    if (!parsed.success) {
      return res.status(400).json({
        code: "INVALID_PRIVACY_SETTINGS",
        error: "Invalid privacy settings",
        issues: parsed.issues,
      });
    }

    const requestedPrivacyPatch = parsed.data;
    const metadata = parsePrivacyRequestMetadata(req.body);
    if (!metadata.success) {
      return res.status(400).json({
        code: "INVALID_PRIVACY_METADATA",
        error: `Invalid ${metadata.field}`,
      });
    }

    const changedAt = new Date();
    const result = await req.db.transaction(async (tx) => {
      await tx
        .insert(accountSettingsTable)
        .values({
          userId,
          privacy: normalizePrivacySettings(null),
          updatedAt: changedAt,
        })
        .onConflictDoNothing({ target: accountSettingsTable.userId });

      const lockedRows = await tx.execute(sql`
        SELECT privacy
        FROM account_settings
        WHERE user_id = ${userId}
        FOR UPDATE
      `);
      const currentPrivacy = lockedRows?.[0]?.privacy || {};
      const resolved = resolvePrivacyDependencies(currentPrivacy, requestedPrivacyPatch);
      if (!resolved.success) {
        return { dependencyIssues: resolved.issues, rows: [] };
      }

      const privacyPatch = resolved.data;
      const storedPatch = buildStoredPrivacyPatch(privacyPatch);
      const auditChanges = buildPrivacyAuditChanges(currentPrivacy, privacyPatch, changedAt);

      const rows = await tx
        .update(accountSettingsTable)
        .set({
          privacy: sql`(
            COALESCE(${accountSettingsTable.privacy}, '{}'::json)::jsonb
            || ${JSON.stringify(storedPatch)}::jsonb
          )::json`,
          updatedAt: changedAt,
        })
        .where(eq(accountSettingsTable.userId, userId))
        .returning({ privacy: accountSettingsTable.privacy });

      if (auditChanges.length > 0) {
        await tx.insert(privacyConsentAuditTable).values(
          auditChanges.map((change) => ({
            ...change,
            userId,
            sourceScreen: metadata.sourceScreen,
            devicePlatform: metadata.devicePlatform,
          }))
        );
      }

      return { dependencyIssues: null, rows };
    });

    if (result.dependencyIssues) {
      return res.status(409).json({
        code: "PRIVACY_DEPENDENCY_REQUIRED",
        error: "A required privacy purpose is disabled",
        issues: result.dependencyIssues,
      });
    }

    const updated = result.rows;

    if (!updated[0]) return res.status(404).json({ error: "Settings not found" });
    res.status(200).json(normalizePrivacySettings(updated[0].privacy));
  } catch (error) {
    console.log("Error saving privacy settings", error);
    sendDevError(res, error);
  }
}

export async function getPrivacyAudit(req, res) {
  try {
    const { userId } = getAuth(req);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;
    const cursor = decodePrivacyAuditCursor(req.query.cursor);

    if (req.query.cursor && !cursor) {
      return res.status(400).json({
        code: "INVALID_CURSOR",
        error: "Invalid privacy history cursor",
      });
    }

    const cursorCondition = cursor
      ? or(
          lt(privacyConsentAuditTable.changedAt, cursor.changedAt),
          and(
            eq(privacyConsentAuditTable.changedAt, cursor.changedAt),
            lt(privacyConsentAuditTable.id, cursor.id)
          )
        )
      : undefined;

    const rows = await req.db
      .select({
        id: privacyConsentAuditTable.id,
        purposeKey: privacyConsentAuditTable.purposeKey,
        previousState: privacyConsentAuditTable.previousState,
        newState: privacyConsentAuditTable.newState,
        policyVersion: privacyConsentAuditTable.policyVersion,
        sourceScreen: privacyConsentAuditTable.sourceScreen,
        devicePlatform: privacyConsentAuditTable.devicePlatform,
        changedAt: privacyConsentAuditTable.changedAt,
        revokedAt: privacyConsentAuditTable.revokedAt,
      })
      .from(privacyConsentAuditTable)
      .where(cursorCondition
        ? and(eq(privacyConsentAuditTable.userId, userId), cursorCondition)
        : eq(privacyConsentAuditTable.userId, userId))
      .orderBy(desc(privacyConsentAuditTable.changedAt), desc(privacyConsentAuditTable.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const events = hasMore ? rows.slice(0, limit) : rows;
    const lastEvent = events.at(-1);

    return res.status(200).json({
      schemaVersion: 1,
      events,
      nextCursor: hasMore && lastEvent ? encodePrivacyAuditCursor(lastEvent) : null,
    });
  } catch (error) {
    console.log("Error fetching privacy history", error);
    sendDevError(res, error);
  }
}

export async function getPreferences(req, res) {
  try {
    const { userId } = getAuth(req);
    const [settings] = await req.db
      .select({ preferences: accountSettingsTable.preferences })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (!settings) {
      return res.status(200).json({
        autoAnalyze: true,
        hapticFeedback: true,
        metricUnits: true,
      });
    }
    res.status(200).json(settings.preferences || {});
  } catch (error) {
    console.log("Error fetching preferences", error);
    sendDevError(res, error);
  }
}

export async function savePreferences(req, res) {
  try {
    const { userId } = getAuth(req);
    const { preferences } = req.body;
    if (typeof preferences !== "object" || preferences === null) {
      return res.status(400).json({ error: "Invalid preferences object" });
    }

    const updated = await req.db
      .insert(accountSettingsTable)
      .values({
        userId,
        preferences,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountSettingsTable.userId,
        set: { preferences, updatedAt: new Date() },
      })
      .returning({ preferences: accountSettingsTable.preferences });

    if (!updated[0]) return res.status(404).json({ error: "Settings not found" });
    res.status(200).json(updated[0].preferences || {});
  } catch (error) {
    console.log("Error saving preferences", error);
    sendDevError(res, error);
  }
}

export async function getProfile(req, res) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Ensure schema is up to date
    await ensureProfilesTableShape();

    // Helper for safe loading with detailed error handling
    const safeLoadSingle = async (table, where, tableName) => {
      try {
        const [row] = await req.db.select().from(table).where(where);
        return row || null;
      } catch (err) {
        // Table doesn't exist (PostgreSQL error code 42P01)
        if (err && err.code === "42P01") {
          console.warn(`⚠️ Table ${tableName} does not exist yet`);
          return null;
        }
        // Column doesn't exist (PostgreSQL error code 42703)
        if (err && err.code === "42703") {
          console.warn(`⚠️ Column missing in ${tableName}:`, err.message);
          return null;
        }
        console.error(`❌ Error loading ${tableName}:`, err);
        return null; // Graceful degradation
      }
    };

    // Load profile (with safe error handling for missing columns)
    let profile;
    try {
      const profileResult = await req.db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId));
      profile = profileResult[0] || null;
    } catch (err) {
      // Column doesn't exist (PostgreSQL error code 42703)
      if (err && err.code === "42703") {
        console.warn(`⚠️ Some profile columns missing, attempting partial select:`, err.message);
        // Try with partial select (without new columns that might not exist)
        try {
          const profileResult = await req.db
            .select({
              id: profilesTable.id,
              userId: profilesTable.userId,
              fullName: profilesTable.fullName,
              email: profilesTable.email,
              gender: profilesTable.gender,
              age: profilesTable.age,
              weightKg: profilesTable.weightKg,
              heightCm: profilesTable.heightCm,
              activityLevel: profilesTable.activityLevel,
              cuisinePreference: profilesTable.cuisinePreference,
              region: profilesTable.region,
              cookingStyle: profilesTable.cookingStyle,
              notifications: profilesTable.notifications,
              onboardingCompletedAt: profilesTable.onboardingCompletedAt,
              createdAt: profilesTable.createdAt,
              updatedAt: profilesTable.updatedAt,
            })
            .from(profilesTable)
            .where(eq(profilesTable.userId, userId));
          profile = profileResult[0] || null;
          console.log('✅ Partial profile load successful');
        } catch (partialErr) {
          console.error('❌ Even partial profile load failed:', partialErr);
          throw err; // Throw original error
        }
      } else {
        throw err; // Re-throw if not a missing column error
      }
    }

    if (!profile) {
      console.log(`⚠️ Profile not found for user ${userId}`);
      return res.status(404).json({
        error: "Profile not found",
        hint: "Profile may not have been created yet"
      });
    }

    // Load related data in parallel for better performance
    const [dietary, goals, gamification] = await Promise.all([
      safeLoadSingle(dietaryPreferencesTable, eq(dietaryPreferencesTable.userId, userId), 'dietary_preferences'),
      safeLoadSingle(nutritionGoalsTable, eq(nutritionGoalsTable.userId, userId), 'nutrition_goals'),
      safeLoadSingle(gamificationTable, eq(gamificationTable.userId, userId), 'gamification')
    ]);

    // Normalize profile data with safe defaults
    const basics = {
      fullName: profile.fullName || "",
      email: profile.email || "",
      gender: profile.gender || "",
      age: profile.age ?? null,
      weightKg: profile.weightKg ?? null,
      heightCm: profile.heightCm ?? null,
      activityLevel: profile.activityLevel || ""
    };

    // Include onboarding completion status
    const onboardingCompletedAt = profile.onboardingCompletedAt || null;

    const normalizedDietary = {
      preferences: Array.isArray(dietary?.preferences) ? dietary.preferences : [],
      allergies: Array.isArray(dietary?.allergies) ? dietary.allergies : [],
      allergenSeverity: (dietary?.allergenSeverity && typeof dietary.allergenSeverity === 'object')
        ? dietary.allergenSeverity : {},
      intoleranceType: (dietary?.intoleranceType && typeof dietary.intoleranceType === 'object')
        ? dietary.intoleranceType : {},
      dislikes: Array.isArray(dietary?.dislikes) ? dietary.dislikes : [],
      cuisinePreference: Array.isArray(profile?.cuisinePreference) ? profile.cuisinePreference : [],
      region: profile?.region || null,
      cookingStyle: profile?.cookingStyle || null
    };

    const normalizedGoals = {
      primaryGoal: goals?.primaryGoal || "",
      dailyCalories: goals?.dailyCalories ?? null,
      proteinG: goals?.proteinG ?? null,
      carbsG: goals?.carbsG ?? null,
      fatsG: goals?.fatsG ?? null,
      waterLiters: goals?.waterLiters ?? null
    };

    const normalizedGamification = {
      xp: gamification?.xp ?? 0,
      level: gamification?.level ?? 1,
      streak: gamification?.streak ?? 0,
      badges: Array.isArray(gamification?.badges) ? gamification.badges : []
    };

    res.status(200).json({
      basics,
      dietary: normalizedDietary,
      goals: normalizedGoals,
      gamification: normalizedGamification,
      onboardingCompletedAt
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    sendDevError(res, error);
  }
}

export async function saveBasics(req, res) {
  try {
    const { userId } = getAuth(req);
    let { fullName, email, gender, age, weightKg, heightCm, activityLevel } = req.body;
    await ensureProfilesTableShape();

    // Validate gender if provided
    const validGenders = ['female', 'male', 'other'];
    if (gender && !validGenders.includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender value',
        message: `Gender must be one of: ${validGenders.join(', ')}`,
        received: gender,
      });
    }

    // Validate activity level if provided
    const validActivityLevels = ['sedentary', 'lightly_active', 'moderate', 'very_active', 'extremely_active'];
    if (activityLevel && !validActivityLevels.includes(activityLevel)) {
      return res.status(400).json({
        error: 'Invalid activity level value',
        message: `Activity level must be one of: ${validActivityLevels.join(', ')}`,
        received: activityLevel,
      });
    }

    // 🆕 IDEMPOTENT: Check if profile already exists before creating
    // This prevents duplicate profile creation if saveBasics is called multiple times
    const existing = await req.db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    const profileData = {
      fullName,
      email,
      gender,
      age: age ? parseInt(age, 10) : null,
      weightKg: weightKg ? parseFloat(weightKg) : null,
      heightCm: heightCm ? parseInt(heightCm, 10) : null,
      activityLevel,
      updatedAt: new Date(),
    };

    let basicsRow;
    if (existing.length > 0) {
      // Profile exists - UPDATE only
      const updated = await req.db
        .update(profilesTable)
        .set(profileData)
        .where(eq(profilesTable.userId, userId))
        .returning();
      basicsRow = updated[0];
      console.log(`[saveBasics] ✅ UPDATED profile for user ${userId}`);
    } else {
      // Profile doesn't exist - CREATE only
      const created = await req.db
        .insert(profilesTable)
        .values({
          userId,
          ...profileData,
          createdAt: new Date(), // Only set on creation
        })
        .returning();
      basicsRow = created[0];
      console.log(`[saveBasics] ✅ CREATED profile for user ${userId}`);
    }

    const basics = {
      fullName: basicsRow.fullName || "",
      email: basicsRow.email || "",
      gender: basicsRow.gender || "",
      age: basicsRow.age ?? null,
      weightKg: basicsRow.weightKg ?? null,
      heightCm: basicsRow.heightCm ?? null,
      activityLevel: basicsRow.activityLevel || ""
    };
    res.status(200).json(basics);
  } catch (error) {
    console.error('[saveBasics] ❌ Error saving profile basics:', {
      userId: getAuth(req)?.userId,
      error: error.message,
      code: error.code,
    });
    sendDevError(res, error);
  }
}

/**
 * Normalize preference items - converts strings to {id, strength} objects
 * or validates existing objects
 */
function normalizePreference(item) {
  if (typeof item === 'string') {
    return { id: item, strength: 3 };
  }
  if (typeof item === 'object' && item !== null && item.id) {
    const strength = typeof item.strength === 'number' ? item.strength : 3;
    // Clamp strength to 1-5 range
    const validStrength = Math.max(1, Math.min(5, strength));
    return { id: item.id, strength: validStrength };
  }
  return null;
}

/**
 * Normalize array of preferences, filtering out invalid items
 */
function normalizePreferences(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizePreference)
    .filter(item => item !== null);
}

/**
 * Normalize allergies and dislikes (simple string arrays)
 */
function normalizeStringArray(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim());
}

const VALID_ALLERGEN_SEVERITIES = ['mild', 'moderate', 'severe', 'anaphylaxis'];
const VALID_INTOLERANCE_TYPES = ['allergy', 'intolerance', 'preference'];

const VALID_REGIONS = [
  'north_america', 'latin_america', 'europe', 'middle_east',
  'south_asia', 'east_asia', 'southeast_asia', 'africa', 'oceania',
];
const VALID_COOKING_STYLES = ['fried', 'steamed', 'grilled', 'boiled', 'baked', 'raw', 'mixed'];

export async function saveDietary(req, res) {
  try {
    const { userId } = getAuth(req);
    const {
      preferences,
      allergies,
      allergenSeverity,
      intoleranceType,
      dislikes,
      cuisinePreference,
      region,
      cookingStyle,
    } = req.body;

    // Validate that array fields are actually arrays
    if (preferences && !Array.isArray(preferences)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'preferences must be an array',
        received: typeof preferences,
      });
    }
    if (allergies && !Array.isArray(allergies)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'allergies must be an array',
        received: typeof allergies,
      });
    }
    if (dislikes && !Array.isArray(dislikes)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'dislikes must be an array',
        received: typeof dislikes,
      });
    }
    if (cuisinePreference && !Array.isArray(cuisinePreference)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'cuisinePreference must be an array',
        received: typeof cuisinePreference,
      });
    }

    // Normalize and validate preference data (with strength support)
    const normalizedPreferences = normalizePreferences(preferences);
    const normalizedCuisine = normalizePreferences(cuisinePreference);
    const normalizedAllergies = normalizeStringArray(allergies);
    const normalizedDislikes = normalizeStringArray(dislikes);

    // 🆕 Validate preference IDs against known enums
    const invalidDietaryPrefs = normalizedPreferences.filter(
      pref => !VALID_DIETARY_PREFERENCES.includes(pref.id)
    );
    if (invalidDietaryPrefs.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid dietary preference ID(s): ${invalidDietaryPrefs.map(p => p.id).join(', ')}`,
        validOptions: VALID_DIETARY_PREFERENCES,
      });
    }

    const invalidCuisinePrefs = normalizedCuisine.filter(
      pref => !VALID_CUISINE_PREFERENCES.includes(pref.id)
    );
    if (invalidCuisinePrefs.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid cuisine preference ID(s): ${invalidCuisinePrefs.map(p => p.id).join(', ')}`,
        validOptions: VALID_CUISINE_PREFERENCES,
      });
    }

    const invalidAllergies = normalizedAllergies.filter(
      allergy => !VALID_ALLERGIES.includes(allergy)
    );
    if (invalidAllergies.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid allergy ID(s): ${invalidAllergies.join(', ')}`,
        validOptions: VALID_ALLERGIES,
      });
    }

    // Validate allergenSeverity map (optional)
    const normalizedAllergenSeverity = {};
    if (allergenSeverity && typeof allergenSeverity === 'object' && !Array.isArray(allergenSeverity)) {
      for (const [allergen, severity] of Object.entries(allergenSeverity)) {
        if (!VALID_ALLERGIES.includes(allergen)) continue; // silently skip unknown allergens
        if (!VALID_ALLERGEN_SEVERITIES.includes(severity)) {
          return res.status(400).json({
            error: 'Validation error',
            message: `Invalid severity "${severity}" for allergen "${allergen}"`,
            validOptions: VALID_ALLERGEN_SEVERITIES,
          });
        }
        normalizedAllergenSeverity[allergen] = severity;
      }
    }

    // Validate intoleranceType map (optional)
    const normalizedIntoleranceType = {};
    if (intoleranceType && typeof intoleranceType === 'object' && !Array.isArray(intoleranceType)) {
      for (const [allergen, type] of Object.entries(intoleranceType)) {
        if (!VALID_ALLERGIES.includes(allergen)) continue;
        if (!VALID_INTOLERANCE_TYPES.includes(type)) {
          return res.status(400).json({
            error: 'Validation error',
            message: `Invalid intolerance type "${type}" for "${allergen}"`,
            validOptions: VALID_INTOLERANCE_TYPES,
          });
        }
        normalizedIntoleranceType[allergen] = type;
      }
    }

    // Validate region and cookingStyle against known enums
    if (region && !VALID_REGIONS.includes(region)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid region "${region}"`,
        validOptions: VALID_REGIONS,
      });
    }
    if (cookingStyle && !VALID_COOKING_STYLES.includes(cookingStyle)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid cookingStyle "${cookingStyle}"`,
        validOptions: VALID_COOKING_STYLES,
      });
    }

    // Validate dislikes: max 100 items, each max 100 chars
    if (normalizedDislikes.length > 100) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Too many dislikes (max 100)',
      });
    }
    const longDislike = normalizedDislikes.find((d) => d.length > 100);
    if (longDislike) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Dislike entry too long (max 100 chars): "${longDislike.slice(0, 30)}..."`,
      });
    }

    // Ensure at least one dietary preference
    if (normalizedPreferences.length === 0 && normalizedCuisine.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'At least one dietary preference or cuisine preference is required',
      });
    }

    // 🆕 ATOMIC TRANSACTION: Both updates must succeed or both fail
    // Wrap in transaction to ensure consistency
    const dietaryResult = await req.db.transaction(async (tx) => {
      // Update regional context in profiles table
      if (normalizedCuisine.length > 0 || region || cookingStyle) {
        await tx
          .update(profilesTable)
          .set({
            cuisinePreference: normalizedCuisine,
            region: region || null,
            cookingStyle: cookingStyle || null,
            updatedAt: new Date(),
          })
          .where(eq(profilesTable.userId, userId));
      }

      // Update dietary preferences (atomic upsert)
      const result = await tx
        .insert(dietaryPreferencesTable)
        .values({
          userId,
          preferences: normalizedPreferences,
          allergies: normalizedAllergies,
          allergenSeverity: normalizedAllergenSeverity,
          intoleranceType: normalizedIntoleranceType,
          dislikes: normalizedDislikes,
        })
        .onConflictDoUpdate({
          target: dietaryPreferencesTable.userId,
          set: {
            preferences: normalizedPreferences,
            allergies: normalizedAllergies,
            allergenSeverity: normalizedAllergenSeverity,
            intoleranceType: normalizedIntoleranceType,
            dislikes: normalizedDislikes,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result;
    });

    const dietaryRow = dietaryResult[0];
    const dietary = {
      preferences: Array.isArray(dietaryRow?.preferences) ? dietaryRow.preferences : [],
      allergies: Array.isArray(dietaryRow?.allergies) ? dietaryRow.allergies : [],
      allergenSeverity: dietaryRow?.allergenSeverity ?? {},
      intoleranceType: dietaryRow?.intoleranceType ?? {},
      dislikes: Array.isArray(dietaryRow?.dislikes) ? dietaryRow.dislikes : [],
      cuisinePreference: normalizedCuisine,
    };

    console.log('[saveDietary] ✅ Successfully saved dietary preferences in atomic transaction:', {
      userId,
      preferencesCount: dietary.preferences.length,
      allergiesCount: dietary.allergies.length,
      cuisineCount: dietary.cuisinePreference.length,
    });

    res.status(200).json(dietary);
  } catch (error) {
    console.error('[saveDietary] ❌ Error saving dietary preferences:', {
      userId: getAuth(req)?.userId,
      error: error.message,
      code: error.code,
    });
    sendDevError(res, error);
  }
}

export async function saveGoals(req, res) {
  try {
    const { userId } = getAuth(req);
    let { primaryGoal, dailyCalories, proteinG, carbsG, fatsG, waterLiters } = req.body;

    // Sanitize primaryGoal - normalize to valid values
    const goalMapping = {
      'lose_weight': 'lose',
      'maintain_weight': 'maintain',
      'gain_weight': 'gain',
      'gain_muscle': 'gain',
      'lose': 'lose',
      'maintain': 'maintain',
      'gain': 'gain'
    };

    if (primaryGoal && goalMapping[primaryGoal]) {
      primaryGoal = goalMapping[primaryGoal];
    } else if (primaryGoal && !['lose', 'maintain', 'gain'].includes(primaryGoal)) {
      console.warn(`⚠️ Invalid primaryGoal value: ${primaryGoal}, defaulting to 'maintain'`);
      primaryGoal = 'maintain';
    }

    // Validate numeric fields
    if (dailyCalories !== undefined && dailyCalories !== null && dailyCalories !== '') {
      const caloriesNum = parseInt(dailyCalories, 10);
      if (isNaN(caloriesNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'dailyCalories must be a valid number',
          received: dailyCalories,
        });
      }
      if (caloriesNum < 500 || caloriesNum > 10000) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'dailyCalories must be between 500 and 10,000',
          received: caloriesNum,
        });
      }
    }

    if (proteinG !== undefined && proteinG !== null && proteinG !== '') {
      const proteinNum = parseInt(proteinG, 10);
      if (isNaN(proteinNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'proteinG must be a valid number',
          received: proteinG,
        });
      }
      if (proteinNum < 0 || proteinNum > 500) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'proteinG must be between 0 and 500',
          received: proteinNum,
        });
      }
    }

    if (carbsG !== undefined && carbsG !== null && carbsG !== '') {
      const carbsNum = parseInt(carbsG, 10);
      if (isNaN(carbsNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'carbsG must be a valid number',
          received: carbsG,
        });
      }
      if (carbsNum < 0 || carbsNum > 1000) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'carbsG must be between 0 and 1,000',
          received: carbsNum,
        });
      }
    }

    if (fatsG !== undefined && fatsG !== null && fatsG !== '') {
      const fatsNum = parseInt(fatsG, 10);
      if (isNaN(fatsNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'fatsG must be a valid number',
          received: fatsG,
        });
      }
      if (fatsNum < 0 || fatsNum > 300) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'fatsG must be between 0 and 300',
          received: fatsNum,
        });
      }
    }

    if (waterLiters !== undefined && waterLiters !== null && waterLiters !== '') {
      const waterNum = parseFloat(waterLiters);
      if (isNaN(waterNum)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'waterLiters must be a valid number',
          received: waterLiters,
        });
      }
      if (waterNum < 0 || waterNum > 10) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'waterLiters must be between 0 and 10',
          received: waterNum,
        });
      }
    }

    // Use atomic upsert to avoid race condition (check-then-act)
    const goalsResult = await req.db
      .insert(nutritionGoalsTable)
      .values({
        userId,
        primaryGoal,
        dailyCalories: dailyCalories ? parseInt(dailyCalories, 10) : null,
        proteinG: proteinG ? parseInt(proteinG, 10) : null,
        carbsG: carbsG ? parseInt(carbsG, 10) : null,
        fatsG: fatsG ? parseInt(fatsG, 10) : null,
        waterLiters: waterLiters ? parseFloat(waterLiters) : null,
      })
      .onConflictDoUpdate({
        target: nutritionGoalsTable.userId,
        set: {
          primaryGoal,
          dailyCalories: dailyCalories ? parseInt(dailyCalories, 10) : null,
          proteinG: proteinG ? parseInt(proteinG, 10) : null,
          carbsG: carbsG ? parseInt(carbsG, 10) : null,
          fatsG: fatsG ? parseInt(fatsG, 10) : null,
          waterLiters: waterLiters ? parseFloat(waterLiters) : null,
          updatedAt: new Date(),
        },
      })
      .returning();
    const goalsRow = goalsResult[0];
    const goals = {
      primaryGoal: goalsRow?.primaryGoal || "",
      dailyCalories: goalsRow?.dailyCalories ?? null,
      proteinG: goalsRow?.proteinG ?? null,
      carbsG: goalsRow?.carbsG ?? null,
      fatsG: goalsRow?.fatsG ?? null,
      waterLiters: goalsRow?.waterLiters ?? null
    };
    res.status(200).json(goals);
  } catch (error) {
    console.log("Error saving nutrition goals", error);
    sendDevError(res, error);
  }
}

export async function saveGamification(req, res) {
  try {
    const { userId } = getAuth(req);
    const { xp, level, streak, badges } = req.body;
    // Use atomic upsert to avoid race condition (check-then-act)
    const gamificationResult = await req.db
      .insert(gamificationTable)
      .values({
        userId,
        xp: xp || 0,
        level: level || 1,
        streak: streak || 0,
        badges: badges || [],
      })
      .onConflictDoUpdate({
        target: gamificationTable.userId,
        set: {
          xp: xp || 0,
          level: level || 1,
          streak: streak || 0,
          badges: badges || [],
          updatedAt: new Date(),
        },
      })
      .returning();
    const gamificationRow = gamificationResult[0];
    const gamification = {
      xp: gamificationRow?.xp ?? 0,
      level: gamificationRow?.level ?? 1,
      streak: gamificationRow?.streak ?? 0,
      badges: Array.isArray(gamificationRow?.badges) ? gamificationRow.badges : []
    };
    res.status(200).json(gamification);
  } catch (error) {
    console.log("Error saving gamification stats", error);
    sendDevError(res, error);
  }
}

/**
 * Mark onboarding as complete for the user
 * Called when user finishes the 4-step onboarding flow
 * Sets onboarding_completed_at timestamp to current time
 */
export async function completeOnboarding(req, res) {
  try {
    const { userId } = getAuth(req);

    // Ensure schema is up to date
    await ensureProfilesTableShape();

    // Update profile with onboarding completion timestamp
    const updated = await req.db
      .update(profilesTable)
      .set({
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profilesTable.userId, userId))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({
        error: "Profile not found",
        hint: "User profile must exist before marking onboarding complete"
      });
    }

    const profile = updated[0];
    res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
      onboardingCompletedAt: profile.onboardingCompletedAt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error completing onboarding:", error);
    sendDevError(res, error);
  }
}

// --- GDPR Data Export ---
export async function exportUserData(req, res) {
  try {
    const { userId } = getAuth(req);
    console.log(`[exportUserData] Exporting data for user ${userId}`);

    // Load all user data in parallel
    const [
      profile,
      dietary,
      goals,
      gamification,
      settings,
      collectionEntries,
    ] = await Promise.all([
      req.db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).then(r => r[0]),
      req.db.select().from(dietaryPreferencesTable).where(eq(dietaryPreferencesTable.userId, userId)).then(r => r[0]),
      req.db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId)).then(r => r[0]),
      req.db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).then(r => r[0]),
      req.db.select().from(accountSettingsTable).where(eq(accountSettingsTable.userId, userId)).then(r => r[0]),
      Promise.all(CORE_WELLNESS_EXPORT_COLLECTIONS.map(async ({ key, table }) => [
        key,
        await req.db.select().from(table).where(eq(table.userId, userId)),
      ])),
    ]);
    const collections = Object.fromEntries(collectionEntries);

    const exportData = buildProfileExportPayload({
      userId,
      profile,
      dietaryPreferences: dietary,
      nutritionGoals: goals,
      gamification,
      accountSettings: settings,
      collections,
    });

    console.log(`[exportUserData] Exported core wellness data for user ${userId}`);

    const format = String(req.query.format || "json").toLowerCase();
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const zipBuffer = await buildExportZip(exportData);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="mft-export-${dateStamp}.zip"`);
      return res.status(200).send(zipBuffer);
    }

    if (format === "pdf") {
      const pdfBuffer = await buildExportPDF(exportData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="mft-export-${dateStamp}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    res.status(200).json(exportData);
  } catch (error) {
    console.error("[exportUserData] ❌ Error exporting user data:", error);
    sendDevError(res, error);
  }
}

// --- GDPR Account Deletion / App Store Guideline 5.1.1(v) ---
//
// Deleting an account has TWO halves and both must complete:
//   1. Application data — the `profiles` row, which cascades to every child table.
//   2. Identity — the Clerk user. Without this the person can sign straight back
//      in, which reads as "account not deleted" to an App Review tester and is a
//      Guideline 5.1.1(v) rejection.
//
// Ordering is deliberate: data first, identity second. If we killed the Clerk user
// first and the database delete then failed, the caller could never re-authenticate
// to retry, stranding their personal data permanently. Data-first means a failure
// leaves an account that can still call this endpoint again.
//
// Every step is idempotent so the client can safely retry: a retry that finds no
// profile row still goes on to remove the Clerk user, and a Clerk user that is
// already gone is treated as success.
export async function deleteAccount(req, res) {
  const { userId } = getAuth(req);

  try {
    console.log(`[deleteAccount] ⚠️ Deleting account for user ${userId}`);

    // Step 1 — application data. Cascades to account_settings, dietary_preferences,
    // nutrition_goals, gamification, food_log, water_log, mood_log, activity_log and
    // every other table whose user_id references profiles.user_id ON DELETE CASCADE.
    // A missing profile is NOT an error here: it means a previous attempt already got
    // this far and we still owe the caller the identity delete below.
    const deletedProfiles = await req.db
      .delete(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .returning({ id: profilesTable.id });

    if (deletedProfiles.length === 0) {
      console.warn(`[deleteAccount] No profile row for ${userId} — continuing to identity deletion (retry path)`);
    }

    // Step 2 — identity. This is what actually prevents the account from working again.
    await deleteClerkUser(userId);

    console.log(`[deleteAccount] ✅ Account and identity deleted for user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Account and all associated data have been permanently deleted",
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    // Loud, greppable log: if we get here after the profile delete succeeded, the
    // user's data is gone but their login still works. They can retry, but this
    // needs to be visible in Railway logs for manual reconciliation.
    console.error(`[deleteAccount] ❌ CRITICAL: account deletion incomplete for user ${userId}:`, error);
    sendDevError(res, error);
  }
}

/**
 * Permanently removes the Clerk user. Idempotent — a user that is already gone
 * resolves successfully so the client's retry path terminates.
 */
async function deleteClerkUser(userId) {
  if (!process.env.CLERK_SECRET_KEY) {
    // Fail loudly rather than silently leaving a working login behind.
    throw new Error("CLERK_SECRET_KEY is not configured — cannot delete the user's identity");
  }

  try {
    await clerkClient.users.deleteUser(userId);
    console.log(`[deleteAccount] ✅ Clerk user ${userId} deleted`);
  } catch (error) {
    if (error?.status === 404 || error?.errors?.[0]?.code === "resource_not_found") {
      console.log(`[deleteAccount] Clerk user ${userId} already absent — treating as deleted`);
      return;
    }
    throw error;
  }
}
