/**
 * Middleware to ensure user has a profile record
 * Auto-creates profile if it doesn't exist
 */
import { eq } from "drizzle-orm";
import { profilesTable } from "../db/schema.js";

/**
 * Ensures authenticated user has a profile in the database
 * Creates one if it doesn't exist
 */
export const ensureProfile = async (req, res, next) => {
  try {
    const { userId } = req.auth;

    if (!userId) {
      return next(); // No user, skip profile creation
    }

    // Check if profile exists
    const [existingProfile] = await req.db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (existingProfile) {
      return next(); // Profile exists, continue
    }

    // Create profile
    console.log(`📝 Creating profile for user ${userId}`);

    await req.db
      .insert(profilesTable)
      .values({
        userId,
        fullName: null,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing(); // In case of race condition

    console.log(`✅ Profile created for user ${userId}`);
    next();
  } catch (error) {
    console.error("❌ Error ensuring profile:", error);
    // Don't block request if profile creation fails
    // Profile will be created by saveBasics if needed
    next();
  }
};
