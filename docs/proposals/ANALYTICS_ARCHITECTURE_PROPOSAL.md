# Analytics Experience Architecture Proposal

**Document Type:** Design Proposal
**Author:** Principal Creative Designer
**Date:** January 2026
**Status:** DRAFT - Pending Approval
**Stakeholders:** Product, Engineering, Design

---

## Executive Summary

This proposal outlines a comprehensive redesign of the Analytics & Insights experience across Mood, Activity, and Hydration tracking. The current implementation suffers from architectural fragmentation, inconsistent user experiences, and duplicated code patterns that hinder both user comprehension and engineering velocity.

**Recommendation:** Approve a phased refactoring initiative to establish a unified Analytics Design System with shared components, consistent data patterns, and a cohesive user experience.

**Estimated Impact:**
- 40% reduction in analytics-related code
- Consistent UX across all wellness categories
- Faster feature iteration (new analytics screens in days, not weeks)
- Improved user engagement through predictable, learnable patterns

---

## Problem Statement

### Current State Analysis

| Dimension | Current State | Impact |
|-----------|---------------|--------|
| **Architecture** | 3 separate implementations with no shared patterns | 2,800+ lines of duplicated logic |
| **User Experience** | Each category looks/feels different | Users must relearn navigation patterns |
| **Data Layer** | Inconsistent hooks and data structures | Difficult to add cross-category insights |
| **Component Reuse** | 0% - Each screen reinvents UI patterns | Slow development, inconsistent styling |
| **Maintainability** | Single 1000+ line files | High bug risk, difficult onboarding |

### Evidence of Fragmentation

```
Current File Structure:
├── /insights/mood.jsx           → 1,077 lines (monolithic)
├── /(tabs)/activity.jsx         → 1,063 lines (mixed concerns)
├── /components/ActivityInsightsView.jsx → 651 lines (isolated)
├── /activity/today.jsx          → 605 lines (generic timeline)
└── /components/analytics/       → Orphaned, unused components
    ├── MoodTab.jsx              → Not connected
    ├── ActivityTab.jsx          → Not connected
    └── HydrationTab.jsx         → Not connected
```

### User Journey Gaps

```
Dashboard Card → "View Insights" → /analytics (Intelligence AI)
                                   ↓
                     User expects: Category-specific history
                     User gets:    AI patterns (different mental model)
```

---

## Proposed Solution

### Design Principles

1. **Consistency Over Novelty** - Same patterns across all categories
2. **Progressive Disclosure** - Summary → Details → Deep Dive
3. **Component-First** - Build blocks, compose screens
4. **Data-Driven** - Unified hooks power all visualizations

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS DESIGN SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    MOOD     │  │  ACTIVITY   │  │  HYDRATION  │   Screens    │
│  │   Screen    │  │   Screen    │  │   Screen    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              ANALYTICS SCREEN TEMPLATE                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  HeroSection (category-aware)                       │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │  MetricsRow (3 MetricCards)                         │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │  TrendSection (WeeklyChart + TrendBadge)            │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │  InsightsSection (DiscoveryCards)                   │  │  │
│  │  ├─────────────────────────────────────────────────────┤  │  │
│  │  │  ActionsSection (QuickActionGrid)                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SHARED COMPONENT LIBRARY                      │  │
│  │                                                            │  │
│  │  ProgressRing    TrendBarChart    MetricCard    StreakCard │  │
│  │  InsightCard     WeeklyJourney    ActionButton  EmptyState │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   DATA LAYER                               │  │
│  │                                                            │  │
│  │  useAnalytics(category, period)  →  Unified data fetching │  │
│  │  useTrends(category)             →  7-day calculations    │  │
│  │  useInsights(category)           →  AI-generated insights │  │
│  │  useStreak(category)             →  Streak calculations   │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Screen Layout Specification

Each analytics screen follows identical structure with category-specific content:

