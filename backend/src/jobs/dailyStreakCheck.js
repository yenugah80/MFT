/**
 * Daily Streak Check Cron Job - Snapchat-Style
 *
 * TIMEZONE HANDLING:
 * - Cron runs at 00:05 UTC (a single trigger point)
 * - For EACH user, we use their stored timezoneOffset to calculate their local "yesterday"
 * - This means all users get checked based on THEIR local day, not UTC
 *
 * STREAK LOGIC:
 * - ANY log (food, water, mood, activity, sleep, stress) maintains the streak
 * - If no activity: consume streak freeze OR reset streak (store previous for restore)
 * - Users without timezone are given a grace period (checked on next activity)
 */

import cron from 'cron';
import { db } from '../config/db.js';
import {
  activityLogTable,
  foodLogTable,
  gamificationAuditLogTable,
  gamificationTable,
  moodLogTable,
  sleepLogTable,
  stressLogTable,
  waterLogTable,
} from '../db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { addDaysUTC, getLocalDateUTC, getLocalDayRange } from '../utils/timezone.js';

// Unified freeze award interval (consistent with gamificationService.js)
const FREEZE_AWARD_INTERVAL = 7;

/**
 * Initialize the daily streak check cron job
 * Runs at 00:05 UTC - uses each user's timezone to calculate their local day
 */
