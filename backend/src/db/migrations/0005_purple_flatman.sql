-- Create missing profile records for orphaned user_ids (data cleanup)
INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "favorites"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "food_log"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "recipes"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "daily_nutrition_summary"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "water_log"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "weight_history"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

INSERT INTO "profiles" ("user_id", "created_at", "updated_at")
SELECT DISTINCT "user_id", NOW(), NOW()
FROM "mood_log"
WHERE "user_id" NOT IN (SELECT "user_id" FROM "profiles")
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint

-- Clean up invalid data before adding CHECK constraints
UPDATE "nutrition_goals" SET "primary_goal" = NULL
WHERE "primary_goal" NOT IN ('lose', 'maintain', 'gain');--> statement-breakpoint

UPDATE "food_log" SET "meal_type" = NULL
WHERE "meal_type" NOT IN ('breakfast', 'lunch', 'dinner', 'snack') AND "meal_type" IS NOT NULL;--> statement-breakpoint

UPDATE "food_log" SET "nutriscore" = NULL
WHERE "nutriscore" NOT IN ('A', 'B', 'C', 'D', 'E') AND "nutriscore" IS NOT NULL;--> statement-breakpoint

UPDATE "food_log" SET "ecoscore" = NULL
WHERE "ecoscore" NOT IN ('A', 'B', 'C', 'D', 'E') AND "ecoscore" IS NOT NULL;--> statement-breakpoint

UPDATE "profiles" SET "gender" = NULL
WHERE "gender" NOT IN ('female', 'male', 'other') AND "gender" IS NOT NULL;--> statement-breakpoint

UPDATE "user_notifications" SET "type" = NULL
WHERE "type" NOT IN ('achievement_unlock', 'reminder', 'goal_reached') AND "type" IS NOT NULL;--> statement-breakpoint

