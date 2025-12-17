ALTER TABLE "user_notifications" ALTER COLUMN "read" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_notifications" ALTER COLUMN "read" SET DATA TYPE boolean USING (CASE WHEN "read" = 'true' THEN true ELSE false END);--> statement-breakpoint
ALTER TABLE "user_notifications" ALTER COLUMN "read" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_notifications" ALTER COLUMN "read" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_summary_user_date_unique_idx" ON "daily_nutrition_summary" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_summary_user_id_idx" ON "daily_nutrition_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_summary_date_idx" ON "daily_nutrition_summary" USING btree ("date");--> statement-breakpoint
CREATE INDEX "food_log_user_id_idx" ON "food_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "food_log_logged_date_idx" ON "food_log" USING btree ("logged_date");--> statement-breakpoint
CREATE INDEX "food_log_user_date_idx" ON "food_log" USING btree ("user_id","logged_date");--> statement-breakpoint
CREATE INDEX "mood_log_user_date_idx" ON "mood_log" USING btree ("user_id","logged_date");--> statement-breakpoint
CREATE INDEX "water_log_user_date_idx" ON "water_log" USING btree ("user_id","logged_date");--> statement-breakpoint
CREATE INDEX "weight_history_user_date_idx" ON "weight_history" USING btree ("user_id","recorded_date");