```
┌────────────────────────────────────────┐
│  ← Back              [Category]    ⋮   │  Header
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │         HERO SECTION               │ │
│ │  ┌──────────┐                      │ │
│ │  │  Score   │  Category Name       │ │
│ │  │   Ring   │  Current Status      │ │
│ │  │   7.2    │  "Feeling Good"      │ │
│ │  └──────────┘                      │ │
│ │       Streak: 5 days | Trend: ↑    │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │ Avg  │  │ Peak │  │ Days │         │  Metrics Row
│  │ 7.2  │  │  9   │  │  5   │         │
│  └──────┘  └──────┘  └──────┘         │
├────────────────────────────────────────┤
│  This Week                    +12% ↑  │
│  ┌──┬──┬──┬──┬──┬──┬──┐              │  Trend Section
│  │▓▓│▓▓│░░│▓▓│▓▓│▓▓│▓▓│              │
│  │Mo│Tu│We│Th│Fr│Sa│Su│              │
│  └──┴──┴──┴──┴──┴──┴──┘              │
├────────────────────────────────────────┤
│  Discoveries                     (3)  │
│  ┌────────────────────────────────┐   │  Insights Section
│  │ 🍎 Nutrition Impact    +15%   │   │
│  │ Good meals boost your mood    │   │
│  └────────────────────────────────┘   │
│  ┌────────────────────────────────┐   │
│  │ 💧 Hydration Pattern   -8%    │   │
│  │ Low water affects energy      │   │
│  └────────────────────────────────┘   │
├────────────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐      │  Actions
│  │Log │  │Meal│  │Water│ │More│      │
│  └────┘  └────┘  └────┘  └────┘      │
└────────────────────────────────────────┘
```

---

## Component Specifications

### 1. ProgressRing

**Purpose:** Universal score/progress visualization
**Used By:** All analytics screens, dashboard cards

```
Props:
  - score: number (0-100 or 0-10)
  - maxScore: number (default: 100)
  - size: 'sm' | 'md' | 'lg' | 'xl'
  - category: 'mood' | 'activity' | 'hydration' | 'nutrition'
  - showLabel: boolean
  - animated: boolean

Behavior:
  - Color derived from category theme
  - Animated fill on mount
  - Accessible labels
```

### 2. MetricCard

**Purpose:** Consistent stat display
**Used By:** Metrics row in all screens

```
Props:
  - value: string | number
  - label: string
  - sublabel?: string
  - icon: string
  - trend?: 'up' | 'down' | 'stable'
  - color?: string (defaults to category)

Variants:
  - compact: Dashboard use
  - standard: Analytics screens
  - expanded: Detail views
```

### 3. TrendBarChart

**Purpose:** 7-day trend visualization
**Used By:** Trend section in all screens

```
Props:
  - data: Array<{ day: string, value: number, isToday: boolean }>
  - category: 'mood' | 'activity' | 'hydration'
  - height: number
  - showValues: boolean
  - onDayPress?: (day) => void

Features:
  - Today highlighted
  - Color-coded by value thresholds
  - Animated bars on mount
  - Optional tap for day details
```

### 4. InsightCard

**Purpose:** AI-generated discovery display
**Used By:** Insights section in all screens

```
Props:
  - trigger: string ("Good nutrition")
  - impact: string ("+15%")
  - impactType: 'positive' | 'negative' | 'neutral'
  - description: string
  - icon: string
  - onAction?: () => void
  - actionLabel?: string

Behavior:
  - Color-coded by impact type
  - Optional action button
  - Expandable for details
```

### 5. StreakDisplay

**Purpose:** Streak visualization
**Used By:** Hero section, gamification

```
Props:
  - current: number
  - best: number
  - category: string
  - showFlame: boolean

Variants:
  - inline: "🔥 5 day streak"
  - card: Full streak card with best
  - badge: Compact for headers
```

---

## Data Architecture

### Unified Analytics Hook

