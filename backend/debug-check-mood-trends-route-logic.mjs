/**
 * Replicates /mood/trends route's exact date-boundary + aggregation logic
 * (see src/routes/mood.js ~line 375) across a range of plausible client
 * timezone offsets, to check whether the empty "No mood data yet" result
 * the user saw is a real timezone-boundary bug or something else
 * (client-side caching, etc.).
 */
import { db } from './src/db/index.js';
import { moodLogTable } from './src/db/schema.js';
import { eq, and, gte } from 'drizzle-orm';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';
const VALID_PERIODS = { day: 1, week: 7, month: 30 };

async function computeForOffset(period, offsetMinutes) {
  const days = VALID_PERIODS[period] || 7;
  const nowLocal = new Date(Date.now() - offsetMinutes * 60 * 1000);
  nowLocal.setUTCDate(nowLocal.getUTCDate() - days);
  nowLocal.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(nowLocal.getTime() + offsetMinutes * 60 * 1000);

  const moods = await db
    .select()
    .from(moodLogTable)
    .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, startDate)))
    .orderBy(moodLogTable.loggedDate);

  return { startDate, count: moods.length };
}

async function main() {
  const offsetsToTest = [0, 60, 120, 180, 240, 300, 330, 360, 420, 480, 540, 600, -60, -120, -300, -480, -540];

  console.log('period=week across a range of client timezone offsets:\n');
  for (const offset of offsetsToTest) {
    const { startDate, count } = await computeForOffset('week', offset);
    const flag = count === 0 ? '  <-- EMPTY' : '';
    console.log(`  offsetMinutes=${String(offset).padStart(4)}  startDate=${startDate.toISOString()}  rows=${count}${flag}`);
  }

  console.log('\nperiod=day across the same range:\n');
  for (const offset of offsetsToTest) {
    const { startDate, count } = await computeForOffset('day', offset);
    const flag = count === 0 ? '  <-- EMPTY' : '';
    console.log(`  offsetMinutes=${String(offset).padStart(4)}  startDate=${startDate.toISOString()}  rows=${count}${flag}`);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
