ALTER TABLE "weight_history" ADD COLUMN IF NOT EXISTS "client_event_id" text;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'water_log_user_id_client_event_id_unique'
  ) THEN
    ALTER TABLE "water_log" ADD CONSTRAINT "water_log_user_id_client_event_id_unique" UNIQUE("user_id","client_event_id");
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weight_history_user_id_client_event_id_unique'
  ) THEN
    ALTER TABLE "weight_history" ADD CONSTRAINT "weight_history_user_id_client_event_id_unique" UNIQUE("user_id","client_event_id");
  END IF;
END $$;
