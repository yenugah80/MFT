import { db } from './src/db/index.js';
import { moodLogTable } from './src/db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

console.log('now (UTC):', now.toISOString());
console.log('7 days ago (UTC):', sevenDaysAgo.toISOString());

const rows = await db
  .select()
  .from(moodLogTable)
  .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, sevenDaysAgo)))
  .orderBy(desc(moodLogTable.loggedDate));

console.log(`\nFound ${rows.length} mood_log rows in the last 7 days:`);
rows.forEach((r) => console.log(`  ${r.loggedDate.toISOString()} mood=${r.mood} intensity=${r.intensity}`));

process.exit(0);
