import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate, favoritesSchema } from "../middleware/validation.js";
import {
  getFavorites,
  addFavorite,
  deleteFavorite
} from "../controllers/favoritesController.js";


import { attachDb } from "../middleware/db.js";
const router = express.Router();

// Attach DB middleware to all favorites routes
router.use(attachDb);

router.get("/", requireAuth, getFavorites);
router.post("/", requireAuth, validate(favoritesSchema), addFavorite);
router.delete("/:recipeId", requireAuth, deleteFavorite);

export default router;
