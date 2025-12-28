// Backfill gamification for users with historical food logs.
// Usage: node backfill-gamification.js [--force]

import { db } from "./src/config/db.js";
import { foodLogTable, gamificationTable } from "./src/db/schema.js";
import { eq, asc, isNull } from "drizzle-orm";
import { calculateLevel } from "./src/utils/levelCalculator.js";
import { normalizeDateUTC, addDaysUTC } from "./src/utils/timezone.js";

const force = process.argv.includes("--force");

const dayKeyFromDate = (date) => {
  const normalized = normalizeDateUTC(date);
  return normalized.toISOString().slice(0, 10);
};

const computeXPForDay = (mealCount) => {
  if (mealCount <= 0) return 0;
  const firstMeals = Math.min(3, mealCount);
  const extraMeals = Math.max(0, mealCount - 3);
  return (firstMeals * 10) + (extraMeals * 5);
};

const fetchCandidateUsers = async () => {
  if (force) {
    return await db
      .select({ userId: foodLogTable.userId })
      .from(foodLogTable)
      .groupBy(foodLogTable.userId);
  }

  return await db
    .select({ userId: foodLogTable.userId })
    .from(foodLogTable)
    .leftJoin(gamificationTable, eq(foodLogTable.userId, gamificationTable.userId))
    .where(isNull(gamificationTable.userId))
    .groupBy(foodLogTable.userId);
};

const backfillUser = async (userId) => {
  const logs = await db
    .select({
      loggedDate: foodLogTable.loggedDate,
      clientEventId: foodLogTable.clientEventId,
    })
    .from(foodLogTable)
    .where(eq(foodLogTable.userId, userId))
    .orderBy(asc(foodLogTable.loggedDate));

  if (!logs.length) {
    return { skipped: true, reason: "no logs" };
  }

  const seenClientEvents = new Set();
  const dedupedLogs = [];

  for (const log of logs) {
    if (log.clientEventId) {
      if (seenClientEvents.has(log.clientEventId)) continue;
      seenClientEvents.add(log.clientEventId);
    }
    if (!log.loggedDate) continue;
    dedupedLogs.push(log);
  }

  if (!dedupedLogs.length) {
    return { skipped: true, reason: "no valid logs" };
  }

  const dailyCounts = new Map();
  for (const log of dedupedLogs) {
    const key = dayKeyFromDate(new Date(log.loggedDate));
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
  }

  let totalXP = 0;
  for (const count of dailyCounts.values()) {
    totalXP += computeXPForDay(count);
  }

  const totalMealsLogged = dedupedLogs.length;
  const lastLogDateRaw = dedupedLogs[dedupedLogs.length - 1].loggedDate;
  const lastLogDate = normalizeDateUTC(new Date(lastLogDateRaw));

  const dayKeys = new Set(dailyCounts.keys());
  let streak = 0;
  let cursor = new Date(lastLogDate);

  while (dayKeys.has(dayKeyFromDate(cursor))) {
    streak += 1;
    cursor = addDaysUTC(cursor, -1);
  }

  const levelInfo = calculateLevel(totalXP);

  const [existing] = await db
    .select()
    .from(gamificationTable)
    .where(eq(gamificationTable.userId, userId));

  const updateValues = {
    userId,
    xp: totalXP,
    level: levelInfo.level,
    streak,
    streakFreezes: existing?.streakFreezes ?? 0,
    lastFreezeAwardedAt: existing?.lastFreezeAwardedAt ?? null,
    totalMealsLogged,
    lastLogDate,
    lastStreakUpdatedAt: lastLogDate,
    lastXpAwardedAt: lastLogDate,
    badges: Array.isArray(existing?.badges) ? existing.badges : [],
    updatedAt: new Date(),
  };

  await db
    .insert(gamificationTable)
    .values(updateValues)
    .onConflictDoUpdate({
      target: gamificationTable.userId,
      set: updateValues,
    });

  return { updated: true, streak, totalXP, totalMealsLogged };
};

const run = async () => {
  console.log(`[Backfill] Starting gamification backfill${force ? " (force)" : ""}...`);

  const users = await fetchCandidateUsers();

  if (!users.length) {
    console.log("[Backfill] No users require backfill.");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const { userId } of users) {
    try {
      const result = await backfillUser(userId);
      if (result.updated) {
        updated += 1;
        console.log(`[Backfill] ✅ ${userId}: XP ${result.totalXP}, streak ${result.streak}, meals ${result.totalMealsLogged}`);
      } else {
        skipped += 1;
        console.log(`[Backfill] ↪️ ${userId}: ${result.reason}`);
      }
    } catch (error) {
      console.error(`[Backfill] ❌ ${userId}:`, error.message);
    }
  }

  console.log(`[Backfill] Done. Updated: ${updated}, Skipped: ${skipped}`);
};

run().catch((error) => {
  console.error("[Backfill] Fatal error:", error);
  process.exitCode = 1;
});
