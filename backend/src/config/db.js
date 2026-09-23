import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "./env.js";
import * as schema from "../db/schema.js";

// Postgres (Neon) session TimeZone is GMT, but postgres-js parses `timestamp
// without time zone` columns back into JS Date objects using the Node
// PROCESS's local timezone, not the DB's. Railway/most hosts don't set TZ,
// so Node falls back to the host's system zone (observed: America/New_York),
// silently shifting every timestamp column by the DST offset (+4h EDT) on
// every read — `date` columns are unaffected, this is timestamp-only. This
// broke streak-continuity math in gamificationRewardService.js (a same-day
// log read back 4h into the next UTC day looked like a 2-day gap and reset
// a 37-day streak to 1). Must be set before any query runs, so it lives here
// next to client creation rather than relying on an app-wide env var that's
// easy to forget on a new deploy target.
process.env.TZ = "UTC";

// TCP connection pool — correct for long-running Express on Railway.
// Neon HTTP driver was wrong here: no real transactions, new HTTP request per query.
//
// ssl defaults to "require" for Neon. DB_SSL=false is a local-only escape hatch
// for a Postgres instance with no SSL configured (e.g. Homebrew's default
// cluster) — unset in every deployed environment, so production is unaffected.
const sql = postgres(ENV.DATABASE_URL, {
  ssl: process.env.DB_SSL === "false" ? false : "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Neon pooler uses PgBouncer in transaction mode — prepared statements must be disabled.
  prepare: false,
});

export const db = drizzle(sql, { schema });

// db.execute(sql`...`) returns the row array DIRECTLY — e.g.
// `const rows = await db.execute(sql\`SELECT ...\`); rows[0].col`.
// It is NOT `{ rows: [...] }`. That shape belonged to the old neon-http
// driver, dropped 2026-06-22 (see the note above). Code written against
// neon-http and never updated will silently get `undefined` from
// `result.rows` instead of a real error — no crash, just wrong data — which
// is exactly what happened across ~15 files and 100+ call sites for about
// two months before anyone noticed (see git log for
// gamificationRewardService.js, mealPlan.js, achievementService.js,
// activityAnalyticsService.js, healthPlatformService.js,
// correlationEngineService.js, analyticsEventPipeline.js, metaLearner.js
// around 2026-08-15 for the fixes and how each was found).
//
// If you're writing a new raw db.execute(sql`...`) call: use the result
// directly as an array. If you're reviewing one that reads `.rows`, that's
// this bug — fix it and verify against a real query, not just a syntax
// check, since it fails silently.