import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachDb } from "../middleware/db.js";
import { ensureProfile } from "../middleware/ensureProfile.js";
import {
  getProfile,
  saveBasics,
  saveDietary,
  saveGoals,
  saveGamification,
  completeOnboarding,
  getNotifications,
  saveNotifications,
  getPrivacySettings,
  getPrivacyAudit,
  savePrivacySettings,
  getPreferences,
  savePreferences,
  savePushToken,
  deletePushToken,
  getPushTokenStatus,
  saveFCMToken,
  deleteFCMToken,
  getFCMTokenStatus,
  saveBothPushTokens,
  getDeliveredToday,
  acknowledgePushReceived,
  registerDeviceEndpoint,
  deregisterDeviceEndpoint,
  issueDeregisterTokenEndpoint,
  setNotificationOwnershipEndpoint,
  exportUserData,
  deleteAccount,
} from "../controllers/profileController.js";

const router = express.Router();

// Apply auth, db, and profile middleware to all routes
router.use(requireAuth());
router.use(attachDb);
router.use(ensureProfile); // Auto-create profile if missing

router.get("/", getProfile);
// Add /me route for current user's profile
router.get("/me", getProfile);
router.post("/basics", saveBasics);
router.post("/dietary", saveDietary);
router.post("/goals", saveGoals);
router.post("/onboarding-complete", completeOnboarding);

// Notification preferences
router.get("/notifications", getNotifications);
router.post("/notifications", saveNotifications);

// Push notification token management (Expo)
router.get("/push-token/status", getPushTokenStatus);
router.post("/push-token", savePushToken);
router.delete("/push-token", deletePushToken);

// FCM token management (Firebase Cloud Messaging)
router.get("/fcm-token/status", getFCMTokenStatus);
router.post("/fcm-token", saveFCMToken);
router.delete("/fcm-token", deleteFCMToken);

// Combined token endpoint (register both Expo and FCM tokens)
router.post("/push-tokens", saveBothPushTokens);

// Local/remote reminder de-duplication: which local categories already had
// a real server-sent notification today (see getDeliveredToday for the
// ownership model this implements)
router.get("/notifications/delivered-today", getDeliveredToday);
router.post("/notifications/ack", acknowledgePushReceived);

// Per-device registration and local-delivery ownership. Additive alongside
// /fcm-token and /push-token above — old app builds keep using those
// unchanged; new builds use these instead. See deviceRegistry.js.
router.post("/devices/register", registerDeviceEndpoint);
router.post("/devices/deregister", deregisterDeviceEndpoint);
router.post("/devices/issue-deregister-token", issueDeregisterTokenEndpoint);
router.post("/notifications/ownership", setNotificationOwnershipEndpoint);

// Privacy settings
router.get("/privacy", getPrivacySettings);
router.get("/privacy/audit", getPrivacyAudit);
router.post("/privacy", savePrivacySettings);
router.patch("/privacy", savePrivacySettings);

// App preferences
router.get("/preferences", getPreferences);
router.post("/preferences", savePreferences);

router.post("/gamification", saveGamification);

// GDPR Data Rights
router.get("/export", exportUserData);
router.delete("/delete-account", deleteAccount);

export default router;
