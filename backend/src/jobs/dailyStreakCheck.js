/**
 * Daily Streak Check Cron Job
 *
 * TIMEZONE HANDLING:
 * - Cron runs at 00:05 UTC (a single trigger point)
 * - For EACH user, we use their stored timezoneOffset to calculate their local "yesterday"
 * - Example: User in UTC+5:30 at 00:05 UTC → their local time is 5:35 AM
 *   → their "yesterday" is fully complete → safe to check
 * - Example: User in UTC-12 at 00:05 UTC → their local time is 12:05 PM previous day
 *   → their "yesterday" is 2 days ago in UTC → we check that day
 *
 * This means all users get checked based on THEIR local day, not UTC.
 * Streak freeze is consumed if user missed their local yesterday.
 */

import cron from 'cron';
import { db } from '../config/db.js';
import { gamificationTable, foodLogTable, waterLogTable, moodLogTable } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { addDaysUTC, getLocalDayRange } from '../utils/timezone.js';

/**
 * Initialize the daily streak check cron job
 * Runs at 00:05 UTC - uses each user's timezone to calculate their local day
 */
export function initStreakCronJob() {
  // Schedule: "5 0 * * *" = At 00:05 (12:05 AM) every day
  const job = new cron.CronJob(
    '5 0 * * *',
    async () => {
      console.log('[Cron] Daily streak check started at', new Date().toISOString());

      try {
        // Get all users with gamification records
        const allUsers = await db
          .select({
            userId: gamificationTable.userId,
            timezoneOffset: gamificationTable.timezoneOffset,
            streak: gamificationTable.streak,
            streakFreezes: gamificationTable.streakFreezes,
          })
          .from(gamificationTable);

        console.log(`[Cron] Checking streaks for ${allUsers.length} users`);

        let streaksReset = 0;
        let freezesUsed = 0;
        let streaksPreserved = 0;

        for (const { userId, timezoneOffset, streak, streakFreezes } of allUsers) {
          try {
            // CRITICAL: Skip users without stored timezone - they'll be checked on next login
            // DO NOT default to UTC (0) as this causes incorrect streak resets for non-UTC users
            if (!Number.isFinite(timezoneOffset)) {
              console.log(`[Streak] ⏭️ Skipping user ${userId}: no timezone stored (will check on next activity)`);
              continue;
            }

            const offsetMinutes = timezoneOffset;
            const yesterdayBase = addDaysUTC(new Date(), -1);
            const { start: yesterdayStart, end: yesterdayEnd } = getLocalDayRange(offsetMinutes, yesterdayBase);

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
              if (!streak || streak === 0) {
                // No active streak to maintain, skip
                continue;
              }

              if (streakFreezes > 0) {
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
                console.log(`[Streak] ❄️ User ${userId} used freeze (${streakFreezes - 1} remaining)`);
              } else {
                // Reset streak - store previous value for potential restoration
                await db
                  .update(gamificationTable)
                  .set({
                    previousStreak: streak, // Store the streak before reset
                    streakResetAt: new Date(), // Track when it was reset
                    streak: 0,
                    lastStreakUpdatedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(gamificationTable.userId, userId));

                streaksReset++;
                console.log(`[Streak] 🔄 User ${userId} streak reset (was ${streak} days, saved for restore)`);
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
