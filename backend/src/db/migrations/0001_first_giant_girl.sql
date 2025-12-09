CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text,
	"email" text,
	"age" integer,
	"weight_kg" integer,
	"height_cm" integer,
	"goal" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_recipe_unique_idx" ON "favorites" USING btree ("user_id","recipe_id");