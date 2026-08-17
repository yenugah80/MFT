/**
 * One-time cleanup: normalize every mood_log row across ALL users whose
 * `mood` value isn't one of the app's 8 canonical values. These rows could
 * only have been written by a seed/migration script bypassing POST
 * /mood/log's validation (that route rejects anything else with a 400) —
 * confirmed via debug-mood-contamination-scope.mjs, which found exactly
 * 17 rows across 2 accounts: 'content'/'energetic' on the App Review demo
 * account, 'excited' on one other test-looking account (no email/name).
 *
 * Mapping (closest semantic match to a canonical mood):
 *   content   -> calm       (contentment reads as calm satisfaction)
 *   energetic -> energized  (same concept, different wording)
 *   excited   -> energized  (high positive energy)
 *
 * Run against production: railway run node fix-mood-data-contamination.mjs
 */
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

const MAPPING = {
  content: 'calm',
  energetic: 'energized',
  excited: 'energized',
};

async function main() {
  for (const [from, to] of Object.entries(MAPPING)) {
    const result = await db.execute(sql`
      UPDATE mood_log SET mood = ${to}
      WHERE mood = ${from}
    `);
    console.log(`${from} -> ${to}: ${result.rowCount ?? result.count ?? 'updated'} rows`);
  }

  const VALID = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];
  const remaining = await db.execute(sql`
    SELECT user_id, mood, COUNT(*) as cnt FROM mood_log
    WHERE mood NOT IN (${sql.join(VALID.map(v => sql`${v}`), sql`, `)})
    GROUP BY user_id, mood
  `);
  const remainingRows = remaining.rows || remaining;
  console.log(`\nRemaining contaminated rows: ${remainingRows.length}`);
  if (remainingRows.length) console.log(JSON.stringify(remainingRows, null, 2));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
