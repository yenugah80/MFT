/**
 * Middleware to ensure user has a profile record
 * Auto-creates profile if it doesn't exist
 */
import { eq } from "drizzle-orm";
import { profilesTable } from "../db/schema.js";
import { getAuth } from "@clerk/express";

/**
 * Ensures authenticated user has a profile in the database
 * Creates one if it doesn't exist
 */
export const ensureProfile = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    console.log(`[ensureProfile] userId=${userId ?? 'NULL'} path=${req.path}`);

    if (!userId) {
      console.warn('[ensureProfile] No userId in auth — skipping profile creation');
      return next();
    }

    // Upsert atomically — avoids the check-then-act race condition.
    // onConflictDoUpdate touches updatedAt so the row is always present after this call.
    const now = new Date();
    const result = await req.db
      .insert(profilesTable)
      .values({
        userId,
        fullName: null,
        email: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: profilesTable.userId,
        set: { updatedAt: now },
      })
      .returning({ id: profilesTable.id });

    if (result.length > 0) {
      console.log(`✅ Profile upserted for user ${userId}`);
    }
    next();
  } catch (error) {
    console.error("❌ Error ensuring profile:", error);
    // Don't block request if profile creation fails
    // Profile will be created by saveBasics if needed
    next();
  }
};
