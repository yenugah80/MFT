#!/usr/bin/env node
/**
 * Schema drift check: does src/db/schema.js actually describe the database?
 *
 * Every incident in the 2026-08-08/09 session had the same shape — a column
 * declared NOT NULL / with a default / with a unique constraint in schema.js
 * that the live database did not actually have, or vice versa:
 *
 *   - food_log/water_log/mood_log/weight_history/activity_log.client_event_id
 *     was declared `.notNull().default(gen_random_uuid())` but had neither in
 *     the database. NULLs never collide in a UNIQUE constraint, so duplicate
 *     detection was silently inert on any row inserted without a key.
 *   - activity_log's declared UNIQUE constraint on (user_id, client_event_id)
 *     had never been created.
 *   - The fix for the above then went too far in the other direction: adding
 *     NOT NULL to activity_log.client_event_id broke the one route that
 *     legitimately inserts NULL there, which this script would have caught
 *     immediately (declared NOT NULL, route's own contract allows NULL) rather
 *     than as a production 500 discovered by chance.
 *
 * None of these threw at declaration time. Drizzle does not push schema.js to
 * Postgres — a hand-written SQL migration does, in this repo's
 * src/db/migrations/*.sql — so the two are only ever as consistent as whoever
 * wrote the last migration remembered to be.
 *
 * This script does not decide which side is right. A mismatch can mean the
 * migration was never written, or that schema.js is stricter than the
 * application actually guarantees (see activity_log above). Either way it
 * needs a human looking at it before it ships, not a silent runtime surprise.
 *
 * Scope, deliberately: NOT NULL, column defaults (presence, not exact SQL
 * text — `gen_random_uuid()` vs `(gen_random_uuid())::text` are the same
 * default with cosmetic differences), and UNIQUE/CHECK constraint names.
 * Column types and foreign keys are not compared — the checks above are
 * exactly the ones that broke silently; a wrong type or FK typically fails
 * loudly (and immediately) the first time it's used, so they don't share the
 * failure mode this exists to catch.
 *
 * BASELINE. The first real run against production (2026-08-09) found 108
 * pre-existing mismatches — some cosmetic (a constraint that exists under a
 * different name than schema.js declares), some substantial (ab_test_*, and
 * drift_metrics have a handful of basic columns in production against a full
 * multi-column feature declared in schema.js — that gap predates this script
 * and needs its own investigation, not a migration written blind). Gating CI
 * on all of that from day one would mean every future PR starts red, which is
 * exactly how ci.yml's own "Lint & Test" step ended up never linting anything
 * — a permanently-failing or silently-noop check gets ignored or deleted, not
 * fixed. So this diffs against src/db/schemaDriftBaseline.json and fails only
 * on drift that is NEW since the baseline was captured. Existing entries still
 * print, as a visible backlog, but don't block.
 *
 * To accept a newly-introduced difference (a migration you intentionally
 * wrote, or a schema.js correction you intentionally made): regenerate the
 * baseline with --update-baseline and commit the result. Do not do this to
 * silence a finding you have not actually looked at — that defeats the point.
 *
 * Usage:
 *   node scripts/checkSchemaDrift.mjs                  # exits 1 on NEW drift only
 *   node scripts/checkSchemaDrift.mjs --json            # machine-readable, full findings
 *   node scripts/checkSchemaDrift.mjs --update-baseline # accept current state as baseline
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { db } from '../src/config/db.js';
import * as schema from '../src/db/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, '..', 'src', 'db', 'schemaDriftBaseline.json');

const asJson = process.argv.includes('--json');
const updateBaseline = process.argv.includes('--update-baseline');

function findingKey(f) {
  return `${f.table}|${f.kind}|${f.column ?? f.constraint ?? ''}`;
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return new Set();
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  return new Set(parsed.map(findingKey));
}

async function fetchDbColumns(tableName) {
  const result = await db.execute(sql`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `);
  const rows = result.rows ?? result;
  const byName = new Map();
  for (const row of rows) {
    byName.set(row.column_name, {
      nullable: row.is_nullable === 'YES',
      hasDefault: row.column_default !== null,
    });
  }
  return byName;
}

async function fetchDbConstraints(tableName) {
  const result = await db.execute(sql`
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = ${tableName}::regclass
  `);
  const rows = result.rows ?? result;
  return new Set(rows.map((r) => r.conname));
}

/**
 * A UNIQUE INDEX enforces exactly the same guarantee as a UNIQUE CONSTRAINT —
 * same underlying btree, and Postgres resolves `ON CONFLICT` against either
 * one identically. schema.js's `unique(...)` helper produces a constraint, but
 * some of this database's uniqueness was created as a bare index instead
 * (predating this script, presumably via `CREATE UNIQUE INDEX` directly or an
 * older Drizzle helper). That's a naming-convention difference, not a missing
 * guarantee, and treating it as drift produced false positives that a real
 * migration then collided with (ADD CONSTRAINT tried to create an index under
 * a name a plain index already held). Checked separately from
 * fetchDbConstraints because pg_indexes has no equivalent of pg_constraint's
 * `::regclass` all-constraints-at-once query shape.
 */
