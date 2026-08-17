/**
 * Read-only diagnostic: find the demo/test account (highest mood_log count)
 * and print its raw mood_log rows for the last 30 days, to compare what's
 * actually stored for the most-recent 7 days vs the rest of the month —
 * investigating why Mood/Week shows "Top Mood: N/A" while Mood/Month works.
 *
 * Run against production via: railway run node debug-mood-week-vs-month.mjs
 */
import { db } from './src/db/index.js';
import { moodLogTable } from './src/db/schema.js';
import { sql, eq, gte, desc } from 'drizzle-orm';

async function main() {
  const topUser = await db.execute(sql`
    SELECT user_id, COUNT(*) as cnt FROM mood_log GROUP BY user_id ORDER BY cnt DESC LIMIT 3
  `);
  console.log('Top mood_log users:', topUser.rows || topUser);

  const userId = (topUser.rows || topUser)[0].user_id;
  console.log(`\nUsing user: ${userId}\n`);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(moodLogTable)
    .where(eq(moodLogTable.userId, userId))
    .orderBy(desc(moodLogTable.loggedDate))
    .limit(35);

  console.log(`Found ${rows.length} rows (most recent first):\n`);
  rows.forEach((r) => {
    console.log(JSON.stringify({
      loggedDate: r.loggedDate,
      mood: r.mood,
      intensity: r.intensity,
      dayKey: r.dayKey,
      timezoneOffset: r.timezoneOffset,
    }));
  });
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
