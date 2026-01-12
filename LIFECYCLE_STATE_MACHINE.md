# Lifecycle State Machine
## User progression from onboarding to behavioral mastery

---

## 1. STATE DEFINITIONS

### Stage 1: **DISCOVERER** (Day 0-1)
**Motto**: "Help me understand"

- **Duration**: 0-1 days with logs
- **Characteristics**:
  - First time using the app
  - Exploring features
  - No pattern history
  - High curiosity, variable engagement

- **Data Points**:
  - totalDaysWithLogs = 0-1
  - hasLoggedToday = true (or recently)
  - mealLogCount < 3

- **Recommendation Strategy**:
  - Show basics only (no complex patterns)
  - Celebrate first log (gamification)
  - Educate on what to log next
  - Avoid data overload
  - Language: Simple, encouraging

- **Correlation Depth**: None (insufficient data)
- **Min Confidence**: N/A (no correlations shown)
- **Message Style**: "Great start! Log one more meal to see patterns."

---

### Stage 2: **BUILDER** (Day 2-6)
**Motto**: "Build the habit"

- **Duration**: 2-6 days with logs
- **Characteristics**:
  - Forming logging habits
  - Light patterns emerging
  - First week energy high
  - Vulnerable to drop-off

- **Data Points**:
  - totalDaysWithLogs = 2-6
  - mealLogCount = 3-15
  - loggingStreak = 2+ days

- **Recommendation Strategy**:
  - Show emerging weak signals (confidence >= 0.5)
  - Frame as "early signals" (not conclusions)
  - Encourage consistent logging
  - Light gamification (streaks)
  - Language: Supportive, pattern-focused

- **Correlation Depth**: 24h window only
- **Min Confidence**: 0.5 (with "early signal" caveat)
- **Message Style**: "Early signal: Heavy meals before bed = less restful sleep. See if this happens again."

---

### Stage 3: **TRACKER** (Day 7-29)
**Motto**: "Patterns are real"

- **Duration**: 7-29 days with logs
- **Characteristics**:
  - Habit forming strongly
  - Weekly patterns visible
  - Gained 2-4 weeks of data
  - Beginning to understand themselves

- **Data Points**:
  - totalDaysWithLogs = 7-29
  - hasDataIn2ConsecutiveWeeks = true
  - loggingStreak >= 7 days

- **Recommendation Strategy**:
  - Show 24h and 7d window correlations
  - Min confidence 0.6
  - Frame patterns with "Here's what we've noticed"
  - Show evidence (count of occurrences)
  - Actionable steps (not just observations)
  - Language: Data-informed, pattern-aware

- **Correlation Depth**: 24h + 7d windows
- **Min Confidence**: 0.6 (with evidence count)
- **Message Style**: "Over 7 days we noticed: High-sugar meals → energy crashes 2h later (happened 3 times). Try adding protein."

---

### Stage 4: **OPTIMIZER** (Day 30-89)
**Motto**: "Optimize my health"

- **Duration**: 30-89 days with logs
- **Characteristics**:
  - Logging is automatic
  - Clear monthly patterns
  - Ready for deeper insights
  - Starting to experiment

- **Data Points**:
  - totalDaysWithLogs = 30-89
  - loggingStreak >= 21 days (3 weeks)
  - hasFullMonthData = true

- **Recommendation Strategy**:
  - Show 24h, 7d, 15d, 30d correlations
  - Min confidence 0.65
  - Personalized predictions ("Based on your month, here's what works")
  - Show both positive and negative patterns
  - Multi-signal recommendations (food + hydration + mood)
  - Language: Predictive, personalized, scientific

- **Correlation Depth**: 24h + 7d + 15d + 30d windows
- **Min Confidence**: 0.65
- **Message Style**: "Your month shows: Weekend eating ≠ weekday (more sodium Sunday → Monday sluggishness). Pro tip: Increase hydration Monday morning."

---

