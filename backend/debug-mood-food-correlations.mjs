import { db } from './src/db/index.js';
import { moodMealCorrelationsTable, moodLogTable, foodLogTable } from './src/db/schema.js';
import { eq, and, gte } from 'drizzle-orm';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

const stored = await db.select().from(moodMealCorrelationsTable).where(eq(moodMealCorrelationsTable.userId, userId));
console.log(`Stored mood_meal_correlations rows: ${stored.length}`);

const startDate = new Date();
startDate.setDate(startDate.getDate() - 21);

const moods = await db.select().from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, startDate)));
const foods = await db.select().from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, startDate)));

console.log(`\n21-day window: ${moods.length} moods, ${foods.length} foods`);

const localHour = (loggedDate, offsetMinutes = 0) => new Date(new Date(loggedDate).getTime() - offsetMinutes * 60 * 1000).getUTCHours();
const breakfastLogs = foods.filter(f => { const h = localHour(f.loggedDate); return h >= 5 && h < 10; });
const earlyBreakfastDays = breakfastLogs.filter(f => localHour(f.loggedDate) < 8);
console.log(`\nRule 1 (breakfast-timing): breakfastLogs=${breakfastLogs.length} (need >5), earlyRatio=${breakfastLogs.length ? (earlyBreakfastDays.length/breakfastLogs.length).toFixed(2) : 'n/a'} (need >0.5)`);

const highSugarMeals = foods.filter(f => (f.sugar || 0) > 20);
const lowEnergyMoods = moods.filter(m => (m.energyLevel || 5) < 5);
console.log(`Rule 2 (sugar-energy): highSugarMeals=${highSugarMeals.length} (need >3), lowEnergyMoods=${lowEnergyMoods.length} (need >3)`);

const avgProtein = foods.reduce((sum, f) => sum + (f.protein || 0), 0) / Math.max(foods.length, 1);
const avgMood = moods.reduce((sum, m) => sum + (m.intensity || 5), 0) / Math.max(moods.length, 1);
console.log(`Rule 3 (protein-mood): avgProtein=${avgProtein.toFixed(1)} (need >25), avgMood=${avgMood.toFixed(1)} (need >6.5)`);

// Sample a few food logs to see actual field values
console.log('\nSample food logs (first 3):');
foods.slice(0, 3).forEach(f => console.log(JSON.stringify({ loggedDate: f.loggedDate, protein: f.protein, sugar: f.sugar, calories: f.calories })));

process.exit(0);
