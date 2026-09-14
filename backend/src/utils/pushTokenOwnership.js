/**
 * Atomic, single-owner-per-token registration model.
 *
 * Dependency-injected on `db` for the same reason as deliveryAck.js/
 * deviceRegistry.js: profileController.js transitively imports server.js,
 * which calls app.listen() unconditionally at module scope, so anything
 * meant to be unit-testable needs to avoid that import chain entirely.
 *
 * Why this exists, on top of accountSettingsTable.fcmToken/expoPushToken
 * and devicesTable's per-device columns: those are per-account bookkeeping
 * — "this account believes it has this token" — written independently by
 * whichever account registers. Two accounts can each hold a copy of the
 * same physical device's token in their own row simultaneously (exactly
 * the live incident this whole feature traces back to: two accounts both
 * still had the same Expo token, both sent their own reminders to one
 * phone). A read-then-compare-then-write guard on top of those columns
 * (the original fix) closes most races but can't structurally prevent it —
 * two rows can always both exist.
 *
 * push_token_ownership has a UNIQUE constraint on token itself, so there
 * can never be more than one row for a given token — "two accounts both
 * own this token" is not a state the schema allows, not just a state the
 * application tries to avoid.
 */
import { sql } from 'drizzle-orm';

/**
 * Atomically claims a push token for one account.
 *
 * A single INSERT ... ON CONFLICT (token) DO UPDATE ... WHERE ...
 * statement — Postgres takes a row-level lock on the conflicting token
 * value for the duration of the statement, so two concurrent claims for
 * the same token are genuinely serialized by the database, not raced
 * through a separate read-then-write round trip.
 *
 * Conflict resolution, in order:
 *   1. issuedAtSeconds (the claiming request's Clerk JWT `iat`) — fixed at
 *      the moment that specific credential was minted, not at whenever the
 *      HTTP request happens to finish. A registration request already in
 *      flight when its account signs out keeps the OLD `iat` even if it
 *      reaches the database AFTER a newer account's own registration —
 *      ordering by issuedAt means that stale request loses regardless of
 *      which one wins the network race, because sign-in-B can only ever
 *      happen after sign-out-A on the same device, so iat_B > iat_A is
 *      guaranteed by the user's own action sequence, not by clocks.
 *   2. claimedAt (Postgres's own now()) — tie-breaks two requests whose
 *      JWTs happen to have been issued in the same second (iat is
 *      second-precision), which can legitimately happen for two different,
 *      still-current accounts registering the same shared token close
 *      together.
 *
 * An EXACT tie on both (only reachable if two requests are issued in the
 * same JWT-second AND happen to commit in the same database instant) is a
 * defined no-op: the WHERE clause requires strictly-greater on this
 * ordering, so neither side's claim overwrites the other and the existing
 * owner is left unchanged. This is deliberate — a `<=` comparison would
 * let both sides simultaneously satisfy "the other is <= me" and clobber
 * each other, which is the exact bug this function exists to prevent. The
 * tie resolves itself on either account's next registration.
 *
 * @returns {Promise<{claimed: boolean, ownerUserId: string|null}>}
 *   claimed=true if THIS request's account now owns the token. When false,
 *   ownerUserId reports who currently does, for logging — the caller
 *   should NOT treat a lost claim as an error; the losing account's own
 *   per-account bookkeeping columns are still written elsewhere as normal.
 */
export async function claimTokenOwnership(db, { token, tokenType, userId, deviceId = null, issuedAtSeconds }) {
  if (!token || !tokenType || !userId) {
    throw new Error('claimTokenOwnership requires token, tokenType, and userId');
  }
  if (!Number.isFinite(issuedAtSeconds)) {
    throw new Error('claimTokenOwnership requires a numeric issuedAtSeconds (the claiming request\'s JWT iat)');
  }

  const rows = await db.execute(sql`
    INSERT INTO push_token_ownership (token, token_type, user_id, device_id, issued_at, claimed_at)
    VALUES (${token}, ${tokenType}, ${userId}, ${deviceId}, ${issuedAtSeconds}, now())
    ON CONFLICT (token) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      token_type = EXCLUDED.token_type,
      device_id = EXCLUDED.device_id,
      issued_at = EXCLUDED.issued_at,
      claimed_at = EXCLUDED.claimed_at
    WHERE
      EXCLUDED.issued_at > push_token_ownership.issued_at
      OR (EXCLUDED.issued_at = push_token_ownership.issued_at AND EXCLUDED.claimed_at > push_token_ownership.claimed_at)
    RETURNING user_id
  `);

  if (rows.length > 0) {
    return { claimed: true, ownerUserId: rows[0].user_id };
  }

  const current = await db.execute(sql`SELECT user_id FROM push_token_ownership WHERE token = ${token}`);
  return { claimed: false, ownerUserId: current[0]?.user_id ?? null };
}

/**
 * Releases ownership on sign-out/deregistration — scoped to (token,
 * currently-owning userId), so a stale deregister call from an account
 * that has since lost ownership to someone else is a safe no-op: the
 * WHERE clause filters on the row's CURRENT user_id, which by then is no
 * longer this caller's, so it simply matches nothing.
 */
export async function releaseTokenOwnership(db, token, userId) {
  if (!token || !userId) return { released: false };
  const rows = await db.execute(sql`
    DELETE FROM push_token_ownership WHERE token = ${token} AND user_id = ${userId}
    RETURNING id
  `);
  return { released: rows.length > 0 };
}

/**
 * Send-path gate: is `userId` still the current, atomically-claimed owner
 * of this token? Call this immediately before dispatching a push, using
 * whatever token value was resolved from accountSettingsTable/devicesTable
 * — those columns can still be transiently stale (the losing account's own
 * bookkeeping isn't retroactively corrected by someone else's claim), so
 * this table is the one check that must gate actual delivery.
 *
 * No ownership row at all means this token predates the ownership model
 * (a legacy registration that never went through claimTokenOwnership) —
 * treated as owned rather than blocked, so existing installs keep
 * receiving notifications normally until their next registration call
 * populates a row.
 */
export async function isCurrentTokenOwner(db, token, userId) {
  if (!token || !userId) return false;
  const rows = await db.execute(sql`SELECT user_id FROM push_token_ownership WHERE token = ${token}`);
  if (rows.length === 0) return true;
  return rows[0].user_id === userId;
}
