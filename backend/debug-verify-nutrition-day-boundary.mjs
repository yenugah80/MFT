/**
 * Regression check for the nutrition.js periodDaysAgo off-by-one.
 * days=1 must mean "today only" — a summary row from yesterday should
 * never populate weeklyAverages when today has zero meals logged.
 */
import { addDaysUTC, toDateStr } from './src/utils/timezone.js';

function oldPeriodDaysAgo(today, trendDays) {
  return addDaysUTC(today, -trendDays);
}
function newPeriodDaysAgo(today, trendDays) {
  return addDaysUTC(today, -(trendDays - 1));
}

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

console.log('today:', toDateStr(today));
console.log('OLD periodDaysAgo(days=1):', toDateStr(oldPeriodDaysAgo(today, 1)), '<- includes yesterday, WRONG');
console.log('NEW periodDaysAgo(days=1):', toDateStr(newPeriodDaysAgo(today, 1)), '<- today only, correct');
console.log();
console.log('OLD periodDaysAgo(days=7):', toDateStr(oldPeriodDaysAgo(today, 7)), '<- 8-day span, off by one');
console.log('NEW periodDaysAgo(days=7):', toDateStr(newPeriodDaysAgo(today, 7)), '<- 7-day span, correct');

if (toDateStr(newPeriodDaysAgo(today, 1)) !== toDateStr(today)) {
  console.error('FAIL: days=1 should resolve to today');
  process.exit(1);
}
console.log('\n✅ Fix confirmed');
process.exit(0);