### Stage 5: **MASTER** (Day 90-179)
**Motto**: "Health intelligence"

- **Duration**: 90-179 days with logs
- **Characteristics**:
  - 3-6 months of behavioral data
  - Seasonal variations visible
  - Mastered logging
  - Ready for complex recommendations

- **Data Points**:
  - totalDaysWithLogs = 90-179
  - hasDataAcross3Months = true
  - loggingConsistencyScore >= 0.8

- **Recommendation Strategy**:
  - Show all window types (4h, 24h, 7d, 15d, 30d)
  - Min confidence 0.7
  - Predictive insights ("You'll likely feel X tomorrow if you...")
  - Cross-domain correlations (mood + food + activity + sleep)
  - Anticipatory recommendations (prevent before it happens)
  - Language: Predictive, nuanced, preventive

- **Correlation Depth**: All windows (4h, 24h, 7d, 15d, 30d)
- **Min Confidence**: 0.7
- **Message Style**: "Predictive: You have a pattern of low mood on days with <10k steps + high sugar. Tomorrow's planned rest day + cookie: expect mood dip at 3pm. Swap cookies for nuts?"

---

### Stage 6: **CHAMPION** (Day 180-364)
**Motto**: "Behavioral mastery"

- **Duration**: 6-12 months with logs
- **Characteristics**:
  - Year-round consistency (nearly)
  - Seasonal patterns clear
  - Rare logging gaps
  - High self-awareness

- **Data Points**:
  - totalDaysWithLogs = 180-364
  - hasDataAcrossAllSeasons = true (or close)
  - loggingStreak >= 180 days

- **Recommendation Strategy**:
  - Show all correlations with 60d window analysis
  - Min confidence 0.75
  - Multi-month trend analysis
  - Seasonal pattern recognition ("Winter vs summer mood patterns...")
  - Long-term health trajectory ("Your 6-month trend shows...")
  - Language: Sophisticated, anticipatory, preventive

- **Correlation Depth**: All windows including 60d
- **Min Confidence**: 0.75
- **Message Style**: "6-month trend: January–March low mood weeks correlate with <3L/day hydration + indoor-only activity. Spring outdoor activity + hydration → 45% mood uplift. Suggest winter: Indoor gym + extra hydration."

---

### Stage 7: **ELITE** (365+ days)
**Motto**: "Health visionary"

- **Duration**: 365+ days with logs
- **Characteristics**:
  - 1+ year of data
  - Full seasonal cycles
  - Exceptional self-knowledge
  - Can mentor others

- **Data Points**:
  - totalDaysWithLogs >= 365
  - hasYearOfData = true
  - loggingConsistency >= 0.95

- **Recommendation Strategy**:
  - Show all correlations with highest confidence (0.8+)
  - Predictive modeling of personal health trajectory
  - Behavioral interventions (what works for you specifically)
  - Long-term outcome tracking (health impact quantified)
  - Peer comparisons optional (privacy-respecting aggregates)
  - Language: Expert-level, outcome-focused, visionary

- **Correlation Depth**: All windows, all confidence levels
- **Min Confidence**: 0.8
- **Message Style**: "Year-round pattern: Your optimal wellness formula is 8k+ steps + 2.5L+ water + 25g+ protein at breakfast. When all 3 hit: 92% chance of great mood/energy day. Currently tracking 89%. Increase morning protein."

---

## 2. TRANSITION RULES

### Automatic Progression
```javascript
if (totalDaysWithLogs >= threshold) {
  stage = nextStage;
  triggerProgressNotification();
  updateRecommendationDepth();
}
```

### Regression Logic (Optional)
```javascript
// If user stops logging for extended periods
if (daysSinceLastLog > 30 && stage > TRACKER) {
  // Move back one stage to re-engage
  stage = previousStage;
  sendReengagementMessage();
}
```

