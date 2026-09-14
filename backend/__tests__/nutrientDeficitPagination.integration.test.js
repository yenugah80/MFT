/**
 * Real-Postgres integration coverage for the 500-row cap fix in
 * nutrientDeficitJob.js. The bug: a single unbounded SELECT capped at 500
 * rows silently and permanently excluded any eligible user past that row
 * once the table grew beyond it — the local-hour gate filters AFTER the
 * fetch, so a user never reached by the capped SELECT could never be
 * evaluated for ANY hour, ever. This test inserts more than PAGE_SIZE
 * (500) eligible rows and proves getUsersWithPushTokensPage's cursor
 * pagination reaches every one of them, not just the first 500.
 *
 * Connects to real local Postgres directly, same as
 * notificationAccountEffectiveCap.integration.test.js — see that file's
 * header for why and the connection requirement.
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { like } from 'drizzle-orm';
import { profilesTable, accountSettingsTable } from '../src/db/schema.js';
import { getUsersWithPushTokensPage, PAGE_SIZE } from '../src/jobs/nutrientDeficitJob.js';

const PREFIX = 'itest_pagination_';
const TOTAL_USERS = PAGE_SIZE + 7; // deliberately past the old flat cap

let client;
let db;

beforeAll(async () => {
  client = postgres('postgres://harikay@localhost:5432/mft_dev');
  db = drizzle(client);

  const profileRows = [];
  const settingsRows = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    const userId = `${PREFIX}${String(i).padStart(4, '0')}`;
    profileRows.push({ userId, fullName: `Pagination Test ${i}` });
    settingsRows.push({ userId, expoPushToken: `ExponentPushToken[test-${i}]`, notifications: {} });
  }

  // Batched inserts — one round trip each, not TOTAL_USERS round trips.
  await db.insert(profilesTable).values(profileRows).onConflictDoNothing();
  await db.insert(accountSettingsTable).values(settingsRows).onConflictDoNothing();
}, 30000);

afterAll(async () => {
  await db.delete(accountSettingsTable).where(like(accountSettingsTable.userId, `${PREFIX}%`));
  await db.delete(profilesTable).where(like(profilesTable.userId, `${PREFIX}%`));
  await client.end();
}, 30000);

describe('getUsersWithPushTokensPage — pagination beyond PAGE_SIZE', () => {
  test(`reaches all ${TOTAL_USERS} eligible users across multiple pages, not just the first ${PAGE_SIZE}`, async () => {
    const seen = new Set();
    let cursor = null;
    let pages = 0;

    for (;;) {
      const page = await getUsersWithPushTokensPage(cursor, db);
      if (page.length === 0) break;
      pages++;
      for (const row of page) {
        if (row.userId.startsWith(PREFIX)) seen.add(row.userId);
      }
      cursor = page[page.length - 1].id;
      if (page.length < PAGE_SIZE) break; // last page
    }

    expect(pages).toBeGreaterThanOrEqual(2); // proves this genuinely spans multiple pages
    expect(seen.size).toBe(TOTAL_USERS);

    // The specific row that the OLD flat-500 cap could never reach.
    const lastUserId = `${PREFIX}${String(TOTAL_USERS - 1).padStart(4, '0')}`;
    expect(seen.has(lastUserId)).toBe(true);
  }, 30000);

  test('cursor pagination never returns the same user twice across pages', async () => {
    const firstPage = await getUsersWithPushTokensPage(null, db);
    const testUsersInFirstPage = firstPage.filter((r) => r.userId.startsWith(PREFIX));
    if (testUsersInFirstPage.length === 0) return; // nothing to check if none of our rows landed first

    const cursor = firstPage[firstPage.length - 1].id;
    const secondPage = await getUsersWithPushTokensPage(cursor, db);

    const firstIds = new Set(firstPage.map((r) => r.id));
    for (const row of secondPage) {
      expect(firstIds.has(row.id)).toBe(false);
    }
  });

  test('a cursor past every row returns an empty page (clean termination)', async () => {
    // profiles.id is a Postgres integer (serial) column — max value 2^31-1;
    // Number.MAX_SAFE_INTEGER overflows it at the driver level.
    const page = await getUsersWithPushTokensPage(2147483647, db);
    expect(page).toEqual([]);
  });
});
