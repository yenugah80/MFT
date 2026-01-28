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

/**
 * GET /api/analytics/voice
 * Get voice-specific analytics data
 * Query params: days (default 30)
 */
router.get("/analytics/voice", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Voice recording success rate
    const successRateQuery = await db.execute(sql`
      WITH voice_sessions AS (
        SELECT
          properties->>'voice_session_id' as session_id,
          event_name
        FROM analytics_events
        WHERE event_name LIKE 'voice_%'
          AND timestamp > NOW() - INTERVAL '1 day' * ${days}
          AND properties->>'voice_session_id' IS NOT NULL
      ),
      session_outcomes AS (
        SELECT
          session_id,
          MAX(CASE WHEN event_name = 'voice_analysis_completed' THEN 1 ELSE 0 END) as completed,
          MAX(CASE WHEN event_name = 'voice_analysis_failed' THEN 1 ELSE 0 END) as failed,
          MAX(CASE WHEN event_name = 'voice_recording_cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM voice_sessions
        GROUP BY session_id
      )
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(completed), 0) as completed_sessions,
        COALESCE(SUM(failed), 0) as failed_sessions,
        COALESCE(SUM(cancelled), 0) as cancelled_sessions,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(SUM(completed)::numeric / COUNT(*) * 100, 2)
          ELSE 0
        END as success_rate
      FROM session_outcomes
    `);

    // Average confidence scores
    const confidenceQuery = await db.execute(sql`
      SELECT
        ROUND(AVG((properties->>'confidence_score')::numeric), 3) as avg_confidence,
        ROUND(MIN((properties->>'confidence_score')::numeric), 3) as min_confidence,
        ROUND(MAX((properties->>'confidence_score')::numeric), 3) as max_confidence,
        COUNT(*) as sample_count
      FROM analytics_events
      WHERE event_name = 'voice_transcription_received'
        AND timestamp > NOW() - INTERVAL '1 day' * ${days}
        AND properties->>'confidence_score' IS NOT NULL
    `);

    // Average recording duration
    const durationQuery = await db.execute(sql`
      SELECT
        ROUND(AVG((properties->>'duration_ms')::numeric)) as avg_duration_ms,
        ROUND(MIN((properties->>'duration_ms')::numeric)) as min_duration_ms,
        ROUND(MAX((properties->>'duration_ms')::numeric)) as max_duration_ms,
        COUNT(*) as sample_count
      FROM analytics_events
      WHERE event_name = 'voice_recording_completed'
        AND timestamp > NOW() - INTERVAL '1 day' * ${days}
        AND properties->>'duration_ms' IS NOT NULL
    `);

    // Edit rate (how often users edit transcriptions)
    const editQuery = await db.execute(sql`
      WITH transcriptions AS (
        SELECT COUNT(*) as total
        FROM analytics_events
        WHERE event_name = 'voice_transcription_received'
          AND timestamp > NOW() - INTERVAL '1 day' * ${days}
      ),
      edits AS (
        SELECT COUNT(*) as edited
        FROM analytics_events
        WHERE event_name = 'voice_transcription_edited'
          AND timestamp > NOW() - INTERVAL '1 day' * ${days}
      )
      SELECT
        t.total as total_transcriptions,
        e.edited as edited_transcriptions,
        CASE WHEN t.total > 0
          THEN ROUND(e.edited::numeric / t.total * 100, 2)
          ELSE 0
        END as edit_rate
      FROM transcriptions t, edits e
    `);

    // Error breakdown
    const errorQuery = await db.execute(sql`
      SELECT
        COALESCE(properties->>'error_type', 'unknown') as error_type,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_name = 'voice_analysis_failed'
        AND timestamp > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY properties->>'error_type'
      ORDER BY count DESC
      LIMIT 10
    `);

    // Daily trends
    const trendsQuery = await db.execute(sql`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) FILTER (WHERE event_name = 'voice_recording_started') as recordings_started,
        COUNT(*) FILTER (WHERE event_name = 'voice_analysis_completed') as completed,
        COUNT(*) FILTER (WHERE event_name = 'voice_analysis_failed') as failed,
        COUNT(*) FILTER (WHERE event_name = 'voice_recording_cancelled') as cancelled
      FROM analytics_events
      WHERE event_name LIKE 'voice_%'
        AND timestamp > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT ${days}
    `);

    // Playback and re-record usage
    const usageQuery = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'voice_playback_started') as playback_count,
        COUNT(*) FILTER (WHERE event_name = 'voice_rerecord') as rerecord_count
      FROM analytics_events
      WHERE timestamp > NOW() - INTERVAL '1 day' * ${days}
    `);

    res.json({
      period_days: days,
      successRate: successRateQuery.rows[0] || {},
      confidence: confidenceQuery.rows[0] || {},
      duration: durationQuery.rows[0] || {},
      editStats: editQuery.rows[0] || {},
      errorBreakdown: errorQuery.rows || [],
      dailyTrends: trendsQuery.rows || [],
      featureUsage: usageQuery.rows[0] || {},
    });
  } catch (err) {
    console.error("[Analytics] Voice analytics error:", err.message);
    res.status(500).json({ error: "Failed to load voice analytics" });
  }
});

/**
 * POST /api/analytics/food-suggestions
 * Get AI-powered food suggestions for nutritional gaps
 * Body: { gaps: [{ key: 'iron', label: 'Iron', percentage: 25 }] }
 */
router.post("/analytics/food-suggestions", async (req, res) => {
  try {
    const { gaps } = req.body;

    if (!gaps || !Array.isArray(gaps) || gaps.length === 0) {
      return res.status(400).json({ error: "No nutritional gaps provided" });
    }

    // Build prompt for OpenAI
    const gapsList = gaps.map(g => `${g.label} (currently at ${g.percentage}% of daily recommended)`).join(', ');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert. Provide concise, practical food suggestions to address nutritional deficiencies. Return only a JSON object with no markdown.'
          },
          {
            role: 'user',
            content: `The user has low intake of these nutrients: ${gapsList}.

