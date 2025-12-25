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
