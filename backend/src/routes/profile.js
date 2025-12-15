import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachDb } from "../middleware/db.js";
import {
  getProfile,
  saveBasics,
  saveDietary,
  saveGoals,
  saveGamification
} from "../controllers/profileController.js";

const router = express.Router();

// Apply both auth and db middleware to all routes
router.use(requireAuth);
router.use(attachDb);

router.get("/", getProfile);
// Add /me route for current user's profile
router.get("/me", getProfile);
router.post("/basics", saveBasics);
router.post("/dietary", saveDietary);
router.post("/goals", saveGoals);
router.post("/gamification", saveGamification);

export default router;
