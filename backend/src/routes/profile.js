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
  exportUserData,
  deleteAccount,
} from "../controllers/profileController.js";

const router = express.Router();

// Apply auth, db, and profile middleware to all routes
router.use(requireAuth);
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

// Privacy settings
router.get("/privacy", getPrivacySettings);
router.post("/privacy", savePrivacySettings);

// App preferences
router.get("/preferences", getPreferences);
router.post("/preferences", savePreferences);

router.post("/gamification", saveGamification);

// GDPR Data Rights
router.get("/export", exportUserData);
router.delete("/delete-account", deleteAccount);

export default router;
