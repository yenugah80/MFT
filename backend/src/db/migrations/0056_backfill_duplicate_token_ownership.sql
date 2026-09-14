-- Targeted backfill, not a blanket one: seeds push_token_ownership ONLY
-- for tokens that are CURRENTLY duplicated across more than one account
-- right now — exactly the risk case this whole feature exists for (the
-- live incident: the same Expo token still registered to two different
-- accounts' accountSettingsTable rows). A token with exactly one current
-- owner is left with no ownership row, which isCurrentTokenOwner already
-- treats as owned by whoever asks — correct and safe for a token with no
-- actual cross-account ambiguity, so it isn't touched here.
--
-- No real Clerk `iat` exists for historical registrations, so issued_at is
-- backfilled from each row's own last-updated timestamp — the best
-- available signal for "when this account most recently claimed this
-- token," not a cryptographically verified issuance time. This is a
-- heuristic, one-time repair for existing bad state; every live
-- registration going forward uses the real, verified iat via
-- claimTokenOwnership. The most-recently-updated account among the
-- duplicates is seeded as the winner — ties (identical timestamps) are
-- resolved arbitrarily but deterministically by Postgres's own row
-- ordering, since a genuine tie between two pre-existing rows carries no
-- more real signal to break it than that.
--
-- ON CONFLICT DO NOTHING: safe to re-run: a token a live registration has
-- already claimed by the time this runs is left alone rather than
-- overwritten with a stale heuristic value.

-- accountSettingsTable (legacy, single-token-per-account) duplicates —
-- Expo tokens.
INSERT INTO push_token_ownership (token, token_type, user_id, device_id, issued_at, claimed_at)
SELECT DISTINCT ON (t.expo_push_token)
  t.expo_push_token,
  'expo',
  t.user_id,
  NULL,
  EXTRACT(EPOCH FROM t.updated_at)::bigint,
  t.updated_at
FROM account_settings t
WHERE t.expo_push_token IS NOT NULL
  AND t.expo_push_token IN (
    SELECT expo_push_token FROM account_settings
    WHERE expo_push_token IS NOT NULL
    GROUP BY expo_push_token
    HAVING COUNT(DISTINCT user_id) > 1
  )
ORDER BY t.expo_push_token, t.updated_at DESC
ON CONFLICT (token) DO NOTHING;

-- accountSettingsTable duplicates — FCM tokens.
INSERT INTO push_token_ownership (token, token_type, user_id, device_id, issued_at, claimed_at)
SELECT DISTINCT ON (t.fcm_token)
  t.fcm_token,
  'fcm',
  t.user_id,
  NULL,
  EXTRACT(EPOCH FROM t.updated_at)::bigint,
  t.updated_at
FROM account_settings t
WHERE t.fcm_token IS NOT NULL
  AND t.fcm_token IN (
    SELECT fcm_token FROM account_settings
    WHERE fcm_token IS NOT NULL
    GROUP BY fcm_token
    HAVING COUNT(DISTINCT user_id) > 1
  )
ORDER BY t.fcm_token, t.updated_at DESC
ON CONFLICT (token) DO NOTHING;

-- devicesTable (per-device model) duplicates — Expo tokens. Same physical
-- device reusing its persisted deviceId across an account switch produces
-- a second row under the new userId; the token itself is what's shared.
INSERT INTO push_token_ownership (token, token_type, user_id, device_id, issued_at, claimed_at)
SELECT DISTINCT ON (d.expo_push_token)
  d.expo_push_token,
  'expo',
  d.user_id,
  d.device_id,
  EXTRACT(EPOCH FROM d.updated_at)::bigint,
  d.updated_at
FROM devices d
WHERE d.expo_push_token IS NOT NULL
  AND d.expo_push_token IN (
    SELECT expo_push_token FROM devices
    WHERE expo_push_token IS NOT NULL
    GROUP BY expo_push_token
    HAVING COUNT(DISTINCT user_id) > 1
  )
ORDER BY d.expo_push_token, d.updated_at DESC
ON CONFLICT (token) DO NOTHING;

-- devicesTable duplicates — FCM tokens.
INSERT INTO push_token_ownership (token, token_type, user_id, device_id, issued_at, claimed_at)
SELECT DISTINCT ON (d.fcm_token)
  d.fcm_token,
  'fcm',
  d.user_id,
  d.device_id,
  EXTRACT(EPOCH FROM d.updated_at)::bigint,
  d.updated_at
FROM devices d
WHERE d.fcm_token IS NOT NULL
  AND d.fcm_token IN (
    SELECT fcm_token FROM devices
    WHERE fcm_token IS NOT NULL
    GROUP BY fcm_token
    HAVING COUNT(DISTINCT user_id) > 1
  )
ORDER BY d.fcm_token, d.updated_at DESC
ON CONFLICT (token) DO NOTHING;
