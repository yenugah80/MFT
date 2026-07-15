import { db } from "../config/db.js";
import { sql } from "drizzle-orm";

let waterLogTableEnsured = false;
export async function ensureWaterLogTableShape() {
  if (waterLogTableEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "water_log" ADD COLUMN IF NOT EXISTS "beverage_type" text DEFAULT 'water';`
    );
    await db.execute(
      sql`ALTER TABLE "water_log" ADD COLUMN IF NOT EXISTS "hydration_factor" numeric(3,2) DEFAULT 1.0;`
    );
    await db.execute(
      sql`ALTER TABLE "water_log" ADD COLUMN IF NOT EXISTS "hydration_liters" numeric(3,1);`
    );
    waterLogTableEnsured = true;
    console.log("✅ Water log table schema verified and updated");
  } catch (err) {
    console.error("❌ Failed to ensure water_log table shape:", err);
  }
}

// lagged_correlations was created outside the tracked migration history with a legacy
// column set (signal1/signal2/optimal_lag/...) that predates the current richer schema
// (signal_a/signal_b/optimal_lag_hours/cross_correlation_json/granger_f_statistic/...).
// No code path ever wrote successfully to the legacy shape, so it's safe to rebuild —
// but only when empty, so this never touches real data if the assumption is ever wrong.
let laggedCorrelationsTableEnsured = false;
export async function ensureLaggedCorrelationsTableShape() {
  if (laggedCorrelationsTableEnsured) return;
  try {
    const hasCorrectShape = await db.execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'lagged_correlations' AND column_name = 'signal_a';`
    );
    if (hasCorrectShape.length > 0) {
      laggedCorrelationsTableEnsured = true;
      return;
    }

    const tableExists = await db.execute(sql`SELECT to_regclass('public.lagged_correlations') as reg;`);
    if (tableExists[0]?.reg) {
      const rowCount = await db.execute(sql`SELECT count(*) FROM lagged_correlations;`);
      if (Number(rowCount[0]?.count) > 0) {
        console.error("❌ lagged_correlations has legacy shape AND existing data — refusing to auto-rebuild. Manual migration required.");
        laggedCorrelationsTableEnsured = true;
        return;
      }
      await db.execute(sql`DROP TABLE "lagged_correlations";`);
    }

    await db.execute(sql`
      CREATE TABLE "lagged_correlations" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
        "signal_a" text NOT NULL,
        "signal_b" text NOT NULL,
        "optimal_lag_hours" numeric(6,2) NOT NULL,
        "lag_search_range_min" integer DEFAULT 0,
        "lag_search_range_max" integer DEFAULT 48,
        "correlation_at_optimal_lag" numeric(5,4) NOT NULL,
        "p_value_at_optimal_lag" numeric(8,7),
        "cross_correlation_json" json,
        "sample_size" integer NOT NULL,
        "confidence_interval" json,
        "is_statistically_significant" boolean DEFAULT false,
        "granger_f_statistic" numeric(10,4),
        "granger_p_value" numeric(8,7),
        "causal_direction" text,
        "last_computed_at" timestamp DEFAULT now(),
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE UNIQUE INDEX "lagged_corr_user_signals_unique" ON "lagged_correlations" ("user_id", "signal_a", "signal_b");`);
    await db.execute(sql`CREATE INDEX "lagged_corr_user_idx" ON "lagged_correlations" ("user_id");`);
    await db.execute(sql`CREATE INDEX "lagged_corr_signals_idx" ON "lagged_correlations" ("signal_a", "signal_b");`);
    await db.execute(sql`CREATE INDEX "lagged_corr_active_idx" ON "lagged_correlations" ("is_active");`);

    laggedCorrelationsTableEnsured = true;
    console.log("✅ lagged_correlations table rebuilt to match current schema");
  } catch (err) {
    console.error("❌ Failed to ensure lagged_correlations table shape:", err);
  }
}

let foodLogTableEnsured = false;
export async function ensureFoodLogTableShape() {
  if (foodLogTableEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "food_log" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();`
    );
    foodLogTableEnsured = true;
    console.log("✅ Food log table schema verified and updated");
  } catch (err) {
    console.error("❌ Failed to ensure food_log table shape:", err);
  }
}

let gamificationTableEnsured = false;
export async function ensureGamificationTableShape() {
  if (gamificationTableEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "previous_streak" integer DEFAULT 0;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "streak_reset_at" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "streak_freezes" integer DEFAULT 0;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "last_freeze_awarded_at" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "last_streak_updated_at" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "timezone_offset" integer;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "total_meals_logged" integer DEFAULT 0;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "last_log_date" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "last_xp_awarded_at" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "gamification" ADD COLUMN IF NOT EXISTS "streak_saved_by_freeze" boolean DEFAULT false;`
    );
    gamificationTableEnsured = true;
    console.log("✅ Gamification table schema verified and updated");
  } catch (err) {
    console.error("❌ Failed to ensure gamification table shape:", err);
  }
}

let dailyNutritionSummaryTableEnsured = false;
export async function ensureDailyNutritionSummaryTableShape() {
  if (dailyNutritionSummaryTableEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "daily_nutrition_summary" ADD COLUMN IF NOT EXISTS "daily_score" integer;`
    );
    await db.execute(
      sql`ALTER TABLE "daily_nutrition_summary" ADD COLUMN IF NOT EXISTS "mood_score" integer;`
    );
    await db.execute(
      sql`ALTER TABLE "daily_nutrition_summary" ADD COLUMN IF NOT EXISTS "hydration_score" integer;`
    );
    await db.execute(
      sql`ALTER TABLE "daily_nutrition_summary" ADD COLUMN IF NOT EXISTS "hydration_celebrated_at" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "daily_nutrition_summary" ADD COLUMN IF NOT EXISTS "story_line" text;`
    );
    dailyNutritionSummaryTableEnsured = true;
    console.log("✅ Daily nutrition summary schema verified and updated");
  } catch (err) {
    console.error("❌ Failed to ensure daily_nutrition_summary table shape:", err);
  }
}
