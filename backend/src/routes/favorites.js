import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate, favoritesSchema } from "../middleware/validation.js";
import {
  getFavorites,
  addFavorite,
  deleteFavorite
} from "../controllers/favoritesController.js";

const router = express.Router();

router.get("/", requireAuth, getFavorites);
router.post("/", requireAuth, validate(favoritesSchema), addFavorite);
router.delete("/:recipeId", requireAuth, deleteFavorite);

export default router;
