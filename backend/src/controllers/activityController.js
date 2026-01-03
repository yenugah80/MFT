import { eq } from "drizzle-orm";
import { activityLevelsTable } from "../db/schema.js";
import errors from "../utils/errorResponse.js";

export async function getActivityLevels(req, res) {
  try {
    const levels = await req.db.select().from(activityLevelsTable);
    res.status(200).json(levels);
  } catch (error) {
    console.error("[ActivityController] Error fetching activity levels:", error);
    return errors.internal(res, "Failed to fetch activity levels");
  }
}

export async function createActivityLevel(req, res) {
  try {
    const { key, label, desc, factor } = req.body;

    // Validate required fields
    if (!key) return errors.missingField(res, "key");
    if (!label) return errors.missingField(res, "label");

    const result = await req.db
      .insert(activityLevelsTable)
      .values({ key, label, desc, factor })
      .returning();

    if (!result || result.length === 0) {
      return errors.database(res, "create activity level");
    }

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("[ActivityController] Error creating activity level:", error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return errors.conflict(res, "Activity level with this key already exists");
    }

    return errors.internal(res, "Failed to create activity level");
  }
}

export async function updateActivityLevel(req, res) {
  try {
    const { id } = req.params;
    const { key, label, desc, factor } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return errors.invalidValue(res, "id", "must be a valid number");
    }

    const result = await req.db
      .update(activityLevelsTable)
      .set({ key, label, desc, factor, updatedAt: new Date() })
      .where(eq(activityLevelsTable.id, parseInt(id)))
      .returning();

    if (!result || result.length === 0) {
      return errors.notFound(res, "Activity level");
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("[ActivityController] Error updating activity level:", error);
    return errors.internal(res, "Failed to update activity level");
  }
}

export async function deleteActivityLevel(req, res) {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return errors.invalidValue(res, "id", "must be a valid number");
    }

    const result = await req.db
      .delete(activityLevelsTable)
      .where(eq(activityLevelsTable.id, parseInt(id)))
      .returning();

    if (!result || result.length === 0) {
      return errors.notFound(res, "Activity level");
    }

    res.status(200).json({ success: true, deleted: result[0] });
  } catch (error) {
    console.error("[ActivityController] Error deleting activity level:", error);
    return errors.internal(res, "Failed to delete activity level");
  }
}
