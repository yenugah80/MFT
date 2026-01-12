# MyFoodTracker: Behavioral Health Intelligence System
## Complete System Architecture

---

## EXECUTIVE SUMMARY

We've designed and partially implemented a **behavioral health intelligence system** that goes beyond tracking. It:

1. **Discovers** correlations between food, mood, hydration, stress, and activity
2. **Quantifies** each correlation with explainable scoring (strength, confidence, health impact)
3. **Personalizes** insights based on user lifecycle stage (7 stages from DISCOVERER to ELITE)
4. **Decides** what to recommend daily (Speak, Reinforce, Predict, or Stay Silent)
5. **Presents** insights visually without raw data (gauges, progress bars, sparklines)

**Philosophy**: No tracking for tracking's sake. Every recommendation answers WHAT→WHY→WHEN→HOW→CORRELATION→ACTION.

---

## LAYER 1: DATA COLLECTION

### Current State (Already Built)
```
Mobile App
├── Food Logging (text, photo, voice, barcode)
│   └── Nutrition data (calories, macros, micros, NOVA score, etc.)
├── Mood Logging (8 mood states, intensity 1-10, energy 1-10, tags)
├── Water Logging (beverage type, hydration factor)
└── Exercise/Activity Tags (in mood logs)

Backend Database
├── food_log table (195+ fields including micros, NOVA score, cuisine)
├── mood_log table (intensity, energy, tags, mealContext)
├── water_log table (hydration-adjusted volumes)
├── daily_nutrition_summary (aggregates + daily wellness scores)
└── gamification table (streak, XP, level, badges)
```

### What's Ready
- ✅ Food logging (multimodal: text, photo, voice, barcode)
- ✅ Mood logging with intensity & energy
- ✅ Hydration logging with beverage types
- ✅ Lifecycle detection (5 stages: DISCOVERER→BUILDER→TRACKER→OPTIMIZER→MASTER)
- ✅ User profiles (age, gender, activity level, regions, dietary preferences)

---

## LAYER 2: SIGNAL EXTRACTION

### Service: `correlationEngineService.js`

**Input**: Raw logs (food_log, mood_log, water_log)

**Processing**:
```javascript
Food Log → {
  nova_score, is_high_sugar, macro_ratios, micros_score,
  expected_digestion_hours, cuisine_type, meal_type
}

Mood Log → {
  mood_valence (-1 to 1), arousal, energy_level,
  stress_level, sleep_quality, exercise_level,
  physical_symptoms (headache, fatigue, bloating, etc.)
}

Water Log → {
  hydration_liters (adjusted), beverage_type,
  hydration_factor, hour_of_day, is_reactive_to_meal
}
```

**Time Windowing**:
- 4-hour window: Acute food-mood relationships
- 24-hour window: Daily pattern emergence
- 7-day window: Weekly trends
- 15/30/60-day windows: Rolling patterns

---

## LAYER 3: CORRELATION DETECTION

### Rules-Based Pattern Detection

**Rule Engine** (deterministic, explainable):

| Rule Name | Signals | Output |
|-----------|---------|--------|
| `high_nova_mood_crash` | High-processed + high-sugar meals → mood intensity drop 2-4h later | "Mood drops after processed foods" |
| `dehydration_fatigue_mood` | <70% hydration goal + low mood/energy | "Dehydration correlates with fatigue" |
| `stress_eating_disruption` | High stress → meal skipping OR overeating | "Stress changes your eating" |
| `late_heavy_meal_sleep_impact` | Heavy meal >9pm + poor sleep → sluggish morning | "Late meals disrupt sleep recovery" |
| `exercise_protein_energy` | Exercise + adequate protein → better recovery next day | "Protein after exercise helps energy" |

### Scoring System

```
Strength = (occurrences / baseline) * signal_match
Confidence = min(occurrences / 3, 1.0) * consistency_bonus * (1 - confounding_penalties)
Health Impact Severity = based on affected_domains + frequency

Example: High-NOVA mood crash
- 5 occurrences in 30 days
- Strength: 0.82 (strong signal match)
- Confidence: 0.78 (seen 5 times, consistent timing)
- Severity: Moderate (mood + energy affected, happens 2-3x/week)
```

### Database Tables (New)

```javascript
// Stores computed correlations
user_correlations {
  id, userId, correlationType, ruleName,
  signalA, signalAValue, signalB, signalBValue,
  windowType, strength, confidence, occurrences,
  healthImpactSeverity, affectedDomains, expectedOutcome,
  lastObservedDate, firstObservedDate, isActive
}

// Evidence points supporting correlations
correlation_evidence {
  id, correlationId,
  observationDate, foodLogId, moodLogId, waterLogId,
  signalAActual, signalBActual, tagsJson, hourOfDay
}
```

