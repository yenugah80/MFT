import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

const VALID = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];

const result = await db.execute(sql`
  SELECT user_id, mood, COUNT(*) as cnt
  FROM mood_log
  WHERE mood NOT IN (${sql.join(VALID.map(v => sql`${v}`), sql`, `)})
  GROUP BY user_id, mood
  ORDER BY user_id, cnt DESC
`);

console.log('Contaminated rows (any user, any invalid mood value):');
console.log(JSON.stringify(result.rows || result, null, 2));
process.exit(0);
