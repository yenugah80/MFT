import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  logMeal,
  logWater,
  logMood
} from "../controllers/loggingController.js";

const router = express.Router();

router.post("/meal", requireAuth(), logMeal);
router.post("/water", requireAuth(), logWater);
router.post("/mood", requireAuth(), logMood);

export default router;