export function initStreakCronJob() {
  const job = new cron.CronJob(
    '5 0 * * *',
    async () => {
      console.log('[Cron] 🕐 Daily streak check started at', new Date().toISOString());

      try {
        const allUsers = await db
          .select({
            userId: gamificationTable.userId,
            timezoneOffset: gamificationTable.timezoneOffset,
            streak: gamificationTable.streak,
            streakFreezes: gamificationTable.streakFreezes,
            lastLogDate: gamificationTable.lastLogDate,
          })
          .from(gamificationTable);

        console.log(`[Cron] Checking streaks for ${allUsers.length} users`);

        let streaksReset = 0;
        let freezesUsed = 0;
        let streaksPreserved = 0;
        let skippedNoTimezone = 0;
        let skippedNoStreak = 0;

        for (const user of allUsers) {
          const { userId, timezoneOffset, streak, streakFreezes, lastLogDate } = user;

          try {
            // Skip users without stored timezone - they'll be checked on next login
            // This prevents incorrect resets for users who haven't set timezone yet
            if (!Number.isFinite(timezoneOffset)) {
              skippedNoTimezone++;
              continue;
            }

            // Skip users with no active streak
            if (!streak || streak === 0) {
              skippedNoStreak++;
              continue;
            }

            // Calculate user's local "yesterday"
            const offsetMinutes = timezoneOffset;
            const yesterdayBase = addDaysUTC(new Date(), -1);
            const { start: yesterdayStart, end: yesterdayEnd } = getLocalDayRange(offsetMinutes, yesterdayBase);
            const protectedLocalDay = getLocalDateUTC(offsetMinutes, yesterdayBase);

            // Check if user logged ANY activity yesterday (Snapchat-style: any log counts)
            // Includes all six streak-eligible logging domains.
            //
            // gte/lte, not raw sql`` — a JS Date interpolated into a raw
            // template bypasses Drizzle's column-type serialization and
            // throws when it reaches the driver unserialized (see
            // backend/CLAUDE.md's postgres-js note). This threw on every
            // user with an active streak, every night — caught by the
            // per-user try/catch below and silently skipped, meaning this
            // entire cron job has never actually reset a streak or
            // auto-consumed a freeze since this pattern was introduced.
            const activityCounts = await Promise.all([
              db.select({ count: sql`count(*)::int` })
                .from(foodLogTable)
                .where(and(
                  eq(foodLogTable.userId, userId),
                  gte(foodLogTable.loggedDate, yesterdayStart),
                  lte(foodLogTable.loggedDate, yesterdayEnd)
                )),
              db.select({ count: sql`count(*)::int` })
                .from(waterLogTable)
                .where(and(
                  eq(waterLogTable.userId, userId),
                  gte(waterLogTable.loggedDate, yesterdayStart),
                  lte(waterLogTable.loggedDate, yesterdayEnd)
                )),
              db.select({ count: sql`count(*)::int` })
                .from(moodLogTable)
                .where(and(
                  eq(moodLogTable.userId, userId),
                  gte(moodLogTable.loggedDate, yesterdayStart),
                  lte(moodLogTable.loggedDate, yesterdayEnd)
                )),
              db.select({ count: sql`count(*)::int` })
                .from(activityLogTable)
                .where(and(
                  eq(activityLogTable.userId, userId),
                  gte(activityLogTable.loggedAt, yesterdayStart),
                  lte(activityLogTable.loggedAt, yesterdayEnd)
                )),
              db.select({ count: sql`count(*)::int` })
                .from(sleepLogTable)
                .where(and(
                  eq(sleepLogTable.userId, userId),
                  gte(sleepLogTable.wakeTime, yesterdayStart),
                  lte(sleepLogTable.wakeTime, yesterdayEnd)
                )),
              db.select({ count: sql`count(*)::int` })
                .from(stressLogTable)
                .where(and(
                  eq(stressLogTable.userId, userId),
                  gte(stressLogTable.loggedAt, yesterdayStart),
                  lte(stressLogTable.loggedAt, yesterdayEnd)
                )),
            ]);

            const totalActivityCount = activityCounts.reduce(
              (total, result) => total + (result?.[0]?.count || 0),
              0
            );

            if (totalActivityCount === 0) {
              // User missed yesterday - handle streak
              if (streakFreezes > 0) {
                // Auto-consume freeze to save streak (Snapchat style)
                await db
                  .update(gamificationTable)
                  .set({
                    streakFreezes: sql`${gamificationTable.streakFreezes} - 1`,
                    streakSavedByFreeze: true,
                    // The protected day advances continuity without increasing
                    // the count. The next real log can therefore continue it.
                    lastLogDate: protectedLocalDay,
                    lastStreakUpdatedAt: protectedLocalDay,
                    updatedAt: new Date(),
                  })
                  .where(eq(gamificationTable.userId, userId));

                await db.insert(gamificationAuditLogTable).values({
                  userId,
                  source: 'daily_streak_freeze',
                  oldValues: {
                    streak,
                    streakFreezes,
                    lastLogDate,
                  },
                  newValues: {
                    streak,
                    streakFreezes: streakFreezes - 1,
                    lastLogDate: protectedLocalDay,
                    streakSavedByFreeze: true,
                  },
                  callSite: 'dailyStreakCheck',
                });

                freezesUsed++;
                console.log(`[Streak] ❄️ User ${userId}: Freeze auto-used (${streakFreezes - 1} remaining, streak ${streak} preserved)`);
              } else {
                // No freezes - reset streak but store for potential restore
                await db
                  .update(gamificationTable)
                  .set({
                    previousStreak: streak, // Store for restoration
                    streakResetAt: new Date(), // 24h restore window starts now
                    streak: 0,
                    streakSavedByFreeze: false,
                    lastStreakUpdatedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(gamificationTable.userId, userId));

                await db.insert(gamificationAuditLogTable).values({
                  userId,
                  source: 'daily_streak_reset',
                  oldValues: {
                    streak,
                    previousStreak: 0,
                    lastLogDate,
                  },
                  newValues: {
                    streak: 0,
                    previousStreak: streak,
                    streakSavedByFreeze: false,
                  },
                  callSite: 'dailyStreakCheck',
                });

                streaksReset++;
                console.log(`[Streak] 💔 User ${userId}: Streak reset (was ${streak} days, saved for 24h restore)`);
              }
            } else {
              // User had activity yesterday - streak is safe
              streaksPreserved++;

              // Clear any "saved by freeze" flag since they logged
              await db
                .update(gamificationTable)
                .set({ streakSavedByFreeze: false })
                .where(eq(gamificationTable.userId, userId));
            }
          } catch (userError) {
            console.error(`[Cron] Error checking streak for user ${userId}:`, userError);
          }
        }

        console.log('[Cron] ✅ Daily streak check complete:');
        console.log(`  🔥 Streaks preserved: ${streaksPreserved}`);
        console.log(`  ❄️ Freezes auto-used: ${freezesUsed}`);
        console.log(`  💔 Streaks reset: ${streaksReset}`);
        console.log(`  ⏭️ Skipped (no timezone): ${skippedNoTimezone}`);
        console.log(`  ⏭️ Skipped (no streak): ${skippedNoStreak}`);
        console.log(`  📊 Total users: ${allUsers.length}`);

      } catch (error) {
        console.error('[Cron] Fatal error in daily streak check:', error);
      }
    },
    null,
    true,
    'UTC'
  );

  console.log('[Cron] Daily streak check job scheduled (runs at 00:05 UTC)');
  return job;
}

/**
 * Award streak freezes based on streak milestones
 * Called after streak is incremented
 *
 * @param {string} userId - User ID
 * @param {number} streakDays - Current streak in days
 */
export async function awardStreakFreeze(userId, streakDays) {
  try {
    // Award 1 freeze every 7 days (consistent policy)
    if (streakDays > 0 && streakDays % FREEZE_AWARD_INTERVAL === 0) {
      const [gamification] = await db
        .select({
          streakFreezes: gamificationTable.streakFreezes,
          lastFreezeAwardedAt: gamificationTable.lastFreezeAwardedAt,
        })
        .from(gamificationTable)
        .where(eq(gamificationTable.userId, userId));

      if (!gamification) return null;

      // Prevent duplicate awards within 20 hours
      const lastAwarded = gamification.lastFreezeAwardedAt
        ? new Date(gamification.lastFreezeAwardedAt)
        : null;

      if (lastAwarded) {
        const hoursSince = (Date.now() - lastAwarded.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 20) {
          return null; // Already awarded recently
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

      const newCount = (gamification.streakFreezes || 0) + 1;
      console.log(`[Streak] ❄️ User ${userId} earned freeze at ${streakDays} days (now has ${newCount})`);

      return {
        awarded: true,
        newFreezeCount: newCount,
        milestone: streakDays,
      };
    }

    return null;
  } catch (error) {
    console.error('[Streak] Error awarding freeze:', error);
    return null;
  }
}

/**
 * Check if a user needs to see the "streak broken" popup
 * Call this when user opens the app
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Popup data if needed
 */
export async function checkStreakBrokenPopup(userId) {
  try {
    const [gamification] = await db
      .select({
        streak: gamificationTable.streak,
        previousStreak: gamificationTable.previousStreak,
        streakResetAt: gamificationTable.streakResetAt,
        streakFreezes: gamificationTable.streakFreezes,
        streakSavedByFreeze: gamificationTable.streakSavedByFreeze,
      })
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    if (!gamification) return null;

    const { streak, previousStreak, streakResetAt, streakFreezes, streakSavedByFreeze } = gamification;

    // Case 1: Streak was auto-saved by freeze overnight
    if (streakSavedByFreeze) {
      return {
        type: 'streak_saved',
        message: 'Your streak freeze kicked in! 🔥❄️',
        streak,
        freezesRemaining: streakFreezes,
      };
    }

    // Case 2: Streak was broken and can be restored
    if (previousStreak && previousStreak > 0 && streakResetAt) {
      const hoursSinceReset = (Date.now() - new Date(streakResetAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset <= 24 && streakFreezes > 0) {
        return {
          type: 'streak_broken_restorable',
          message: `Your ${previousStreak}-day streak was lost! 💔`,
          previousStreak,
          currentStreak: streak,
          freezesAvailable: streakFreezes,
          hoursRemaining: Math.floor(24 - hoursSinceReset),
          canRestore: true,
        };
      } else if (hoursSinceReset <= 24) {
        return {
          type: 'streak_broken_no_freeze',
          message: `Your ${previousStreak}-day streak was lost! 💔`,
          previousStreak,
          currentStreak: streak,
          freezesAvailable: 0,
          canRestore: false,
          hint: 'Earn freezes by maintaining 7-day streaks!',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Streak] Error checking broken popup:', error);
    return null;
  }
}

/**
 * Clear the "streak saved by freeze" flag after user acknowledges
 *
 * @param {string} userId - User ID
 */
export async function clearStreakSavedFlag(userId) {
  try {
    await db
      .update(gamificationTable)
      .set({ streakSavedByFreeze: false })
      .where(eq(gamificationTable.userId, userId));
  } catch (error) {
    console.error('[Streak] Error clearing saved flag:', error);
  }
}
