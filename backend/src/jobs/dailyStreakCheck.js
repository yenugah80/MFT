// Daily Streak Check Cron Job
// Runs at 12:05 AM UTC daily to validate streaks and reset if user missed a day

import cron from 'cron';
import { db } from '../config/db.js';
import { gamificationTable, foodLogTable, waterLogTable, moodLogTable } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { normalizeDateUTC, addDaysUTC } from '../utils/timezone.js';

/**
 * Initialize the daily streak check cron job
 * Runs at 00:05 UTC every day (5 minutes after midnight to allow for timezone variations)
 */
export function initStreakCronJob() {
  // Schedule: "5 0 * * *" = At 00:05 (12:05 AM) every day
  const job = new cron.CronJob(
    '5 0 * * *',
    async () => {
      console.log('[Cron] Daily streak check started at', new Date().toISOString());

      try {
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayNormalized = normalizeDateUTC(yesterday);

        const yesterdayStart = new Date(yesterdayNormalized);
        const yesterdayEnd = new Date(yesterdayNormalized);
        yesterdayEnd.setUTCHours(23, 59, 59, 999);

        // Get all users with gamification records
        const allUsers = await db
          .select({ userId: gamificationTable.userId })
          .from(gamificationTable);

        console.log(`[Cron] Checking streaks for ${allUsers.length} users`);

        let streaksReset = 0;
        let freezesUsed = 0;
        let streaksPreserved = 0;

        for (const { userId } of allUsers) {
          try {
            // Check if user logged any activity yesterday (food, water, or mood)
            const [foodLogs, waterLogs, moodLogs] = await Promise.all([
              db
                .select({ count: sql`count(*)::int` })
                .from(foodLogTable)
                .where(
                  and(
                    eq(foodLogTable.userId, userId),
                    sql`${foodLogTable.loggedDate} >= ${yesterdayStart}`,
                    sql`${foodLogTable.loggedDate} <= ${yesterdayEnd}`
                  )
                ),
              db
                .select({ count: sql`count(*)::int` })
                .from(waterLogTable)
                .where(
                  and(
                    eq(waterLogTable.userId, userId),
                    sql`${waterLogTable.loggedDate} >= ${yesterdayStart}`,
                    sql`${waterLogTable.loggedDate} <= ${yesterdayEnd}`
                  )
                ),
              db
                .select({ count: sql`count(*)::int` })
                .from(moodLogTable)
                .where(
                  and(
                    eq(moodLogTable.userId, userId),
                    sql`${moodLogTable.loggedDate} >= ${yesterdayStart}`,
                    sql`${moodLogTable.loggedDate} <= ${yesterdayEnd}`
                  )
                ),
            ]);

            const totalActivityCount =
              (foodLogs[0]?.count || 0) +
              (waterLogs[0]?.count || 0) +
              (moodLogs[0]?.count || 0);

            if (totalActivityCount === 0) {
              // User missed yesterday - check for streak freeze
              const [gamification] = await db
                .select()
                .from(gamificationTable)
                .where(eq(gamificationTable.userId, userId));

              if (!gamification || gamification.streak === 0) {
                // No active streak to maintain, skip
                continue;
              }

              if (gamification.streakFreezes > 0) {
                // Use a streak freeze
                await db
                  .update(gamificationTable)
                  .set({
                    streakFreezes: sql`${gamificationTable.streakFreezes} - 1`,
                    lastFreezeAwardedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(gamificationTable.userId, userId));

                freezesUsed++;
                console.log(`[Streak] ❄️ User ${userId} used freeze (${gamification.streakFreezes - 1} remaining)`);
              } else {
                // Reset streak
                await db
                  .update(gamificationTable)
                  .set({
                    streak: 0,
                    lastStreakUpdatedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(gamificationTable.userId, userId));

                streaksReset++;
                console.log(`[Streak] 🔄 User ${userId} streak reset (was ${gamification.streak} days)`);
              }
            } else {
              // User had activity yesterday (food, water, or mood), streak is safe
              streaksPreserved++;
            }
          } catch (userError) {
            console.error(`[Cron] Error checking streak for user ${userId}:`, userError);
          }
        }

        console.log('[Cron] Daily streak check complete:');
        console.log(`  - Streaks preserved: ${streaksPreserved}`);
        console.log(`  - Freezes used: ${freezesUsed}`);
        console.log(`  - Streaks reset: ${streaksReset}`);
        console.log(`  - Total users processed: ${allUsers.length}`);

      } catch (error) {
        console.error('[Cron] Fatal error in daily streak check:', error);
      }
    },
    null, // onComplete callback
    true, // start immediately
    'UTC' // timezone
  );

  console.log('[Cron] Daily streak check job scheduled (runs at 00:05 UTC)');
  return job;
}

/**
 * Award streak freezes based on milestones
 * Call this from the achievement service when streak milestones are reached
 * @param {string} userId - User ID
 * @param {number} streakDays - Current streak in days
 */
export async function awardStreakFreeze(userId, streakDays) {
  try {
    // Award freezes at specific milestones
    const freezeMilestones = [7, 14, 30, 60, 90];

    if (freezeMilestones.includes(streakDays)) {
      const [gamification] = await db
        .select()
        .from(gamificationTable)
        .where(eq(gamificationTable.userId, userId));

      if (!gamification) return;

      // Check if we've already awarded a freeze recently (within 24 hours)
      const lastFreezeAwarded = gamification.lastFreezeAwardedAt
        ? new Date(gamification.lastFreezeAwardedAt)
        : null;

      if (lastFreezeAwarded) {
        const hoursSinceLastFreeze = (Date.now() - lastFreezeAwarded.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastFreeze < 24) {
          return; // Already awarded recently
        }
      }

      // Award the freeze
      await db
        .update(gamificationTable)
        .set({
          streakFreezes: sql`${gamificationTable.streakFreezes} + 1`,
          lastFreezeAwardedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gamificationTable.userId, userId));

      console.log(`[Streak] 🎁 User ${userId} earned a streak freeze at ${streakDays} days`);
    }
  } catch (error) {
    console.error('[Streak] Error awarding freeze:', error);
  }
}