For each nutrient, suggest 3-5 common, accessible foods that are rich in that nutrient.

Return JSON format:
{
  "suggestions": {
    "<nutrient_key>": {
      "foods": ["food1", "food2", "food3"],
      "tip": "Brief dietary tip"
    }
  }
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON from response
    let suggestions;
    try {
      suggestions = JSON.parse(content);
    } catch {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse suggestions from response');
      }
    }

    res.json({
      success: true,
      suggestions: suggestions.suggestions || {},
    });

  } catch (err) {
    console.error("[Analytics] Food suggestions error:", err.message);

    // Return fallback static suggestions on error
    const fallbackSuggestions = {
      iron: { foods: ['spinach', 'lentils', 'red meat', 'fortified cereals'], tip: 'Pair with vitamin C for better absorption' },
      calcium: { foods: ['dairy', 'leafy greens', 'fortified plant milk', 'sardines'], tip: 'Spread intake throughout the day' },
      vitamin_d: { foods: ['fatty fish', 'eggs', 'fortified milk', 'mushrooms'], tip: 'Sun exposure also helps' },
      vitamin_c: { foods: ['citrus fruits', 'bell peppers', 'strawberries', 'broccoli'], tip: 'Eat raw when possible' },
      potassium: { foods: ['bananas', 'potatoes', 'avocado', 'spinach'], tip: 'Most fruits and vegetables contain potassium' },
      magnesium: { foods: ['nuts', 'seeds', 'whole grains', 'dark chocolate'], tip: 'Leafy greens are also good sources' },
      zinc: { foods: ['meat', 'shellfish', 'legumes', 'pumpkin seeds'], tip: 'Animal sources are more bioavailable' },
      fiber: { foods: ['whole grains', 'vegetables', 'legumes', 'fruits'], tip: 'Increase gradually with water' },
      vitamin_a: { foods: ['carrots', 'sweet potato', 'leafy greens', 'eggs'], tip: 'Fat helps absorption' },
      vitamin_b12: { foods: ['meat', 'fish', 'dairy', 'fortified foods'], tip: 'Consider supplements if vegan' },
    };

    res.json({
      success: true,
      suggestions: fallbackSuggestions,
      fallback: true,
    });
  }
});

export default router;
