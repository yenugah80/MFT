/**
 * Reproduces nutrition.js's dashboard streak recalculation exactly, against
 * real data, to find why it computed currentStreak=0 for a user whose
 * gamification.streak was 37 — and whose fire-and-forget "sync" in that
 * route just overwrote the real value with 0 in production.
 */
import { db } from './src/db/index.js';
import { foodLogTable, waterLogTable, moodLogTable, gamificationTable } from './src/db/schema.js';
import { eq, gte } from 'drizzle-orm';
import { getLocalDateUTC, addDaysUTC } from './src/utils/timezone.js';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';
const offsetMinutes = 0;

async function main() {
  const today = getLocalDateUTC(offsetMinutes);
  const streakWindowStart = addDaysUTC(today, -365);

  const [streakFoodLogs, streakWaterLogs, streakMoodLogs, gamification] = await Promise.all([
    db.select({ loggedDate: foodLogTable.loggedDate })
      .from(foodLogTable)
      .where(eq(foodLogTable.userId, userId)),
    db.select({ loggedDate: waterLogTable.loggedDate })
      .from(waterLogTable)
      .where(eq(waterLogTable.userId, userId)),
    db.select({ loggedDate: moodLogTable.loggedDate, timezoneOffset: moodLogTable.timezoneOffset })
      .from(moodLogTable)
      .where(eq(moodLogTable.userId, userId)),
    db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).limit(1),
  ]);

  console.log('today (getLocalDateUTC):', today.toISOString());
  console.log('streakWindowStart:', streakWindowStart.toISOString());
  console.log('gte filter would be applied at:', streakWindowStart.toISOString(), '(fetched WITHOUT that filter here to see full history)');
  console.log('raw counts (all-time, no window filter): food=', streakFoodLogs.length, 'water=', streakWaterLogs.length, 'mood=', streakMoodLogs.length);

  const withinWindowFood = streakFoodLogs.filter(l => new Date(l.loggedDate) >= streakWindowStart);
  const withinWindowWater = streakWaterLogs.filter(l => new Date(l.loggedDate) >= streakWindowStart);
  const withinWindowMood = streakMoodLogs.filter(l => new Date(l.loggedDate) >= streakWindowStart);
  console.log('within 365-day window: food=', withinWindowFood.length, 'water=', withinWindowWater.length, 'mood=', withinWindowMood.length);

  const activityDays = new Set();
  const dayLog = [];
  const addActivityDay = (loggedDate, tzOffset, source) => {
    if (!loggedDate) return;
    const offset = Number.isFinite(tzOffset) ? tzOffset : offsetMinutes;
    const day = getLocalDateUTC(offset, new Date(loggedDate));
    activityDays.add(day.getTime());
    dayLog.push({ source, loggedDate, day: day.toISOString() });
  };

  withinWindowFood.forEach(log => addActivityDay(log.loggedDate, offsetMinutes, 'food'));
  withinWindowWater.forEach(log => addActivityDay(log.loggedDate, offsetMinutes, 'water'));
  withinWindowMood.forEach(log => addActivityDay(log.loggedDate, log.timezoneOffset, 'mood'));

  console.log('\ndistinct activityDays computed:', activityDays.size);
  const sortedDays = Array.from(activityDays).sort((a, b) => b - a).slice(0, 15).map(t => new Date(t).toISOString().slice(0, 10));
  console.log('most recent 15 activityDays:', sortedDays.join(', '));

  let currentStreak = 0;
  const hasTodayActivity = activityDays.has(today.getTime());
  console.log('\ntoday.getTime():', today.getTime(), '| hasTodayActivity:', hasTodayActivity);
  let checkDate = hasTodayActivity ? new Date(today) : addDaysUTC(today, -1);
  console.log('checkDate starts at:', checkDate.toISOString());

  for (let i = 0; i < 365; i++) {
    if (activityDays.has(checkDate.getTime())) {
      currentStreak++;
      checkDate = addDaysUTC(checkDate, -1);
    } else {
      console.log(`loop broke at i=${i}, checkDate=${checkDate.toISOString()} not in activityDays`);
      break;
    }
  }

  console.log('\nRECOMPUTED currentStreak:', currentStreak);
  console.log('gamification.streak (DB, already overwritten to 0 by the bug):', gamification[0]?.streak);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