```typescript
// hooks/analytics/useAnalytics.ts

interface AnalyticsData {
  summary: {
    currentScore: number;
    averageScore: number;
    peakScore: number;
    totalEntries: number;
  };
  trend: {
    days: DayData[];
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
    thisWeekTotal: number;
    lastWeekTotal: number;
  };
  streak: {
    current: number;
    best: number;
    lastActiveDate: string;
  };
  insights: Insight[];
  goals: {
    daily: number;
    weekly: number;
    progress: number;
  };
}

function useAnalytics(
  category: 'mood' | 'activity' | 'hydration' | 'nutrition',
  period: 'today' | 'week' | 'month' = 'week'
): {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### Category-Specific Extensions

```typescript
// Each category extends base with specific fields

interface MoodAnalytics extends AnalyticsData {
  dominantMood: MoodType;
  moodDistribution: Record<MoodType, number>;
  energyCorrelation: number;
}

interface ActivityAnalytics extends AnalyticsData {
  caloriesBurned: number;
  topExercises: Exercise[];
  cdcGoalProgress: number;
  categoryBreakdown: Record<string, number>;
}

interface HydrationAnalytics extends AnalyticsData {
  totalMl: number;
  glassesCount: number;
  goalMl: number;
  hydrationByHour: number[];
}
```

---

## File Structure

```
mobile/
├── components/
│   └── analytics/
│       ├── core/                      # Atomic components
│       │   ├── ProgressRing.jsx
│       │   ├── MetricCard.jsx
│       │   ├── TrendBarChart.jsx
│       │   ├── InsightCard.jsx
│       │   ├── StreakDisplay.jsx
│       │   ├── WeeklyJourney.jsx
│       │   ├── ActionButton.jsx
│       │   ├── EmptyState.jsx
│       │   └── index.js              # Barrel export
│       │
│       ├── sections/                  # Composite sections
│       │   ├── HeroSection.jsx
│       │   ├── MetricsRow.jsx
│       │   ├── TrendSection.jsx
│       │   ├── InsightsSection.jsx
│       │   ├── ActionsSection.jsx
│       │   └── index.js
│       │
│       ├── layouts/                   # Screen templates
│       │   └── AnalyticsScreenLayout.jsx
│       │
│       └── screens/                   # Category implementations
│           ├── MoodAnalytics.jsx
│           ├── ActivityAnalytics.jsx
│           └── HydrationAnalytics.jsx
│
├── hooks/
│   └── analytics/
│       ├── useAnalytics.js           # Unified data hook
│       ├── useMoodAnalytics.js       # Category extension
│       ├── useActivityAnalytics.js
│       ├── useHydrationAnalytics.js
│       ├── useTrendCalculations.js   # Shared calculations
│       └── useInsightsGenerator.js   # AI insights
│
├── constants/
│   └── analytics/
│       ├── colors.js                 # Category color palettes
│       ├── thresholds.js             # Score thresholds
│       └── config.js                 # Chart configs
│
└── app/
    └── insights/
        ├── _layout.jsx
        ├── mood.jsx                  # Thin wrapper
        ├── activity.jsx              # Thin wrapper
        └── hydration.jsx             # Thin wrapper (NEW)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Build shared component library

- [ ] Create `/components/analytics/core/` structure
- [ ] Implement ProgressRing with all variants
- [ ] Implement MetricCard with all variants
- [ ] Implement TrendBarChart
- [ ] Implement InsightCard
- [ ] Implement StreakDisplay
- [ ] Create barrel exports and documentation

**Deliverable:** Storybook/demo screen showcasing all components

### Phase 2: Data Layer (Week 2-3)
**Goal:** Unified analytics hooks

- [ ] Create `useAnalytics` base hook
- [ ] Implement category-specific extensions
- [ ] Migrate existing data fetching
- [ ] Add caching and optimistic updates
- [ ] Unit tests for calculations

**Deliverable:** All analytics screens powered by new hooks

### Phase 3: Screen Composition (Week 3-4)
**Goal:** Rebuild screens with shared components

