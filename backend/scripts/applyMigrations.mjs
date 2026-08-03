#!/usr/bin/env node
/**
 * SQL migration runner.
 *
 * drizzle-kit's journal (src/db/migrations/meta/_journal.json) stops at 0012,
 * but the migrations directory runs to 0042 — everything from 0013 onward is
 * hand-written SQL that drizzle-kit cannot see. `drizzle-kit migrate` therefore
 * silently applies nothing new, which is a trap: it exits 0 and looks like it
 * worked.
 *
 * This applies the .sql files directly and records what it ran.
 *
 * FIRST RUN BASELINES. On a database that already has these migrations applied
 * (production does), running 0013-0040 again would be unsafe — the older files
 * predate the IF NOT EXISTS convention. So on the first run, every file at or
 * below BASELINE_THROUGH is recorded as applied WITHOUT executing it. Only
 * files after that point actually run.
 *
 *   node scripts/applyMigrations.mjs --dry-run   # show what would happen
 *   node scripts/applyMigrations.mjs             # apply
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/config/db.js';
import { sql } from 'drizzle-orm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'src', 'db', 'migrations');

/**
 * Everything up to and including this file is assumed already applied to any
 * existing database. Raise it only when you are certain the newer files have
 * been rolled out everywhere.
 */
const BASELINE_THROUGH = '0040';

const dryRun = process.argv.includes('--dry-run');

const log = (...args) => console.log('[migrate]', ...args);

async function ensureTrackingTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "_sql_migrations" (
      "filename" text PRIMARY KEY,
      "applied_at" timestamp DEFAULT now(),
      "baselined" boolean DEFAULT false
    );
  `);
}

async function appliedSet() {
  try {
    const rows = await db.execute(sql`SELECT filename FROM "_sql_migrations";`);
    const list = Array.isArray(rows) ? rows : rows?.rows || [];
    return new Set(list.map((row) => row.filename));
  } catch {
    // Table does not exist yet — nothing has been applied through this runner
    return new Set();
  }
}

async function main() {
  const entries = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (entries.length === 0) {
    log('no .sql migrations found');
    return;
  }

  // A dry run must not write anything, including the tracking table
  if (!dryRun) await ensureTrackingTable();
  const applied = await appliedSet();

  // Nothing recorded yet: treat this database as an existing one and baseline
  const isFirstRun = applied.size === 0;
  const pending = [];
  const baseline = [];

  for (const filename of entries) {
    if (applied.has(filename)) continue;
    const idx = filename.slice(0, 4);
    if (isFirstRun && idx <= BASELINE_THROUGH) baseline.push(filename);
    else pending.push(filename);
  }

  if (isFirstRun) {
    log(`first run — baselining ${baseline.length} file(s) through ${BASELINE_THROUGH} without executing them`);
  }
  log(`${pending.length} migration(s) to apply:`, pending.join(', ') || '(none)');

  if (dryRun) {
    log('dry run — nothing was written');
    return;
  }

  for (const filename of baseline) {
    await db.execute(
      sql`INSERT INTO "_sql_migrations" (filename, baselined) VALUES (${filename}, true) ON CONFLICT DO NOTHING;`
    );
  }

  for (const filename of pending) {
    const contents = await readFile(join(MIGRATIONS_DIR, filename), 'utf8');
    log(`applying ${filename}`);
    try {
      await db.execute(sql.raw(contents));
      await db.execute(
        sql`INSERT INTO "_sql_migrations" (filename) VALUES (${filename}) ON CONFLICT DO NOTHING;`
      );
      log(`  ✅ ${filename}`);
    } catch (error) {
      console.error(`  ❌ ${filename} failed:`, error.message);
      console.error('     Nothing after this point was applied.');
      process.exit(1);
    }
  }

  log('done');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[migrate] fatal:', error.message);
    process.exit(1);
  });
