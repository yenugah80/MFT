/**
 * Logs a few realistic "today" entries for the App Review demo account via
 * the ACTUAL registered route handlers (router.stack, bypassing HTTP/auth
 * only — same pattern as every other script tonight), so idempotency,
 * streak, XP, macro-consistency checking, and cache invalidation all fire
 * exactly as they would for a real user-entered log. The account had a
 * 36-day, 117-meal history but nothing logged in the last 2 days — this
 * gives it a normal "active today" appearance for anyone opening the app
 * right now.
 */
import nutritionRouter from './src/routes/nutrition.js';
import waterRouter from './src/routes/water.js';
import moodRouter from './src/routes/mood.js';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

function getHandler(router, path, method) {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`Could not find ${method.toUpperCase()} ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function mockRes() {
  let body = null;
  let statusCode = 200;
  return { res: { json(b) { body = b; }, status(c) { statusCode = c; return this; } }, get: () => ({ body, statusCode }) };
}

async function main() {
  const foodHandler = getHandler(nutritionRouter, '/log', 'post');
  const waterHandler = getHandler(waterRouter, '/log', 'post');
  const moodHandler = getHandler(moodRouter, '/log', 'post');

  const headers = { 'x-timezone-offset': '0' };
  const auth = () => ({ userId });

  // Breakfast, logged this morning.
  {
    const { res, get } = mockRes();
    await foodHandler(
      {
        auth,
        headers,
        body: {
          foodName: 'Greek Yogurt with Berries',
          calories: 220,
          protein: 18,
          carbs: 28,
          fats: 5,
          mealType: 'breakfast',
          servingSize: '1 bowl (250g)',
          clientEventId: crypto.randomUUID(),
          sourceMeta: { source: 'manual', inputMode: 'text' },
        },
      },
      res
    );
    const { body, statusCode } = get();
    if (statusCode && statusCode !== 200) throw new Error(`Food log failed (${statusCode}): ${JSON.stringify(body)}`);
    console.log('[food]', body?.message || 'logged');
  }

  // A glass of water.
  {
    const { res, get } = mockRes();
    await waterHandler(
      { auth, headers, body: { amountLiters: 0.5, clientEventId: crypto.randomUUID(), beverageType: 'water' } },
      res
    );
    const { body, statusCode } = get();
    if (statusCode && statusCode !== 200) throw new Error(`Water log failed (${statusCode}): ${JSON.stringify(body)}`);
    console.log('[water]', body?.message || 'logged');
  }

  // Morning mood check-in.
  {
    const { res, get } = mockRes();
    await moodHandler(
      { auth, headers, body: { mood: 'energized', intensity: 7, energyLevel: 8, clientEventId: crypto.randomUUID() } },
      res
    );
    const { body, statusCode } = get();
    if (statusCode && statusCode !== 200) throw new Error(`Mood log failed (${statusCode}): ${JSON.stringify(body)}`);
    console.log('[mood]', body?.message || 'logged');
  }

  console.log('\n✅ Logged breakfast, water, and mood for today via the real logging routes');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err);
  process.exit(1);
});
