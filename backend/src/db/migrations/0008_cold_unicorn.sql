ALTER TABLE "mood_log" ADD COLUMN IF NOT EXISTS "client_event_id" text;--> statement-breakpoint
ALTER TABLE "water_log" ADD COLUMN IF NOT EXISTS "client_event_id" text;
