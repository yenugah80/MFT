import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getProfile,
  saveBasics,
  saveDietary,
  saveGoals,
  saveGamification
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/", requireAuth, getProfile);
router.post("/basics", requireAuth, saveBasics);
router.post("/dietary", requireAuth, saveDietary);
router.post("/goals", requireAuth, saveGoals);
router.post("/gamification", requireAuth, saveGamification);

export default router;
