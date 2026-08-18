-- Two production incidents tonight involved gamification.streak being
-- silently overwritten by code that turned out to be wrong: a same-request
-- recomputation in /nutrition/dashboard (fixed, see git log) and a
-- sleep-logging date bug that fed a stale "today" into updateStreak(). Both
-- were only diagnosable by live reasoning + manual DB queries because there
-- was no record of what changed, when, or from where. This table gives
-- updateStreak() (gamificationRewardService.js — the single source of truth
-- for every gamification.streak write) a before/after audit trail going
-- forward, so a future bad write is a five-second lookup instead of a live
-- investigation.
CREATE TABLE "gamification_audit_log" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "changed_at" timestamp DEFAULT now() NOT NULL,
  "source" text NOT NULL,
  "old_values" jsonb,
  "new_values" jsonb,
  "call_site" text
);

CREATE INDEX "gamification_audit_log_user_id_idx" ON "gamification_audit_log" ("user_id");
CREATE INDEX "gamification_audit_log_changed_at_idx" ON "gamification_audit_log" ("changed_at");