- [ ] Create AnalyticsScreenLayout template
- [ ] Rebuild MoodAnalytics screen
- [ ] Rebuild ActivityAnalytics screen
- [ ] Create HydrationAnalytics screen (NEW)
- [ ] Fix navigation from dashboard cards

**Deliverable:** All 3 analytics screens live with consistent UX

### Phase 4: Polish & Integration (Week 4-5)
**Goal:** Refinement and cross-category features

- [ ] Add animations and micro-interactions
- [ ] Implement cross-category insights
- [ ] Add period selector (Today/Week/Month)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Delete deprecated files

**Deliverable:** Production-ready analytics experience

---

## Success Metrics

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Code lines (analytics) | ~3,400 | ~2,000 | Shared components |
| Time to add new analytics screen | 2-3 weeks | 2-3 days | Template + hooks |
| UI consistency score | 40% | 95% | Design audit |
| Component reuse rate | 0% | 80% | Code analysis |
| User task completion (find weekly trend) | Unknown | <10 sec | Usability testing |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | Medium | High | Strict phase gates, MVP-first |
| Breaking existing functionality | Medium | High | Feature flags, parallel deployment |
| Performance regression | Low | Medium | Benchmark before/after |
| Design debt from rushed delivery | Medium | Medium | Component review gates |

---

## Appendix

### A. Current vs Proposed Comparison

**Current Mood Screen (excerpt):**
```javascript
// 1077 lines, inline everything
function MoodRing({ score, size = 80 }) {
  // 50 lines of SVG rendering
}
function MiniStatCard({ icon, value }) {
  // 30 lines duplicated pattern
}
// ... 900 more lines of mixed concerns
```

**Proposed Mood Screen:**
```javascript
// ~50 lines, composition only
import { AnalyticsScreenLayout } from '@/components/analytics/layouts';
import { HeroSection, MetricsRow, TrendSection, InsightsSection } from '@/components/analytics/sections';
import { useMoodAnalytics } from '@/hooks/analytics';

export default function MoodAnalyticsScreen() {
  const { data, isLoading } = useMoodAnalytics('week');

  return (
    <AnalyticsScreenLayout
      category="mood"
      isLoading={isLoading}
    >
      <HeroSection
        score={data.summary.currentScore}
        label={data.dominantMood}
        streak={data.streak}
      />
      <MetricsRow metrics={[
        { label: 'Average', value: data.summary.averageScore },
        { label: 'Peak', value: data.summary.peakScore },
        { label: 'Entries', value: data.summary.totalEntries },
      ]} />
      <TrendSection trend={data.trend} category="mood" />
      <InsightsSection insights={data.insights} />
    </AnalyticsScreenLayout>
  );
}
```

### B. Color System

```javascript
// constants/analytics/colors.js
export const ANALYTICS_COLORS = {
  mood: {
    primary: '#8B5CF6',      // Purple
    gradient: ['#8B5CF6', '#A78BFA'],
    excellent: '#10B981',
    good: '#3B82F6',
    neutral: '#8B5CF6',
    low: '#F59E0B',
    poor: '#EF4444',
  },
  activity: {
    primary: '#F59E0B',      // Amber
    gradient: ['#F59E0B', '#FBBF24'],
    high: '#10B981',
    medium: '#F59E0B',
    low: '#3B82F6',
    rest: '#E2E8F0',
  },
  hydration: {
    primary: '#06B6D4',      // Cyan
    gradient: ['#06B6D4', '#22D3EE'],
    onTrack: '#10B981',
    behind: '#F59E0B',
    critical: '#EF4444',
  },
};
```

---

## Approval

| Role | Name | Decision | Date |
|------|------|----------|------|
| Product Lead | | ☐ Approved ☐ Rejected ☐ Revise | |
| Engineering Lead | | ☐ Approved ☐ Rejected ☐ Revise | |
| Design Lead | | ☐ Approved ☐ Rejected ☐ Revise | |

**Comments:**

---

*Document Version: 1.0*
*Last Updated: January 2026*