### Returning User Modifier
```javascript
// If user was CHAMPION but returns after gap
if (stage === CHAMPION && daysSinceLastLog > 14) {
  recomputeStageBasedOnRecentActivity();
  // May drop to TRACKER temporarily
}
```

---

## 3. RECOMMENDATION DEPTH BY STAGE

| Stage | Window Types | Min Conf | Correlations Shown | Message Complexity | Gamification |
|---|---|---|---|---|---|
| DISCOVERER | None | N/A | 0 | Celebration | High |
| BUILDER | 24h | 0.50 | 1-2 | Early signals | High (streaks) |
| TRACKER | 24h, 7d | 0.60 | 2-3 | Patterns + evidence | Medium |
| OPTIMIZER | 24h, 7d, 15d, 30d | 0.65 | 3-5 | Predictive + actionable | Medium |
| MASTER | 4h, 24h, 7d, 15d, 30d | 0.70 | 4-6 | Anticipatory | Low (mastery) |
| CHAMPION | All + 60d | 0.75 | 5-7 | Long-term trend analysis | Low |
| ELITE | All windows, all signals | 0.80+ | 6-8 | Outcome-focused visionary | Minimal |

---

## 4. DATABASE SCHEMA

```javascript
// Add to user profile or new table
export const userLifecycleTable = pgTable(
  "user_lifecycle",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Lifecycle stage
    currentStage: text("current_stage").notNull(), // DISCOVERER, BUILDER, TRACKER, etc.
    stageStartedAt: timestamp("stage_started_at"),

    // Metrics
    totalDaysWithLogs: integer("total_days_with_logs").default(0),
    loggingStreak: integer("logging_streak").default(0),
    loggingConsistencyScore: decimal("logging_consistency_score", { precision: 3, scale: 2 }).default("0"),
    lastLogDate: timestamp("last_log_date"),

    // Flags
    hasFullMonthData: boolean("has_full_month_data").default(false),
    hasDataAcross3Months: boolean("has_data_across_3_months").default(false),
    hasDataAcrossAllSeasons: boolean("has_data_across_all_seasons").default(false),
    hasYearOfData: boolean("has_year_of_data").default(false),

    // Mood baseline (for consistency checks)
    baseMoodAverage: decimal("base_mood_average", { precision: 3, scale: 1 }),
    baseMoodStdDev: decimal("base_mood_std_dev", { precision: 3, scale: 2 }),

    // Behavior flags
    isReturning: boolean("is_returning").default(false),
    daysSinceLastLog: integer("days_since_last_log"),

    // Audit
    lastStageUpdateAt: timestamp("last_stage_update_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdUnique: unique("user_lifecycle_user_id_unique").on(table.userId),
    stageIdx: index("user_lifecycle_stage_idx").on(table.currentStage),
  })
);
```

---

## 5. STAGE DETECTION FUNCTION

