-- Atomic, single-owner-per-token model. accountSettingsTable's
-- fcmToken/expoPushToken columns and devicesTable's per-device columns
-- are untouched and stay as per-account bookkeeping ("this account
-- believes it has this token") — this table is the authoritative,
-- race-free answer to "which account should actually receive a push to
-- this exact token right now," enforced by the UNIQUE constraint on
-- token itself: there can never be two rows for the same token value,
-- so two accounts can never both be recorded as its owner.
CREATE TABLE "push_token_ownership" (
  "id" serial PRIMARY KEY,
  "token" text NOT NULL,
  "token_type" text NOT NULL, -- 'fcm' | 'expo'
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "device_id" text,
  -- Clerk JWT `iat` (unix seconds) of the request that won this claim —
  -- fixed at credential-mint time, not at request-completion time. This is
  -- what lets a request already in flight when its account signs out lose
  -- to a newer account's claim even if it happens to reach the database
  -- LATER on the wire: ordering is by when the session was created, not by
  -- network arrival order.
  "issued_at" bigint NOT NULL,
  "claimed_at" timestamp NOT NULL DEFAULT now(),
  -- NULL = actively claimed by user_id. Non-null = explicitly released
  -- (deregistered) and not currently owned by anyone — distinct from no
  -- row existing at all, which means this token never went through the
  -- ownership model (a legacy pre-migration registration) and is treated
  -- permissively. Deleting the row on release would have made both cases
  -- look identical, letting a token silently fall back to "owned" again
  -- immediately after its rightful account explicitly gave it up.
  "released_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "push_token_ownership_token_unique" UNIQUE ("token")
);
CREATE INDEX "push_token_ownership_user_id_idx" ON "push_token_ownership" ("user_id");
