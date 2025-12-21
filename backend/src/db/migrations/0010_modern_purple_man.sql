DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_log_user_id_client_event_id_unique'
  ) THEN
    ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_client_event_id_unique" UNIQUE("user_id","client_event_id");
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mood_log_user_id_client_event_id_unique'
  ) THEN
    ALTER TABLE "mood_log" ADD CONSTRAINT "mood_log_user_id_client_event_id_unique" UNIQUE("user_id","client_event_id");
  END IF;
END $$;
