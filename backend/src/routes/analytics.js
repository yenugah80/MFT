import express from "express";
import { db } from "../config/db.js";
import { sql } from "drizzle-orm";

const router = express.Router();

// Ensure analytics tables exist
let tablesEnsured = false;
async function ensureAnalyticsTables() {
  if (tablesEnsured) return;

  try {
    // Create crash_reports table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "crash_reports" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" TIMESTAMP NOT NULL,
        "error_message" TEXT NOT NULL,
        "error_name" TEXT,
        "error_stack" TEXT,
        "component_stack" TEXT,
        "context" JSONB DEFAULT '{}',
        "device" JSONB DEFAULT '{}',
        "environment" TEXT DEFAULT 'production',
        "user_id" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create analytics_events table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "analytics_events" (
        "id" SERIAL PRIMARY KEY,
        "event_name" TEXT NOT NULL,
        "timestamp" TIMESTAMP NOT NULL,
        "properties" JSONB DEFAULT '{}',
        "device" JSONB DEFAULT '{}',
        "session_id" TEXT,
        "user_id" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crash_reports_timestamp" ON "crash_reports" ("timestamp");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_analytics_events_name" ON "analytics_events" ("event_name");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_analytics_events_timestamp" ON "analytics_events" ("timestamp");`);

    tablesEnsured = true;
    console.log("✅ Analytics tables verified");
  } catch (err) {
    console.error("❌ Failed to create analytics tables:", err.message);
  }
}

// Initialize tables on first request
router.use(async (req, res, next) => {
  await ensureAnalyticsTables();
  next();
});

/**
 * POST /api/crash-reports
 * Receive crash reports from mobile app
 */
router.post("/crash-reports", async (req, res) => {
  try {
    const { timestamp, error, errorInfo, context, device, environment } = req.body;

    await db.execute(sql`
      INSERT INTO "crash_reports"
        ("timestamp", "error_message", "error_name", "error_stack", "component_stack", "context", "device", "environment", "user_id")
      VALUES
        (${new Date(timestamp)}, ${error?.message || 'Unknown'}, ${error?.name || 'Error'}, ${error?.stack || null}, ${errorInfo?.componentStack || null}, ${JSON.stringify(context || {})}, ${JSON.stringify(device || {})}, ${environment || 'production'}, ${context?.userId || null})
    `);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[CrashReports] Error saving crash report:", err.message);
    res.status(500).json({ error: "Failed to save crash report" });
  }
});

/**
 * POST /api/analytics/events
 * Receive analytics events from mobile app (batched)
 */
router.post("/analytics/events", async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "No events provided" });
    }

    // Insert events in batch
    for (const event of events) {
      await db.execute(sql`
        INSERT INTO "analytics_events"
          ("event_name", "timestamp", "properties", "device", "session_id", "user_id")
        VALUES
          (${event.event}, ${new Date(event.timestamp)}, ${JSON.stringify(event.properties || {})}, ${JSON.stringify(event.device || {})}, ${event.properties?.session_id || null}, ${event.properties?.user_id || null})
      `);
    }

    res.status(201).json({ success: true, count: events.length });
  } catch (err) {
    console.error("[Analytics] Error saving events:", err.message);
    res.status(500).json({ error: "Failed to save events" });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get analytics dashboard data (for admin use later)
 */
router.get("/analytics/dashboard", async (req, res) => {
  try {
    // Get event counts by type (last 7 days)
    const eventCounts = await db.execute(sql`
      SELECT event_name, COUNT(*) as count
      FROM analytics_events
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 20
    `);

    // Get crash counts (last 7 days)
    const crashCounts = await db.execute(sql`
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM crash_reports
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    // Get daily active users (last 7 days)
    const dauCounts = await db.execute(sql`
      SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as dau
      FROM analytics_events
      WHERE timestamp > NOW() - INTERVAL '7 days' AND user_id IS NOT NULL
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    res.json({
      eventCounts: eventCounts.rows,
      crashCounts: crashCounts.rows,
      dauCounts: dauCounts.rows,
    });
  } catch (err) {
    console.error("[Analytics] Dashboard error:", err.message);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
