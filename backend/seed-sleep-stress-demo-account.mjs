/**
 * Seeds a few real sleep + stress log entries for the App Review demo
 * account, via the ACTUAL registered POST /sleep/log and POST /stress/log
 * route handlers (router.stack, bypassing HTTP/auth only — same pattern as
 * every other debug-*.mjs script tonight), so idempotency, streak, XP, and
 * pattern-cache invalidation all fire exactly as they would for a real
 * user-entered log. Not a raw INSERT — this IS the real logging path.
 *
 * Sleep needs >=3 nights (GET /sleep/trends), stress needs >=5 entries
 * (GET /stress/patterns) to unlock their respective analytics screens.
 * Seeds 5 nights of sleep and 6 stress entries, spread over the last week,
 * with varied-but-plausible values so it doesn't read as synthetic.
 */
import sleepRouter from './src/routes/sleep.js';
import stressRouter from './src/routes/stress.js';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

function getHandler(router, path, method) {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`Could not find ${method.toUpperCase()} ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function mockRes(label) {
  let body = null;
  let statusCode = 200;
  return {
    res: {
      json(b) { body = b; },
      status(code) { statusCode = code; return this; },
    },
    get: () => ({ body, statusCode }),
  };
}

function daysAgo(n, hour = 0, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function seedSleep() {
  const sleepLogHandler = getHandler(sleepRouter, '/log', 'post');
  // 5 nights, most recent = last night. Bed ~11pm-12:30am, wake ~7-7:30am,
  // quality varies 5-8 (realistic, not all-perfect).
  const nights = [
    { daysAgo: 5, bedHour: 23, bedMin: 15, wakeHour: 7, wakeMin: 0, quality: 7, tags: { screenTime: true } },
    { daysAgo: 4, bedHour: 23, bedMin: 45, wakeHour: 7, wakeMin: 15, quality: 6, tags: { caffeine: true, screenTime: true } },
    { daysAgo: 3, bedHour: 22, bedMin: 50, wakeHour: 6, wakeMin: 45, quality: 8, tags: { exercise: true } },
    { daysAgo: 2, bedHour: 0, bedMin: 10, wakeHour: 7, wakeMin: 30, quality: 5, tags: { stress: true, lateFood: true } },
    { daysAgo: 1, bedHour: 23, bedMin: 0, wakeHour: 7, wakeMin: 0, quality: 7, tags: {} },
  ];

  for (const n of nights) {
    const bedTime = n.bedHour < 6 ? daysAgo(n.daysAgo - 1, n.bedHour, n.bedMin) : daysAgo(n.daysAgo, n.bedHour, n.bedMin);
    const wakeTime = daysAgo(n.daysAgo - 1, n.wakeHour, n.wakeMin);
    const { res, get } = mockRes('sleep');
    await sleepLogHandler(
      {
        auth: () => ({ userId }),
        headers: { 'x-timezone-offset': '0' },
        body: {
          bedTime: bedTime.toISOString(),
          wakeTime: wakeTime.toISOString(),
          quality: n.quality,
          tags: n.tags,
          clientEventId: crypto.randomUUID(),
        },
      },
      res
    );
    const { body, statusCode } = get();
    if (statusCode && statusCode !== 200) throw new Error(`Sleep log failed (${statusCode}): ${JSON.stringify(body)}`);
    console.log(`[sleep] ${bedTime.toISOString()} -> ${wakeTime.toISOString()}, quality ${n.quality}: ${body?.message}`);
  }
}

async function seedStress() {
  const stressLogHandler = getHandler(stressRouter, '/log', 'post');
  const entries = [
    { daysAgo: 6, hour: 14, level: 4, triggers: ['work'], physicalSymptoms: { tension: true }, copingUsed: ['breathing'] },
    { daysAgo: 5, hour: 9, level: 6, triggers: ['work', 'finances'], physicalSymptoms: { headache: true }, copingUsed: ['exercise'] },
    { daysAgo: 4, hour: 20, level: 3, triggers: ['family'], physicalSymptoms: {}, copingUsed: ['music'] },
    { daysAgo: 3, hour: 16, level: 7, triggers: ['work'], physicalSymptoms: { tension: true, fatigue: true }, copingUsed: ['breathing', 'rest'] },
    { daysAgo: 2, hour: 11, level: 5, triggers: ['social'], physicalSymptoms: {}, copingUsed: ['social'] },
    { daysAgo: 1, hour: 18, level: 4, triggers: ['work'], physicalSymptoms: { fatigue: true }, copingUsed: ['meditation'] },
  ];

  for (const e of entries) {
    const loggedAt = daysAgo(e.daysAgo, e.hour, 0);
    const { res, get } = mockRes('stress');
    await stressLogHandler(
      {
        auth: () => ({ userId }),
        headers: { 'x-timezone-offset': '0' },
        body: {
          level: e.level,
          triggers: e.triggers,
          physicalSymptoms: e.physicalSymptoms,
          copingUsed: e.copingUsed,
          loggedAt: loggedAt.toISOString(),
          clientEventId: crypto.randomUUID(),
        },
      },
      res
    );
    const { body, statusCode } = get();
    if (statusCode && statusCode !== 200) throw new Error(`Stress log failed (${statusCode}): ${JSON.stringify(body)}`);
    console.log(`[stress] ${loggedAt.toISOString()}, level ${e.level}: ${body?.message}`);
  }
}

async function main() {
  console.log(`Seeding sleep + stress logs for ${userId} via the real route handlers...\n`);
  await seedSleep();
  console.log();
  await seedStress();
  console.log('\n✅ Seeded 5 sleep nights and 6 stress entries via the real logging path');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err);
  process.exit(1);
});