-- Now add foreign key constraints
ALTER TABLE "daily_nutrition_summary" ADD CONSTRAINT "daily_nutrition_summary_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dietary_preferences" ADD CONSTRAINT "dietary_preferences_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gamification" ADD CONSTRAINT "gamification_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_log" ADD CONSTRAINT "mood_log_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "nutrition_goals_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_log" ADD CONSTRAINT "water_log_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_history" ADD CONSTRAINT "weight_history_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_nutrition_summary" ADD CONSTRAINT "total_calories_check" CHECK ("daily_nutrition_summary"."total_calories" >= 0);--> statement-breakpoint
ALTER TABLE "daily_nutrition_summary" ADD CONSTRAINT "total_protein_check" CHECK ("daily_nutrition_summary"."total_protein" >= 0);--> statement-breakpoint
ALTER TABLE "daily_nutrition_summary" ADD CONSTRAINT "total_carbs_check" CHECK ("daily_nutrition_summary"."total_carbs" >= 0);--> statement-breakpoint
ALTER TABLE "daily_nutrition_summary" ADD CONSTRAINT "total_fats_check" CHECK ("daily_nutrition_summary"."total_fats" >= 0);--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_calories_check" CHECK ("food_log"."calories" IS NULL OR ("food_log"."calories" >= 0 AND "food_log"."calories" <= 10000));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_protein_check" CHECK ("food_log"."protein" IS NULL OR ("food_log"."protein" >= 0 AND "food_log"."protein" <= 500));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_carbs_check" CHECK ("food_log"."carbs" IS NULL OR ("food_log"."carbs" >= 0 AND "food_log"."carbs" <= 1000));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_fats_check" CHECK ("food_log"."fats" IS NULL OR ("food_log"."fats" >= 0 AND "food_log"."fats" <= 500));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "meal_type_check" CHECK ("food_log"."meal_type" IS NULL OR "food_log"."meal_type" IN ('breakfast', 'lunch', 'dinner', 'snack'));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "nutriscore_check" CHECK ("food_log"."nutriscore" IS NULL OR "food_log"."nutriscore" IN ('A', 'B', 'C', 'D', 'E'));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "ecoscore_check" CHECK ("food_log"."ecoscore" IS NULL OR "food_log"."ecoscore" IN ('A', 'B', 'C', 'D', 'E'));--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "nova_score_check" CHECK ("food_log"."nova_score" IS NULL OR ("food_log"."nova_score" >= 1 AND "food_log"."nova_score" <= 4));--> statement-breakpoint
ALTER TABLE "gamification" ADD CONSTRAINT "xp_check" CHECK ("gamification"."xp" >= 0);--> statement-breakpoint
ALTER TABLE "gamification" ADD CONSTRAINT "level_check" CHECK ("gamification"."level" >= 1 AND "gamification"."level" <= 999);--> statement-breakpoint
ALTER TABLE "gamification" ADD CONSTRAINT "streak_check" CHECK ("gamification"."streak" >= 0);--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "primary_goal_check" CHECK ("nutrition_goals"."primary_goal" IS NULL OR "nutrition_goals"."primary_goal" IN ('lose', 'maintain', 'gain'));--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "calories_check" CHECK ("nutrition_goals"."daily_calories" IS NULL OR ("nutrition_goals"."daily_calories" >= 800 AND "nutrition_goals"."daily_calories" <= 10000));--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "protein_check" CHECK ("nutrition_goals"."protein_g" IS NULL OR ("nutrition_goals"."protein_g" >= 0 AND "nutrition_goals"."protein_g" <= 500));--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "carbs_check" CHECK ("nutrition_goals"."carbs_g" IS NULL OR ("nutrition_goals"."carbs_g" >= 0 AND "nutrition_goals"."carbs_g" <= 1000));--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "fats_check" CHECK ("nutrition_goals"."fats_g" IS NULL OR ("nutrition_goals"."fats_g" >= 0 AND "nutrition_goals"."fats_g" <= 300));--> statement-breakpoint
ALTER TABLE "nutrition_goals" ADD CONSTRAINT "water_check" CHECK ("nutrition_goals"."water_liters" IS NULL OR ("nutrition_goals"."water_liters" >= 0 AND "nutrition_goals"."water_liters" <= 10));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "age_check" CHECK ("profiles"."age" IS NULL OR ("profiles"."age" >= 13 AND "profiles"."age" <= 120));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "weight_check" CHECK ("profiles"."weight_kg" IS NULL OR ("profiles"."weight_kg" > 20 AND "profiles"."weight_kg" < 500));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "height_check" CHECK ("profiles"."height_cm" IS NULL OR ("profiles"."height_cm" > 50 AND "profiles"."height_cm" < 300));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "gender_check" CHECK ("profiles"."gender" IS NULL OR "profiles"."gender" IN ('female', 'male', 'other'));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "servings_check" CHECK ("recipes"."servings" >= 1 AND "recipes"."servings" <= 100);--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "prep_time_check" CHECK ("recipes"."prep_time_minutes" IS NULL OR ("recipes"."prep_time_minutes" >= 0 AND "recipes"."prep_time_minutes" <= 1440));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "cook_time_check" CHECK ("recipes"."cook_time_minutes" IS NULL OR ("recipes"."cook_time_minutes" >= 0 AND "recipes"."cook_time_minutes" <= 1440));--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "notification_type_check" CHECK ("user_notifications"."type" IS NULL OR "user_notifications"."type" IN ('achievement_unlock', 'reminder', 'goal_reached'));--> statement-breakpoint
ALTER TABLE "water_log" ADD CONSTRAINT "water_amount_check" CHECK ("water_log"."amount_liters" > 0 AND "water_log"."amount_liters" <= 20);--> statement-breakpoint
ALTER TABLE "weight_history" ADD CONSTRAINT "weight_history_check" CHECK ("weight_history"."weight_kg" > 20 AND "weight_history"."weight_kg" < 500);