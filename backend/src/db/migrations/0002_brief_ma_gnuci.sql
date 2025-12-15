-- Safe guard for environments where this table was manually created
-- before Drizzle started managing it.
DROP TABLE IF EXISTS "daily_nutrition_summary";
--> statement-breakpoint
DROP TABLE IF EXISTS "food_log";
--> statement-breakpoint

CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"required_points" integer,
	"category" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "achievements_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "daily_nutrition_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"total_calories" integer DEFAULT 0,
	"total_protein" integer DEFAULT 0,
	"total_carbs" integer DEFAULT 0,
	"total_fats" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dietary_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preferences" json DEFAULT '[]'::json,
	"allergies" json DEFAULT '[]'::json,
	"dislikes" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "dietary_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "food_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"food_name" text NOT NULL,
	"calories" integer,
	"protein" integer,
	"carbs" integer,
	"fats" integer,
	"serving_size" text,
	"meal_type" text,
	"micros" json DEFAULT '{}'::json,
	"nutriscore" text,
	"ecoscore" text,
	"nova_score" integer,
	"diet_labels" json DEFAULT '[]'::json,
	"allergens" json DEFAULT '[]'::json,
	"ingredients" json DEFAULT '[]'::json,
	"barcode" text,
	"image_url" text,
	"logged_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gamification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"xp" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"streak" integer DEFAULT 0,
	"badges" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "gamification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "nutrition_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"primary_goal" text,
	"daily_calories" integer,
	"protein_g" integer,
	"carbs_g" integer,
	"fats_g" integer,
	"water_liters" numeric(3, 1),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nutrition_goals_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" text,
	"ingredients" json DEFAULT '[]'::json,
	"calories" integer,
	"protein" integer,
	"carbs" integer,
	"fats" integer,
	"prep_time_minutes" integer,
	"cook_time_minutes" integer,
	"servings" integer DEFAULT 1,
	"tags" json DEFAULT '[]'::json,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text,
	"title" text NOT NULL,
	"message" text,
	"read" text DEFAULT 'false',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "water_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount_liters" numeric(3, 1) NOT NULL,
	"logged_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weight_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"recorded_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "weight_kg" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gender" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "activity_level" text;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "goal";