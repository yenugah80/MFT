import { eq } from "drizzle-orm";
import { activityLevelsTable } from "../db/schema.js";

export async function getActivityLevels(req, res) {
  try {
    const levels = await req.db.select().from(activityLevelsTable);
    res.status(200).json(levels);
  } catch (error) {
    console.log("Error fetching activity levels", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function createActivityLevel(req, res) {
  try {
    // In a real app, check for admin role here
    const { key, label, desc, factor } = req.body;
    const created = await req.db.insert(activityLevelsTable).values({
      key, label, desc, factor
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) {
    console.log("Error creating activity level", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function updateActivityLevel(req, res) {
  try {
    const { id } = req.params;
    const { key, label, desc, factor } = req.body;
    const updated = await req.db.update(activityLevelsTable)
      .set({ key, label, desc, factor, updatedAt: new Date() })
      .where(eq(activityLevelsTable.id, parseInt(id)))
      .returning();
    res.status(200).json(updated[0]);
  } catch (error) {
    console.log("Error updating activity level", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function deleteActivityLevel(req, res) {
  try {
    const { id } = req.params;
    await req.db.delete(activityLevelsTable).where(eq(activityLevelsTable.id, parseInt(id)));
    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error deleting activity level", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