```javascript
/**
 * Determine user's lifecycle stage based on logging history
 */
export function determineLifecycleStage(userMetrics) {
  const {
    totalDaysWithLogs,
    loggingStreak,
    hasFullMonthData,
    hasDataAcross3Months,
    hasDataAcrossAllSeasons,
    hasYearOfData,
    loggingConsistencyScore,
    daysSinceLastLog,
  } = userMetrics;

  // Elite: 365+ days consistent data
  if (hasYearOfData && loggingConsistencyScore >= 0.95) {
    return {
      stage: 'ELITE',
      minConfidence: 0.80,
      windowTypes: ['4h', '24h', '7d', '15d', '30d', '60d'],
      correlationsToShow: 6,
    };
  }

  // Champion: 180+ days, clear patterns
  if (totalDaysWithLogs >= 180 && hasDataAcross3Months) {
    return {
      stage: 'CHAMPION',
      minConfidence: 0.75,
      windowTypes: ['24h', '7d', '15d', '30d', '60d'],
      correlationsToShow: 5,
    };
  }

  // Master: 90+ days, monthly patterns
  if (totalDaysWithLogs >= 90 && hasFullMonthData && loggingConsistencyScore >= 0.7) {
    return {
      stage: 'MASTER',
      minConfidence: 0.70,
      windowTypes: ['4h', '24h', '7d', '15d', '30d'],
      correlationsToShow: 4,
    };
  }

  // Optimizer: 30+ days, weekly patterns
  if (totalDaysWithLogs >= 30 && hasFullMonthData && loggingStreak >= 14) {
    return {
      stage: 'OPTIMIZER',
      minConfidence: 0.65,
      windowTypes: ['24h', '7d', '15d', '30d'],
      correlationsToShow: 3,
    };
  }

  // Tracker: 7+ days, daily consistency
  if (totalDaysWithLogs >= 7 && loggingStreak >= 5) {
    return {
      stage: 'TRACKER',
      minConfidence: 0.60,
      windowTypes: ['24h', '7d'],
      correlationsToShow: 2,
    };
  }

  // Builder: 2-6 days, forming habits
  if (totalDaysWithLogs >= 2) {
    return {
      stage: 'BUILDER',
      minConfidence: 0.50,
      windowTypes: ['24h'],
      correlationsToShow: 1,
    };
  }

  // Discoverer: Day 0-1, exploring
  return {
    stage: 'DISCOVERER',
    minConfidence: null,
    windowTypes: [],
    correlationsToShow: 0,
  };
}
```

---

## 6. MESSAGING BY STAGE

### DISCOVERER
- "Great start! Log one more meal to unlock patterns."
- "You're 1 day in! Keep going."
- Show: Celebration, encouragement, feature discovery

### BUILDER
- "Early signal: High-sugar meals → energy dips (seen this 2 times)"
- "You're building momentum! 5 days = weekly patterns unlocking soon."
- Show: Emerging patterns (with caveats), streak progress

### TRACKER
- "Pattern spotted: Your mood drops on high-NOVA meal days. Happened 3x this week."
- "Your 7-day view shows: Consistent hydration ↔ better mood."
- Show: Confident patterns, evidence count, small actions

### OPTIMIZER
- "Your month reveals: Weekend meals → Monday sluggishness (4 weeks, consistent)."
- "Prediction: With your current meal pattern, energy dips at 3pm tomorrow."
- Show: Monthly trends, predictions, multi-signal patterns

### MASTER
- "6-week analysis: Mood directly correlates with 3 factors: sleep + hydration + protein."
- "Anticipatory insight: Tomorrow's weather (rainy) typically triggers low mood. Counter: 2x morning walks this week."
- Show: Sophisticated multi-signal, preventive actions

### CHAMPION
- "6-month trend: Your optimal wellness formula = 8k+ steps + 2.5L water + 25g protein breakfast."
- "Seasonal pattern: Winter months show 30% mood variance vs summer. Mitigation: Increase indoor activity + vitamin D."
- Show: Long-term trajectory, seasonal patterns, outcome quantification

### ELITE
- "Year in review: You've achieved 92% logging consistency. Health trajectory: +12% mood stability, +8% energy."
- "Your personal algorithm is dialed. Next level: What would push you to elite recovery days?"
- Show: Outcome mastery, peer insights (optional), visionary guidance

---

## 7. IMPLEMENTATION CHECKLIST

- [ ] Add `user_lifecycle` table to schema
- [ ] Implement `determineLifecycleStage()` function
- [ ] Update `/api/nutrition/dashboard` to return user lifecycle info
- [ ] Update correlation engine to respect min confidence by stage
- [ ] Update recommendation orchestrator to use stage for message depth
- [ ] Add frontend logic to display stage-appropriate messaging
- [ ] Create migration for existing users (assign based on totalDaysWithLogs)
- [ ] Add gamification hooks for stage transitions (notifications)
- [ ] Test stage transitions with sample data

---

**Status**: Design complete. Ready for implementation in orchestrator and frontend.
