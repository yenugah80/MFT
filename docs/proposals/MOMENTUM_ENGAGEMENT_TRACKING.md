# Momentum Card Engagement Tracking Architecture

## Problem Statement

The MomentumCard currently operates as a "fire and forget" component. We show motivational highlights but have **zero visibility** into:

1. Which highlight types resonate with users
2. Whether users engage with or dismiss the card
3. If the card drives meaningful behavior change
4. How to personalize the experience per user

Without this data, we cannot:
- Optimize message selection
- A/B test new highlight variants
- Build ML-driven personalization
- Measure ROI of the feature

## Goals

1. **Track engagement signals** - views, taps, dismissals, dwell time
2. **Enable learning loop** - identify which highlights drive action
3. **Build personalization foundation** - per-user affinity scores
4. **Measure behavior impact** - does seeing card lead to logging?

## Non-Goals

- Real-time ML inference (future phase)
- Cross-device tracking
- Third-party analytics integration

---

## Proposed Architecture

### Data Model

```sql
-- New table: momentum_card_events
CREATE TABLE momentum_card_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(clerk_id),

  -- Card identification
  card_session_id UUID NOT NULL,        -- Unique per card render
  highlight_type TEXT NOT NULL,          -- 'streak_milestone', 'consistency_win', etc.
  highlight_value TEXT,                  -- The actual value shown (e.g., "7" for streak)

  -- Event tracking
  event_type TEXT NOT NULL,              -- 'impression', 'cta_tap', 'dismiss', 'dwell'
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  decision_type TEXT,                    -- Orchestrator decision: 'REINFORCE', 'SPEAK', etc.
  metrics_snapshot JSONB,                -- Frozen metrics at time of display

  -- Engagement metrics
  dwell_time_ms INTEGER,                 -- Time card was visible before action
  dismiss_direction TEXT,                -- 'left', 'right', or null

  -- Attribution
  subsequent_action TEXT,                -- 'logged_meal', 'logged_water', 'opened_insights', null
  subsequent_action_within_minutes INTEGER,

  -- Device context
  timezone_offset INTEGER,
  hour_of_day INTEGER,                   -- 0-23, local time
  day_of_week INTEGER,                   -- 0=Sunday, 6=Saturday

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user-specific queries
CREATE INDEX idx_momentum_events_user ON momentum_card_events(user_id, event_timestamp);

-- Index for highlight type analysis
CREATE INDEX idx_momentum_events_type ON momentum_card_events(highlight_type, event_type);
```

### Derived Analytics Table

```sql
-- Aggregated per-user affinities (updated daily by job)
CREATE TABLE user_highlight_affinities (
  user_id TEXT NOT NULL REFERENCES users(clerk_id),
  highlight_type TEXT NOT NULL,

  -- Engagement metrics
  total_impressions INTEGER DEFAULT 0,
  total_cta_taps INTEGER DEFAULT 0,
  total_dismissals INTEGER DEFAULT 0,
  avg_dwell_time_ms INTEGER,

  -- Derived scores
  engagement_rate DECIMAL(5,4),          -- cta_taps / impressions
  dismiss_rate DECIMAL(5,4),             -- dismissals / impressions
  affinity_score DECIMAL(5,4),           -- Composite score (0-1)

  -- Attribution
  actions_within_10min INTEGER DEFAULT 0, -- Subsequent logs after seeing card

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, highlight_type)
);
```

---

## API Contracts

### POST /api/momentum/event

Track a momentum card event.

```typescript
// Request
interface MomentumEventRequest {
  cardSessionId: string;        // UUID generated when card renders
  highlightType: string;        // From HIGHLIGHT_TYPES enum
  highlightValue?: string;      // The displayed value
  eventType: 'impression' | 'cta_tap' | 'dismiss' | 'dwell_end';

  // Optional context
  dwellTimeMs?: number;         // For 'dwell_end' events
  dismissDirection?: 'left' | 'right';
  metricsSnapshot?: {
    streak: number;
    level: number;
    hydrationProgress: number;
    calorieProgress: number;
  };
}

// Response
interface MomentumEventResponse {
  success: boolean;
  eventId?: number;
}
```

### GET /api/momentum/affinity