---

## LAYER 4: LIFECYCLE-AWARE FILTERING

### Lifecycle State Machine

```
DISCOVERER (Day 0-1)
├─ Min Confidence: N/A (no correlations shown)
├─ Window Types: None
├─ Message: Celebration only
└─ Purpose: Onboarding, feature discovery

BUILDER (Day 2-6)
├─ Min Confidence: 0.50
├─ Window Types: 24h only
├─ Message: "Early signals" framing
└─ Purpose: Build logging habit

TRACKER (Day 7-29)
├─ Min Confidence: 0.60
├─ Window Types: 24h, 7d
├─ Message: Patterns with evidence count
└─ Purpose: Identify trends

OPTIMIZER (Day 30-89)
├─ Min Confidence: 0.65
├─ Window Types: 24h, 7d, 15d, 30d
├─ Message: Predictive, personalized
└─ Purpose: Multi-signal insights

MASTER (Day 90-179)
├─ Min Confidence: 0.70
├─ Window Types: 4h, 24h, 7d, 15d, 30d
├─ Message: Anticipatory, preventive
└─ Purpose: Sophisticated guidance

CHAMPION (Day 180-364)
├─ Min Confidence: 0.75
├─ Window Types: All + 60d window
├─ Message: Long-term trend analysis
└─ Purpose: Seasonal pattern recognition

ELITE (365+ days)
├─ Min Confidence: 0.80+
├─ Window Types: All windows, all signals
├─ Message: Outcome-focused mastery
└─ Purpose: Personal health algorithm
```

---

## LAYER 5: DAILY DECISION ORCHESTRATOR

### Service: `recommendationOrchestratorService.js`

**Daily Workflow**:

```
1. FETCH USER METRICS
   ├─ totalDaysWithLogs
   ├─ loggingStreak
   ├─ last logs (food, mood, water)
   └─ nutrition goals

2. DETERMINE LIFECYCLE STAGE
   └─ Based on totalDaysWithLogs + consistency

3. COMPUTE CORRELATIONS
   ├─ Run correlation engine with stage-appropriate window types
   ├─ Filter by min confidence threshold for stage
   └─ Save to database

4. DECIDE RECOMMENDATION TYPE
   ├─ SPEAK: New high-confidence pattern (0.8+, ≤3 occurrences)
   ├─ REINFORCE: Known positive pattern (keep doing this)
   ├─ PREDICT: Use patterns to anticipate tomorrow (MASTER+ only)
   └─ SILENT: User optimal, no action needed

5. GENERATE MESSAGE
   ├─ Human-readable headline
   ├─ Subtitle explaining the pattern
   ├─ 1-3 actionable items (tailored to lifecycle)
   ├─ Visual component (gauge/progress/sparkline)
   └─ Confidence indicator

6. RETURN ORCHESTRATION RESULT
   {
     message: { type, headline, subtitle, actions, visual },
     correlations: [ top N by confidence for this stage ],
     lifecycleStage: string
   }
```

---

## LAYER 6: API ENDPOINTS

### Correlation Endpoints

```
POST /api/correlations/compute
  ├─ Trigger correlation computation manually
  └─ Response: Correlations computed, saved to database

GET /api/correlations
  ├─ Fetch user's active correlations
  ├─ Query: minConfidence, correlationType, limit
  └─ Response: Array of correlations with full details

GET /api/correlations/:id/evidence
  ├─ Fetch individual evidence points for a correlation
  └─ Response: Timeline of occurrences

DELETE /api/correlations/:id
  └─ Mark correlation as inactive (user feedback)
```

### Orchestrator Endpoints

```
POST /api/orchestrator/run
  ├─ Trigger daily orchestration for authenticated user
  ├─ Called once daily (cron or manual)
  └─ Response: Today's message, correlations, lifecycle stage

POST /api/orchestrator/batch
  ├─ Trigger batch orchestration for all users
  ├─ Protected: Admin/cron only
  └─ Response: Success count, error count, results summary
```

---

## LAYER 7: FRONTEND VISUALIZATION

### Component Hierarchy

