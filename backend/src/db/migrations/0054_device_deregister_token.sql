-- Narrow, single-purpose credential letting a device deregister itself
-- after its account session is gone (offline-at-sign-out recovery). See
-- devicesTable's deregisterToken comment in schema.js for the full
-- rationale and the unauthenticated endpoint that consumes it.
ALTER TABLE "devices"
  ADD COLUMN "deregister_token" text UNIQUE,
  ADD COLUMN "deregister_token_expires_at" timestamp;
