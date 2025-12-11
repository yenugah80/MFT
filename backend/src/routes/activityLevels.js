import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getActivityLevels,
  createActivityLevel,
  updateActivityLevel,
  deleteActivityLevel
} from "../controllers/activityController.js";

const router = express.Router();

router.get("/", getActivityLevels);
router.post("/", requireAuth, createActivityLevel);
router.put("/:id", requireAuth, updateActivityLevel);
router.delete("/:id", requireAuth, deleteActivityLevel);

export default router;