```
DashboardContent
├── DailyIntelligenceCard (Main insight from orchestrator)
│   ├─ Headline: "Mood Dips After Certain Foods"
│   ├─ Subtitle: "We noticed..."
│   ├─ Visual: PatternGauge (confidence indicator)
│   └─ Actions: [Add protein, Try nuts, ...]
│
├── CorrelationsSection (All discovered patterns)
│   ├─ CorrelationCard (compact, expandable)
│   │  └─ Tap → CorrelationDetailSheet
│   │     ├─ WHAT'S HAPPENING
│   │     ├─ WHY THIS HAPPENS
│   │     ├─ WHEN WE SEE IT
│   │     ├─ HOW IT AFFECTS HEALTH
│   │     ├─ WHAT'S RECOMMENDED
│   │     ├─ Evidence Timeline
│   │     └─ [Dismiss/Keep Watching]
│   └─ [See all patterns]
│
└── LifecycleStageIndicator
    ├─ "You're a Builder"
    ├─ "4 more days → Tracker"
    └─ [Progress: 4/7]
```

### Visual Components

**PatternGauge**: Half-circle indicator (0-1 confidence)
- Red (0-0.4), Amber (0.4-0.6), Yellow (0.6-0.8), Green (0.8-1.0)
- Center: Percentage
- Bottom: Label

**ProgressBar**: Linear progress to goal
- Filled/empty segments
- Percentage or ratio display
- Color coding by completion

**Sparkline**: Minimal trend line (last 7/14/30 days)
- No axis labels (layman-friendly)
- Hover tooltip: Average value
- Color coded by domain (mood=blue, energy=green, etc.)

**ActionItem**: Clickable action card
- Icon (emoji)
- Text ("Add protein")
- Description ("Stabilizes blood sugar")
- Tap → Navigate to relevant logging screen

---

## IMPLEMENTATION STATUS

### ✅ Complete
- [x] Database schema (food_log, mood_log, water_log, + new correlation tables)
- [x] Signal extraction functions (extractFoodSignals, extractMoodSignals, etc.)
- [x] Correlation detection rules (5 major rules implemented)
- [x] Scoring formulas (strength, confidence, health impact)
- [x] Correlation service (computeUserCorrelations, getUserCorrelations, etc.)
- [x] Correlation API routes (POST/GET/DELETE endpoints)
- [x] Lifecycle state machine (7 stages defined)
- [x] Recommendation orchestrator service
- [x] Orchestrator API routes
- [x] Server.js route registration
- [x] Design documents (3 comprehensive specs)

### ⏳ Next Steps (Implementation)

**Phase 1: Database & Testing**
- [ ] Run database migration (add user_correlations, correlation_evidence tables)
- [ ] Unit tests for signal extraction
- [ ] Unit tests for correlation rules
- [ ] Integration tests for orchestrator

**Phase 2: Frontend Components**
- [ ] Implement PatternGauge component
- [ ] Implement ProgressBar variants
- [ ] Implement Sparkline component
- [ ] Implement DailyIntelligenceCard
- [ ] Implement CorrelationCard (compact + expanded)
- [ ] Implement CorrelationDetailSheet
- [ ] Implement ActionItem component
- [ ] Implement LifecycleStageIndicator

**Phase 3: Integration**
- [ ] Update DashboardContent.jsx to use new components
- [ ] Wire orchestration API → components
- [ ] Add loading/skeleton states
- [ ] Add error handling
- [ ] Add haptic feedback on interactions

**Phase 4: Polish & Testing**
- [ ] Cross-browser/device testing
- [ ] Performance optimization (optimize queries, add pagination)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] User testing with real users across lifecycle stages
- [ ] Analytics: Track which insights users find helpful

**Phase 5: Daily Cron**
- [ ] Set up orchestrator cron job (once daily per user)
- [ ] Push notification integration (optional)
- [ ] Email digest (optional)

---

## DATA FLOW DIAGRAM

```
User Logs (Food, Mood, Water)
         ↓
  [Extract Signals]
         ↓
 [Compute Correlations]
    (Rule-based)
         ↓
[Filter by Lifecycle Stage]
   (min confidence)
         ↓
  [Decision Logic]
 (Speak/Reinforce/Predict/Silent)
         ↓
  [Generate Message]
(Headline/Subtitle/Actions/Visual)
         ↓
  [Store in DB]
   user_correlations
         ↓
[Frontend Fetches]
 GET /api/orchestrator/run
         ↓
[Display Components]
(Gauge/Progress/Card/Actions)
         ↓
  User Sees Insight
(Beautiful, actionable, personalized)
```

---

## CONFIGURATION BY LIFECYCLE STAGE

### Message Complexity

