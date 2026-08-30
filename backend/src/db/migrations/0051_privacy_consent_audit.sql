-- Preserve an immutable, user-owned history of purpose-specific privacy choices.
CREATE TABLE IF NOT EXISTS "privacy_consent_audit" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "purpose_key" text NOT NULL,
  "schema_version" integer NOT NULL,
  "previous_state" boolean NOT NULL,
  "new_state" boolean NOT NULL,
  "policy_version" text NOT NULL,
  "source_screen" text DEFAULT 'unknown' NOT NULL,
  "device_platform" text DEFAULT 'unknown' NOT NULL,
  "changed_at" timestamp DEFAULT now() NOT NULL,
  "revoked_at" timestamp,
  CONSTRAINT "privacy_consent_audit_user_id_profiles_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "privacy_consent_audit_purpose_check"
    CHECK ("purpose_key" IN ('usageAnalytics', 'crossDomainInsights', 'contextInInsights', 'reflectionInInsights', 'sensitiveInsights', 'aiWellnessNarration', 'weeklyReviewReminder')),
  CONSTRAINT "privacy_consent_audit_platform_check"
    CHECK ("device_platform" IN ('ios', 'android', 'web', 'unknown')),
  CONSTRAINT "privacy_consent_audit_state_changed_check"
    CHECK ("previous_state" <> "new_state")
);

CREATE INDEX IF NOT EXISTS "privacy_consent_audit_user_changed_at_idx"
  ON "privacy_consent_audit" USING btree ("user_id", "changed_at");