async function fetchDbUniqueIndexes(tableName) {
  const result = await db.execute(sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = ${tableName} AND indexdef LIKE 'CREATE UNIQUE INDEX%'
  `);
  const rows = result.rows ?? result;
  return new Set(rows.map((r) => r.indexname));
}

async function checkTable(tableObj) {
  const cfg = getTableConfig(tableObj);
  const findings = [];

  // information_schema.columns never throws — a nonexistent table just returns
  // zero rows. Check that first and bail out cleanly, before pg_constraint's
  // `::regclass` cast (which does throw on a missing table, with a verbose
  // "Failed query: ..." dump that isn't worth showing when the plain answer is
  // just "this table doesn't exist").
  const dbColumns = await fetchDbColumns(cfg.name);
  if (dbColumns.size === 0) {
    findings.push({ table: cfg.name, kind: 'table-missing', detail: 'table does not exist in the database' });
    return findings;
  }
  const dbConstraints = await fetchDbConstraints(cfg.name);
  const dbUniqueIndexes = await fetchDbUniqueIndexes(cfg.name);

  for (const col of cfg.columns) {
    const live = dbColumns.get(col.name);
    if (!live) {
      findings.push({ table: cfg.name, kind: 'column-missing', column: col.name });
      continue;
    }

    const declaredNotNull = col.notNull === true;
    if (declaredNotNull === live.nullable) {
      findings.push({
        table: cfg.name,
        kind: 'nullability-mismatch',
        column: col.name,
        detail: `schema.js says ${declaredNotNull ? 'NOT NULL' : 'nullable'}, database says ${live.nullable ? 'nullable' : 'NOT NULL'}`,
      });
    }

    const declaredHasDefault = col.hasDefault === true;
    if (declaredHasDefault !== live.hasDefault) {
      findings.push({
        table: cfg.name,
        kind: 'default-mismatch',
        column: col.name,
        detail: `schema.js says ${declaredHasDefault ? 'has a default' : 'no default'}, database says ${live.hasDefault ? 'has a default' : 'no default'}`,
      });
    }
  }

  for (const unique of cfg.uniqueConstraints ?? []) {
    if (!dbConstraints.has(unique.name) && !dbUniqueIndexes.has(unique.name)) {
      findings.push({ table: cfg.name, kind: 'unique-constraint-missing', constraint: unique.name });
    }
  }

  for (const check of cfg.checks ?? []) {
    if (!dbConstraints.has(check.name)) {
      findings.push({ table: cfg.name, kind: 'check-constraint-missing', constraint: check.name });
    }
  }

  return findings;
}

async function main() {
  const tableExports = Object.entries(schema).filter(([name]) => name.endsWith('Table'));
  const allFindings = [];

  for (const [, tableObj] of tableExports) {
    const findings = await checkTable(tableObj);
    allFindings.push(...findings);
  }

  if (updateBaseline) {
    writeFileSync(BASELINE_PATH, JSON.stringify(allFindings, null, 2) + '\n');
    console.log(`[SchemaDrift] Baseline updated: ${allFindings.length} finding(s) accepted as current state.`);
    process.exit(0);
  }

  if (asJson) {
    console.log(JSON.stringify(allFindings, null, 2));
    process.exit(allFindings.length > 0 ? 1 : 0);
  }

  const baseline = loadBaseline();
  const known = allFindings.filter((f) => baseline.has(findingKey(f)));
  const fresh = allFindings.filter((f) => !baseline.has(findingKey(f)));
  const resolved = allFindings.length < baseline.size
    ? [...baseline].filter((k) => !allFindings.some((f) => findingKey(f) === k))
    : [];

  const printFinding = (f) => {
    const where = f.column ? `${f.table}.${f.column}` : f.constraint ? `${f.table} (${f.constraint})` : f.table;
    console.log(`  [${f.kind}] ${where}${f.detail ? ` — ${f.detail}` : ''}`);
  };

  if (fresh.length === 0 && known.length === 0) {
    console.log(`[SchemaDrift] OK — ${tableExports.length} tables match schema.js`);
  } else {
    if (known.length > 0) {
      console.log(`[SchemaDrift] ${known.length} known finding(s) from the baseline (not blocking):`);
      known.forEach(printFinding);
    }
    if (resolved.length > 0) {
      console.log(`\n[SchemaDrift] ${resolved.length} baseline finding(s) no longer present — consider running --update-baseline to shrink the accepted list.`);
    }
    if (fresh.length > 0) {
      console.error(`\n[SchemaDrift] ${fresh.length} NEW mismatch(es) not in the baseline:\n`);
      fresh.forEach(printFinding);
      console.error(
        '\nEach of these means schema.js and the live database now disagree in a way they did not\n' +
        'before. Reconcile by either writing a migration (src/db/migrations/NNNN_*.sql) so the\n' +
        'database matches schema.js, or correcting schema.js so it matches what the application\n' +
        'actually guarantees — check what the insert routes for the affected table actually do\n' +
        'before assuming schema.js is the side that\'s right. If this is intentional and already\n' +
        'reconciled, run --update-baseline to accept it.'
      );
    }
  }

  process.exit(fresh.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[SchemaDrift] Fatal error:', err);
  process.exit(1);
});