```
DISCOVERER: "Great start!"
BUILDER: "Early signal: [pattern] (seen 2 times)"
TRACKER: "Pattern spotted: [pattern]. Happened [N]x this week."
OPTIMIZER: "Your month reveals: [pattern]. Prediction: [outcome]"
MASTER: "[N]-week analysis: [pattern]. Anticipatory: [action]"
CHAMPION: "6-month trend: [pattern]. Seasonal: [insight]"
ELITE: "Year in review: [pattern]. Your algorithm: [outcome]"
```

### Window Types Used

```
DISCOVERER: None
BUILDER: 24h
TRACKER: 24h, 7d
OPTIMIZER: 24h, 7d, 15d, 30d
MASTER: 4h, 24h, 7d, 15d, 30d
CHAMPION: 24h, 7d, 15d, 30d, 60d
ELITE: 4h, 24h, 7d, 15d, 30d, 60d
```

### Min Confidence Thresholds

```
DISCOVERER: N/A (no correlations)
BUILDER: 0.50
TRACKER: 0.60
OPTIMIZER: 0.65
MASTER: 0.70
CHAMPION: 0.75
ELITE: 0.80+
```

---

## TESTING ROADMAP

### Unit Tests
```
✓ Signal extraction (food, mood, water)
✓ Scoring formulas (strength, confidence, health impact)
✓ Correlation rules (each major rule)
✓ Lifecycle stage detection
✓ Decision logic (Speak/Reinforce/Predict/Silent)
✓ Message generation
```

### Integration Tests
```
✓ End-to-end: logs → correlations → orchestration → message
✓ Multi-user batch orchestration
✓ Lifecycle stage transitions
✓ Confounding factor penalties
✓ Edge cases (no data, insufficient data, extreme values)
```

### Frontend Tests
```
✓ Component rendering (all lifecycle stages)
✓ Visual accuracy (gauge angles, progress widths, sparkline points)
✓ Interaction (expand/collapse, tap actions)
✓ Data binding (correlations → cards)
✓ Touch feedback (haptic, visual feedback)
```

### User Testing
```
✓ DISCOVERER users: Do they understand what to do next?
✓ BUILDER users: Do early signals encourage continued logging?
✓ TRACKER users: Do patterns make sense with evidence?
✓ OPTIMIZER+ users: Do predictions feel accurate?
✓ All users: Is language layman-friendly? (No technical jargon)
```

---

## PERFORMANCE CONSIDERATIONS

### Query Optimization
- Index: `user_correlations(userId, isActive, confidence DESC)`
- Index: `food_log(userId, loggedDate)`
- Index: `mood_log(userId, loggedDate)`
- Index: `water_log(userId, loggedDate)`

### Caching
- Cache user lifecycle stage (recompute daily)
- Cache correlations (recompute daily during cron)
- Cache orchestrator result (serve from cache, recompute daily)

### Batch Processing
- Orchestrator batch job processes users in parallel (batch size: 100)
- Can run during low-traffic hours (e.g., 2am UTC)
- Can be split across multiple Lambda functions or workers

### Database Constraints
- Keep correlation records for 1 year (archive after)
- Keep correlation evidence for 6 months
- Implement data retention policy

---

## SECURITY & PRIVACY

### Data Sensitivity
- User logs (food, mood) are personal health data
- All endpoints require Clerk authentication
- Orchestrator batch endpoint requires admin token (TODO: implement)

### Privacy Controls
- User can dismiss/deactivate correlations
- User can control which correlations are tracked
- Evidence view shows only relevant data (no full log dumps)

### GDPR Compliance
- Support data export (all correlations + evidence)
- Support data deletion (cascade delete on user_correlations)
- Consent tracking for pattern analysis

---

## FUTURE ENHANCEMENTS

### Short Term
- [ ] More correlation rules (activity ↔ recovery, weather ↔ mood, etc.)
- [ ] ML-based confidence scoring (after rule baseline)
- [ ] Push notifications for significant correlations
- [ ] Email digests for weekly insights

### Medium Term
- [ ] Peer comparisons (privacy-respecting aggregates)
- [ ] Seasonal pattern prediction
- [ ] Behavioral intervention experiments
- [ ] Integration with wearables (heart rate, sleep data)

### Long Term
- [ ] Personal ML model (learns user's unique patterns)
- [ ] Social features (share insights with friends/coach)
- [ ] Health provider integration (share with doctor)
- [ ] Longitudinal health outcomes tracking

---

**Architecture Status**: Complete design, partial implementation.
**Next Owner**: Frontend developer to build React components and integrate with backend.
