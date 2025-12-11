import { eq, and } from "drizzle-orm";
import { favoritesTable } from "../db/schema.js";

export async function getFavorites(req, res) {
  try {
    const { userId } = req.auth;
    const userfavorites = await req.db
      .select()
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, userId));
    res.status(200).json(userfavorites);
  } catch (error) {
    console.log("Error fetching the favorites", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function addFavorite(req, res) {
  try {
    const { userId } = req.auth;
    const { recipeId, title, image, cookTime, servings } = req.body;
    const recipeIdNum = Number(recipeId);
    if (Number.isNaN(recipeIdNum)) {
      return res.status(400).json({ error: "recipeId must be a number" });
    }
    const existingFavorite = await req.db
      .select({ id: favoritesTable.id })
      .from(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.recipeId, recipeIdNum)));
    if (existingFavorite.length > 0) {
      return res.status(409).json({ error: "Recipe already favorited" });
    }
    const newFavorite = await req.db
      .insert(favoritesTable)
      .values({
        userId,
        recipeId: recipeIdNum,
        title,
        image,
        cookTime,
        servings,
      })
      .returning();
    res.status(201).json(newFavorite[0]);
  } catch (error) {
    console.log("Error adding favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function deleteFavorite(req, res) {
  try {
    const { userId } = req.auth;
    const { recipeId } = req.params;
    const recipeIdNum = Number(recipeId);
    if (Number.isNaN(recipeIdNum)) {
      return res.status(400).json({ error: "recipeId must be a number" });
    }
    const deletedFavorites = await req.db
      .delete(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.recipeId, recipeIdNum)))
      .returning({ id: favoritesTable.id });
    if (deletedFavorites.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    res.status(200).json({ message: "Favorite deleted successfully" });
  } catch (error) {
    console.log("Error removing a favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
