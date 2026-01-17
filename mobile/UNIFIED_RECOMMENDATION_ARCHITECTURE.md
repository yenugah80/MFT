# Unified Recommendation System Architecture

## Problem Statement

Current state: The app has a sophisticated backend with correlations, predictions, and AI recommendations, but the frontend presents this in a fragmented way across multiple screens. Users see:
- "Tips" on one screen
- "Insights" on another
- "Recommendations" elsewhere
- No clear understanding of what to prioritize

**User question**: "What does user understand after seeing all these screens?"
**Answer**: Not much - the information is disconnected.

---

## Design Principles (Senior ML Architect Approach)

### 1. Single Source of Truth
One unified wellness score that users can understand immediately.

### 2. Hierarchical Information Architecture
```
Level 1: Overall Wellness Score (single number: 0-100)
    └── Level 2: Domain Breakdown (Food: 75, Hydration: 60, Mood: 80)
        └── Level 3: Key Correlations (what's affecting what)
            └── Level 4: Actionable Recommendations (prioritized)
```

### 3. Consistent Insight Format (SWPA Framework)
Every insight follows this structure:
- **Status**: Current state (e.g., "Carbs at 254%")
- **Why**: Pattern/correlation (e.g., "High carbs correlate with afternoon energy dips")
- **Priority**: Impact level (High/Medium/Low)
- **Action**: Specific recommendation (e.g., "Balance lunch with protein-rich foods")

### 4. Progressive Disclosure
- Show the most important 1-3 insights prominently
- Allow drill-down for details
- Never overwhelm with all data at once

---

## Unified Insight Card Component

```jsx
/**
 * UnifiedInsightCard - Standard format for ALL insights
 *
 * Props:
 * - domain: 'nutrition' | 'hydration' | 'activity' | 'mood' | 'cross-domain'
 * - status: { value, unit, label, isOver?, trend? }
 * - correlation?: { pattern, confidence, evidence }
 * - priority: 'high' | 'medium' | 'low'
 * - action: { text, onPress }
 * - expanded?: boolean
 */

// Example usage:
<UnifiedInsightCard
  domain="nutrition"
  status={{
    value: 254,
    unit: "%",
    label: "Carbs",
    isOver: true,
    trend: "up" // or "down", "stable"
  }}
  correlation={{
    pattern: "High carb days correlate with afternoon energy dips",
    confidence: 0.72,
    evidence: "Seen in 5 of last 7 days"
  }}
  priority="high"
  action={{
    text: "Balance with protein at lunch",
    onPress: () => navigateToMealSuggestions()
  }}
/>
```

---

## Unified Wellness Score Calculation

```javascript
/**
 * Calculate unified wellness score from all domains
 *
 * Components:
 * - Nutrition Balance (25%): How close are macros to goals?
 * - Hydration Level (20%): Water intake vs goal
 * - Mood Stability (20%): Mood trend and consistency
 * - Activity Level (15%): Steps/exercise vs goal
 * - Pattern Compliance (20%): Following positive correlations
 */

function calculateWellnessScore(data) {
  const {
    nutritionProgress,  // 0-100 (balance score from food analytics)
    hydrationProgress,  // 0-100 (% of water goal)
    moodScore,          // 0-100 (from mood tracking)
    activityProgress,   // 0-100 (% of activity goal)
    correlationCompliance, // 0-100 (following known good patterns)
  } = data;

  // Weighted average with domain-specific weights
  const score = (
    nutritionProgress * 0.25 +
    hydrationProgress * 0.20 +
    moodScore * 0.20 +
    activityProgress * 0.15 +
    correlationCompliance * 0.20
  );

  return {
    overall: Math.round(score),
    breakdown: {
      nutrition: nutritionProgress,
      hydration: hydrationProgress,
      mood: moodScore,
      activity: activityProgress,
      patterns: correlationCompliance,
    },
    status: getWellnessStatus(score),
    trend: calculateTrend(score, previousScores),
  };
}

function getWellnessStatus(score) {
  if (score >= 85) return { label: 'Excellent', color: '#10B981', icon: 'star' };
  if (score >= 70) return { label: 'Good', color: '#84CC16', icon: 'checkmark-circle' };
  if (score >= 50) return { label: 'Fair', color: '#F59E0B', icon: 'alert-circle' };
  return { label: 'Needs Focus', color: '#EF4444', icon: 'warning' };
}
```

---

## Priority-Based Insight Ranking