Get user's highlight type affinities (for personalized selection).

```typescript
// Response
interface UserAffinityResponse {
  affinities: {
    highlightType: string;
    affinityScore: number;      // 0-1, higher = more engaged
    impressions: number;
    engagementRate: number;
  }[];

  // Recommendation
  preferredTypes: string[];     // Ordered by affinity
  avoidTypes: string[];         // High dismiss rate
}
```

---

## Client Integration

### 1. Event Tracking Hook

```javascript
// mobile/hooks/useMomentumTracking.js

import { useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import apiClient from '../services/apiClient';
import { generateUUID } from '../utils/uuid';

export function useMomentumTracking(highlightType, highlightValue, metricsSnapshot) {
  const cardSessionId = useRef(generateUUID());
  const impressionTime = useRef(Date.now());
  const hasTrackedImpression = useRef(false);

  // Track impression on mount
  useEffect(() => {
    if (!hasTrackedImpression.current) {
      trackEvent('impression');
      hasTrackedImpression.current = true;
    }
  }, []);

  // Track dwell time when app backgrounds or card unmounts
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        trackDwellEnd();
      }
    });

    return () => {
      subscription.remove();
      trackDwellEnd();
    };
  }, []);

  const trackEvent = useCallback(async (eventType, extra = {}) => {
    try {
      await apiClient.post('/momentum/event', {
        cardSessionId: cardSessionId.current,
        highlightType,
        highlightValue,
        eventType,
        metricsSnapshot,
        ...extra,
      });
    } catch (e) {
      // Silent fail - don't disrupt UX for analytics
      console.debug('[MomentumTracking] Failed to track:', e.message);
    }
  }, [highlightType, highlightValue, metricsSnapshot]);

  const trackDwellEnd = useCallback(() => {
    const dwellTimeMs = Date.now() - impressionTime.current;
    if (dwellTimeMs > 500) { // Only track meaningful dwell
      trackEvent('dwell_end', { dwellTimeMs });
    }
  }, [trackEvent]);

  const trackCTATap = useCallback(() => {
    trackEvent('cta_tap', {
      dwellTimeMs: Date.now() - impressionTime.current,
    });
  }, [trackEvent]);

  const trackDismiss = useCallback((direction) => {
    trackEvent('dismiss', {
      dwellTimeMs: Date.now() - impressionTime.current,
      dismissDirection: direction,
    });
  }, [trackEvent]);

  return {
    trackCTATap,
    trackDismiss,
  };
}
```

### 2. Integration in MomentumCard

```javascript
// In MomentumCard.jsx

import { useMomentumTracking } from '../../../hooks/useMomentumTracking';

export default function MomentumCard({ highlight, metrics, onDismiss, onViewProgress }) {
  const { trackCTATap, trackDismiss } = useMomentumTracking(
    highlight.type,
    String(highlight.value),
    metrics
  );

  const handleViewProgress = useCallback(() => {
    trackCTATap();
    onViewProgress?.();
  }, [trackCTATap, onViewProgress]);

  const handleDismiss = useCallback((direction) => {
    trackDismiss(direction);
    onDismiss?.();
  }, [trackDismiss, onDismiss]);

  // ... rest of component
}
```

---

## Attribution Logic

### Subsequent Action Detection

Track if user takes action within N minutes of seeing card:

```javascript
// Backend job or real-time check

async function checkSubsequentAction(userId, cardSessionId, eventTimestamp) {
  const WINDOW_MINUTES = 10;

  // Check for food/water logs within window
  const subsequentLogs = await db.query(`
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM food_log WHERE user_id = $1 AND created_at BETWEEN $2 AND $2 + INTERVAL '${WINDOW_MINUTES} minutes') THEN 'logged_meal'
        WHEN EXISTS (SELECT 1 FROM water_log WHERE user_id = $1 AND created_at BETWEEN $2 AND $2 + INTERVAL '${WINDOW_MINUTES} minutes') THEN 'logged_water'
        ELSE NULL
      END as action
  `, [userId, eventTimestamp]);

  if (subsequentLogs.action) {
    await db.query(`
      UPDATE momentum_card_events
      SET subsequent_action = $1, subsequent_action_within_minutes = $2
      WHERE card_session_id = $3
    `, [subsequentLogs.action, WINDOW_MINUTES, cardSessionId]);
  }
}
```

