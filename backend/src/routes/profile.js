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
  getNotifications,
  saveNotifications,
  getPrivacySettings,
  savePrivacySettings,
  getPreferences,
  savePreferences
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

// Notification preferences
router.get("/notifications", getNotifications);
router.post("/notifications", saveNotifications);

// Privacy settings
router.get("/privacy", getPrivacySettings);
router.post("/privacy", savePrivacySettings);

// App preferences
router.get("/preferences", getPreferences);
router.post("/preferences", savePreferences);

router.post("/gamification", saveGamification);

export default router;