```javascript
/**
 * Rank insights by actionability and impact
 *
 * Ranking factors:
 * 1. Deviation from goal (higher = more urgent)
 * 2. Correlation confidence (higher = more reliable)
 * 3. Time sensitivity (immediate action needed?)
 * 4. User lifecycle stage (show simpler insights to new users)
 */

function rankInsights(insights, userLifecycle) {
  return insights
    .map(insight => ({
      ...insight,
      priorityScore: calculatePriorityScore(insight, userLifecycle),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function calculatePriorityScore(insight, lifecycle) {
  const deviationScore = insight.deviation > 50 ? 30 : insight.deviation * 0.6;
  const confidenceScore = insight.confidence * 25;
  const timeSensitivity = insight.isUrgent ? 20 : 0;
  const lifecycleBonus = getLifecycleBonus(insight.complexity, lifecycle);

  return deviationScore + confidenceScore + timeSensitivity + lifecycleBonus;
}

function getLifecycleBonus(complexity, stage) {
  // New users should see simpler insights
  const complexityThresholds = {
    ONBOARDING: 1,    // Only simple insights
    BEGINNER: 2,      // Simple + medium
    INTERMEDIATE: 3,  // All insights
    MASTER: 4,        // All + advanced
    ELITE: 5,         // All + predictions
  };

  return complexity <= complexityThresholds[stage] ? 10 : -20;
}
```

---

## Unified Insights Screen Layout

```
┌─────────────────────────────────────────────────┐
│  WELLNESS SCORE                                 │
│  ┌───────────────────────────────────────────┐  │
│  │      ╭──────────────────╮                 │  │
│  │      │       78         │  Good           │  │
│  │      │    ▲ +3 today    │                 │  │
│  │      ╰──────────────────╯                 │  │
│  │                                           │  │
│  │  [Food 75%] [Water 60%] [Mood 88%] [Act 80%]│
│  └───────────────────────────────────────────┘  │
│                                                 │
│  TODAY'S PRIORITIES                             │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔴 HIGH: Carbs at 254%                    │  │
│  │    Pattern: High carbs → afternoon crash  │  │
│  │    Action: [Balance with protein lunch]   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 🟡 MEDIUM: Water intake behind            │  │
│  │    Current: 1.2L / 2.5L goal             │  │
│  │    Action: [Set reminder for 3pm]        │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  CORRELATIONS AFFECTING YOU                     │
│  ┌───────────────────────────────────────────┐  │
│  │ Food → Mood (72% confidence)              │  │
│  │ "Protein-rich breakfasts linked to       │  │
│  │  stable morning energy"                   │  │
│  │ Evidence: 5/7 days this week             │  │
│  │ [Learn more]                              │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  DETAILED ANALYTICS                             │
│  [Food] [Hydration] [Activity] [Mood]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Unified Insight Card Component
- Create `UnifiedInsightCard.jsx` with SWPA format
- Create `WellnessScoreCard.jsx` with domain breakdown
- Add priority color coding and icons

### Phase 2: Insight Ranking Service
- Create `useUnifiedInsights.js` hook that:
  - Fetches from all existing hooks (useInsights, useOrchestrator, etc.)
  - Calculates unified wellness score
  - Ranks insights by priority
  - Returns top 3 for dashboard display

### Phase 3: Unified Insights Hub
- Redesign `insights/index.jsx` to show:
  - Wellness score prominently
  - Top 3 prioritized insights
  - Domain breakdown (expandable)
  - Detailed analytics navigation

### Phase 4: Cross-Domain Correlation View
- Create visualization showing how domains connect
- "Your carbs → Your mood → Your energy" flow diagram
- Evidence-based connections with confidence indicators

### Phase 5: Consistent Terminology
Replace scattered terminology with unified language:
- "Tip" → "Quick Win" (actionable, immediate)
- "Insight" → "Pattern" (correlation-based)
- "Recommendation" → "Action" (specific next step)
- "Analytics" → "Details" (drill-down data)

---

## File Structure

```
mobile/
├── components/
│   └── insights/
│       ├── UnifiedInsightCard.jsx      # SWPA format insight
│       ├── WellnessScoreCard.jsx       # Main score with breakdown
│       ├── PriorityBadge.jsx           # High/Medium/Low indicator
│       ├── CorrelationFlow.jsx         # Visual domain connections
│       └── DomainBreakdown.jsx         # Expandable domain scores
│
├── hooks/
│   └── useUnifiedInsights.js           # Aggregates all insight sources
│
├── utils/
│   └── insightRanking.js               # Priority calculation logic
│
└── app/
    └── insights/
        └── index.jsx                    # Redesigned unified hub
```

---

## Migration Strategy

1. **Keep existing screens** - don't break what works
2. **Add unified layer on top** - new components, new hub
3. **Deprecate gradually** - once unified view is stable, redirect users
4. **A/B test** - track engagement on unified vs. fragmented views

---

## Success Metrics

1. **Time to Understanding**: How long before user takes action?
   - Target: < 10 seconds to see top priority

2. **Action Rate**: % of insights that lead to user action
   - Target: > 40% of high-priority insights acted upon

3. **Score Improvement**: Does wellness score improve over time?
   - Target: 5+ point improvement per month for active users

4. **Reduced Confusion**: User feedback on clarity
   - Target: > 80% rate insights as "clear and actionable"