---

## Analytics Queries

### 1. Highlight Type Performance

```sql
-- Which highlight types drive engagement?
SELECT
  highlight_type,
  COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
  COUNT(*) FILTER (WHERE event_type = 'cta_tap') as cta_taps,
  COUNT(*) FILTER (WHERE event_type = 'dismiss') as dismissals,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'cta_tap')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0),
    4
  ) as engagement_rate,
  AVG(dwell_time_ms) FILTER (WHERE dwell_time_ms IS NOT NULL) as avg_dwell_ms
FROM momentum_card_events
WHERE event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY highlight_type
ORDER BY engagement_rate DESC;
```

### 2. Time-of-Day Optimization

```sql
-- When do users engage most?
SELECT
  hour_of_day,
  COUNT(*) FILTER (WHERE event_type = 'cta_tap') as taps,
  COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'cta_tap')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0),
    4
  ) as engagement_rate
FROM momentum_card_events
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

### 3. Attribution Impact

```sql
-- Does seeing MomentumCard lead to logging?
SELECT
  CASE WHEN subsequent_action IS NOT NULL THEN 'Took Action' ELSE 'No Action' END as outcome,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (), 4) as percentage
FROM momentum_card_events
WHERE event_type = 'impression'
GROUP BY outcome;
```

---

## Personalization Integration

### Using Affinities in MomentumEngine

```javascript
// Updated selectHighlight with personalization

export async function selectHighlight(metrics, userId) {
  const highlights = detectAllHighlights(metrics);

  if (highlights.length === 0) return getFallbackHighlight();

  // Fetch user affinities
  let affinities = {};
  try {
    const response = await apiClient.get('/momentum/affinity');
    affinities = response.affinities.reduce((acc, a) => {
      acc[a.highlightType] = a.affinityScore;
      return acc;
    }, {});
  } catch (e) {
    // Fall back to priority-based selection
  }

  // Score each highlight: base priority + affinity bonus
  const scored = highlights.map(h => ({
    ...h,
    finalScore: h.priority + (affinities[h.type] || 0.5) * 20,
  }));

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored[0];
}
```

---

## Rollout Plan

### Phase 1: Instrumentation (Week 1)
- [ ] Create database tables
- [ ] Implement `/momentum/event` endpoint
- [ ] Add `useMomentumTracking` hook
- [ ] Integrate tracking in MomentumCard

### Phase 2: Data Collection (Weeks 2-3)
- [ ] Deploy and collect baseline data
- [ ] Build analytics dashboard
- [ ] Monitor event volume and quality

### Phase 3: Insights & Optimization (Week 4+)
- [ ] Analyze highlight type performance
- [ ] Implement affinity calculation job
- [ ] A/B test personalized selection
- [ ] Iterate on underperforming highlights

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| CTA engagement rate | Unknown | >15% |
| Dismiss rate | Unknown | <40% |
| Avg dwell time | Unknown | >3 seconds |
| Attribution rate (action within 10min) | Unknown | >25% |

---

## Open Questions

1. **Privacy**: Should we allow users to opt out of engagement tracking?
2. **Data retention**: How long to keep raw events vs aggregates?
3. **Offline support**: Buffer events locally when offline?
4. **A/B framework**: Build custom or use existing?

---

## Appendix: Event Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  MomentumCard   │────▶│ useMomentumTrack │────▶│ POST /momentum/ │
│    renders      │     │    (hook)        │     │     event       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
        ┌─────────────────────────────────────────────────┘
        ▼
┌───────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ momentum_card_    │────▶│ Daily Affinity   │────▶│ user_highlight_ │
│    events         │     │   Calculation    │     │   affinities    │
└───────────────────┘     └──────────────────┘     └────────┬────────┘
                                                            │
        ┌───────────────────────────────────────────────────┘
        ▼
┌───────────────────┐     ┌──────────────────┐
│ GET /momentum/    │────▶│  selectHighlight │
│    affinity       │     │  (personalized)  │
└───────────────────┘     └──────────────────┘
```
