// Backfill mood_log.day_key using timezone_offset when available.
// Usage: node backfill-mood-day-key.js [--force]

import { db } from "./src/config/db.js";
import { moodLogTable } from "./src/db/schema.js";
import { eq, sql } from "drizzle-orm";

const force = process.argv.includes("--force");
const BATCH_SIZE = 500;

const toDayKey = (date, offsetMinutes) => {
  const offset = Number.isFinite(offsetMinutes) ? offsetMinutes : date.getTimezoneOffset();
  const localMs = date.getTime() - offset * 60 * 1000;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const run = async () => {
  console.log(`[Backfill] mood_log.day_key ${force ? "force" : "missing-only"}...`);

  let offset = 0;
  let updated = 0;

  while (true) {
    const rows = await db
      .select({
        id: moodLogTable.id,
        loggedDate: moodLogTable.loggedDate,
        timezoneOffset: moodLogTable.timezoneOffset,
        dayKey: moodLogTable.dayKey,
      })
      .from(moodLogTable)
      .orderBy(moodLogTable.id)
      .limit(BATCH_SIZE)
      .offset(offset);

    if (!rows.length) break;

    for (const row of rows) {
      if (!force && row.dayKey) continue;
      if (!row.loggedDate) continue;

      const loggedAt = new Date(row.loggedDate);
      if (Number.isNaN(loggedAt.getTime())) continue;

      const dayKey = toDayKey(loggedAt, row.timezoneOffset);
      await db
        .update(moodLogTable)
        .set({ dayKey })
        .where(eq(moodLogTable.id, row.id));

      updated += 1;
    }

    offset += rows.length;
  }

  console.log(`[Backfill] Updated ${updated} rows.`);
};

run().catch((error) => {
  console.error("[Backfill] Failed:", error);
  process.exitCode = 1;
});
