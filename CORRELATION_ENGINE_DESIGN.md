# Correlation Engine Design
## Rule-First, Deterministic, ML-Ready

---

## 1. CORE PRINCIPLES

### Philosophy
- **Explainability First**: Every correlation must explain WHAT-WHY-WHEN-HOW-IMPACT
- **Rule-Based Foundation**: Deterministic rules before ML
- **Multi-Signal**: Correlate food, mood, hydration, stress, activity, context
- **Time-Windowed**: 4h (acute), 24h (daily), 7/15/30/60d (rolling patterns)
- **Health-Impact Aware**: Severity scoring (positive, neutral, negative)
- **Privacy-Respecting**: Opt-in tracking, clear consent
- **Cold-Start Resilient**: Works from Day 1 with minimal data

---

## 2. SIGNAL EXTRACTION RULES

### From Food Logs
```
food_log → {
  // Immediate indicators
  nova_score: 1-4,              // Processing level (1=minimal, 4=ultra)
  is_high_sugar: carbs > 40g && fiber < 5g,
  is_high_sodium: sodium > 600mg,

  // Macro profile
  macro_ratio: {
    protein_percent: (protein_g / calories) * 100,
    carb_percent: (carbs_g / calories) * 100,
    fat_percent: (fats_g / calories) * 100,
    fiber_to_carb_ratio: fiber_g / carbs_g  // >0.08 is ideal
  },

  // Nutrient density
  micros_score: count(significant_micros) / 10,  // 0-1
  is_highly_processed: nova_score >= 3,

  // Timing context
  hours_since_last_meal: calculated,
  is_large_meal: calories > 600,
  is_light_snack: 100 <= calories <= 250,

  // Digestion window for mood correlation
  expected_digestion_hours: estimated_based_on_macros,  // 2-4h
}
```

### From Mood Logs
```
mood_log → {
  // Mood state
  mood_category: 'happy' | 'calm' | 'focused' | 'energized' | 'neutral' | 'tired' | 'stressed' | 'sad',
  mood_valence: -1 to 1,         // sad→happy
  arousal_level: 1-10,           // intensity
  energy_level: 1-10,            // separate from intensity

  // Context tags
  stress_indicators: tags.stress_level,  // implied or explicit
  sleep_quality: tags.sleep,    // good|ok|poor
  exercise_today: tags.exercise,  // none|light|moderate|intense
  social_interaction: tags.social,
  weather: tags.weather,         // sunny|cloudy|rainy

  // Physical symptoms
  physical_tags: ['headache', 'fatigue', 'bloating', 'focus_issues', 'energy_crash'],
}
```

### From Water Logs
```
water_log → {
  // Hydration baseline
  hydration_liters: adjusted_for_beverage_type,
  actual_volume_liters: logged_amount,
  hydration_factor: 1.0 (water) | 0.8 (tea) | 0.5 (coffee) | 0.4 (soda),

  // Timing
  hour_of_day: extract from timestamp,
  is_morning_spike: hour in [6-10],
  is_afternoon_peak: hour in [12-16],
  is_evening_catchup: hour in [17-22],

  // Pattern
  minutes_since_food: time between food and water,
  is_reactive_to_meal: minutes < 30,
}
```

### Temporal Context
```
{
  day_of_week: 'monday' | ... | 'sunday',
  is_weekend: day in [saturday, sunday],
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night',
  is_stress_day: calculated from mood history,
  is_active_day: calculated from exercise tags,
}
```

---

## 3. TIME WINDOWS FOR CORRELATION

### Window Definitions

| Window | Purpose | Use Cases |
|--------|---------|-----------|
| **4-hour** | Acute food-mood relationship | "Did this meal cause my mood drop 2h later?" |
| **24-hour** | Daily pattern emergence | "High NOVA days = tired next morning?" |
| **7-day** | Weekly trend | "Weekend eating ≠ weekday?" |
| **15-day** | Behavioral shift detection | "Last 2 weeks worse than prior?" |
| **30-day** | Monthly pattern | "Monthly cycle + mood variation?" |
| **60-day** | Seasonal/long-term trends | "Winter vs summer mood patterns?" |

### Window Alignment Algorithm

```javascript
// For mood logged at 2024-01-15 14:30 UTC, timezone=IST (+5:30)
const localTime = new Date(utcTime.getTime() + tzOffset * 60000);
const windowStart = new Date(localTime);
windowStart.setHours(0, 0, 0, 0);  // Start of day in local timezone

// For 4-hour window looking back
const fourHourWindow = {
  start: new Date(moodTime.getTime() - 4 * 60 * 60 * 1000),
  end: moodTime,
  meals: foodLogsWithinWindow
}

// For same-day 24h window
const dailyWindow = {
  start: startOfDay(moodDate),
  end: endOfDay(moodDate),
  meals: foodLogsOnSameDay
}
```

---

## 4. CORRELATION PATTERNS (RULES-BASED)

### Pattern 1: MOOD ↔ FOOD (Blood Sugar Stability)

**Rule Name**: `high_nova_mood_crash`

**Detection**:
```javascript
{
  condition: {
    event_1: food_log with nova_score >= 3 && carbs >= 40g && fiber < 5g,
    event_2: mood_log within 2-4 hours after food,
    mood_change: mood_intensity drops > 3 points from baseline,
    energy_drop: energy_level drops > 2 points,
  },
  scoring: {
    strength = (occurrences / baseline_occurrences) * weight,
    confidence = 1.0 if (occurrences >= 3 && consistent_pattern),
              = 0.8 if (occurrences == 2),
              = 0.6 if (occurrences == 1 && high_signal_match),
  },
  health_impact: {
    severity: 'moderate' if happens 2-3x/week,
             'high' if happens daily,
             'low' if rare,
    affected_domains: ['mood_stability', 'energy_consistency'],
    expected_outcome: 'Mood swings, afternoon crashes'
  }
}
```

**Evidence Variables**:
- `high_sugar_meals_count` in window
- `avg_mood_before` vs `avg_mood_after`
- `crash_timing_minutes` (usually 120-180)
- `affected_mood_tags` (stressed, tired, sad)

**Confidence Modifiers**:
- `+0.1` if energy_level correlates with mood drop
- `+0.1` if physical_symptoms include headache or fatigue
- `-0.1` if exercise happened same day (confounding)
- `-0.1` if sleep tags indicate "poor" (sleep is stronger signal)

---

### Pattern 2: MOOD ↔ STRESS ↔ EATING BEHAVIOR

**Rule Name**: `stress_mood_food_avoidance_or_excess`

**Detection**:
```javascript
{
  condition: {
    event_1: mood_log with stress tag || stressed mood,
    event_2a: food_log count is 0 (meal skipping), OR
    event_2b: food_log count > 3 with high_calorie foods,
    window: same day or next 4 hours,
  },
  scoring: {
    // Skipping meals under stress
    avoidance_strength = meals_skipped / expected_meals,

    // Comfort eating under stress
    excess_strength = (excess_calories / goal) * stress_intensity,

    confidence = min(occurrences / 5, 1.0)
  },
  health_impact: {
    avoidance_severity: 'moderate' if skips 1 meal,
                        'high' if skips 2+ meals,
    excess_severity: 'mild' if 200-400 cal over,
                     'moderate' if 400-800 cal over,
                     'high' if 800+ cal over,
    affected_domains: ['nutrition_consistency', 'energy', 'recovery']
  }
}
```

---

### Pattern 3: FOOD ↔ HYDRATION ↔ MOOD (Dehydration Impact)

**Rule Name**: `dehydration_fatigue_mood_decline`

**Detection**:
```javascript
{
  condition: {
    event_1: daily_hydration < goal * 0.7,  // <70% of target
    event_2: mood_log includes tired/stressed,
    event_3: energy_level < 5,
    window: same day,
  },
  scoring: {
    hydration_deficit = 1 - (actual_hydration / goal),
    strength = hydration_deficit * (mood_negative_signals / 3),  // 0-1
    confidence = 0.8 if (pattern repeats 3+ times),
               = 0.6 if (pattern repeats 2 times),
  },
  health_impact: {
    severity: 'high' if hydration < 50% AND mood_negative AND energy_low,
             'moderate' if any two conditions,
    affected_domains: ['energy', 'mood', 'focus']
  }
}
```

**Specificity**:
- Coffee intake increases dehydration risk (apply negative hydration_factor)
- Exercise without post-hydration → amplified effect
- Time of day: Morning dehydration less severe than afternoon

---

### Pattern 4: ACTIVITY ↔ RECOVERY ↔ ENERGY (From Tags)

**Rule Name**: `exercise_protein_energy_recovery`

**Detection**:
```javascript
{
  condition: {
    event_1: mood_log with tags.exercise: 'moderate' || 'intense',
    event_2: next_day_mood_log exists,
    event_3: protein_intake_grams >= 25 within 2h of exercise,
  },
  scoring: {
    recovery_score = protein_adequacy * energy_next_day / 10,
    strength = (good_recovery_count / total_exercise_days),
    confidence = occurrences >= 2 ? 0.8 : 0.6,
  },
  health_impact: {
    positive_severity: 'high',
    affected_domains: ['recovery', 'energy', 'mood_stability'],
    expected_outcome: 'Better mood and energy next day'
  }
}
```

---

### Pattern 5: MEAL TIMING ↔ SLEEP QUALITY ↔ NEXT MORNING MOOD

**Rule Name**: `late_heavy_meal_poor_sleep_mood`

**Detection**:
```javascript
{
  condition: {
    event_1: food_log after 21:00 with calories > 500,
    event_2: mood_log next_morning shows tiredness,
    event_3: tags.sleep = 'poor' || 'ok' (not 'good'),
    window: evening (21:00+) → next morning (6:00-10:00),
  },
  scoring: {
    timing_violation = calories_after_9pm / total_daily_calories,
    strength = timing_violation * sleep_quality_impact,
    confidence = occurrences >= 2 ? 0.8 : 0.6,
  },
  health_impact: {
    severity: 'moderate' if happens 2-3x/week,
             'high' if happens 4+ times/week,
    affected_domains: ['sleep', 'recovery', 'next_day_energy']
  }
}
```

---

## 5. CONFIDENCE SCORING FORMULA

### Base Confidence
```
base_confidence = min(occurrences / threshold, 1.0)
  where threshold = 3 for patterns
```

### Consistency Bonus
```
consistency_bonus = 0.15 if pattern repeats within same window type
  e.g., high_nova → mood crash every time tested
```

### Confounding Factor Penalty
```
// Sleep > everything
if sleep_tag = 'poor':
  confidence *= 0.7  // Sleep explains most variance

// Weather/seasonal
if weather_tag = 'rainy' && mood_negative:
  confidence *= 0.85  // Weather is confounding

// Stress (strong signal)
if stress_intensity > 7:
  confidence *= 0.8  // Stress overrides mood-food signals
```

### Final Confidence
```
final_confidence = base_confidence
                   * consistency_bonus
                   * (1 - confounding_penalties)
```

**Threshold for Reporting**: `confidence >= 0.6` (show to user, with caveats if < 0.8)

---

## 6. HEALTH IMPACT SEVERITY

### Scoring Dimensions

| Dimension | Positive | Neutral | Negative |
|-----------|----------|---------|----------|
| **Mood** | Stable 7-10 | 5-6 | <5 or volatile |
| **Energy** | 7-10 consistently | 5-6 | <5 or crashes |
| **Physical** | No symptoms | Occasional | Regular headaches, fatigue |
| **Sleep** | Good consistently | Mixed | Poor regularly |
| **Recovery** | Good next day | Neutral | Slow recovery |

### Severity Calculation
```javascript
negativeIndicators = [
  mood_drops > 3 points,      // 1 point each
  energy_crashes,             // 1 point each
  physical_symptom_reported,  // 1 point each
  poor_sleep_tagged,          // 2 points (strong)
  low_recovery_next_day,      // 1 point
];

severity = negativeIndicators.length >= 3 ? 'high'
         : negativeIndicators.length === 2 ? 'moderate'
         : negativeIndicators.length === 1 ? 'low'
         : 'none'
```

---

## 7. CORRELATION STORAGE SCHEMA

### New Table: `user_correlations`

```sql
CREATE TABLE user_correlations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Correlation metadata
  correlation_type TEXT NOT NULL,  -- 'mood_food', 'stress_eating', 'hydration_mood', etc.
  rule_name TEXT NOT NULL,         -- 'high_nova_mood_crash', etc.

  -- Signal pair
  signal_a TEXT NOT NULL,          -- e.g., 'high_nova_carbs'
  signal_a_value NUMERIC,          -- e.g., 45 grams
  signal_b TEXT NOT NULL,          -- e.g., 'mood_drop'
  signal_b_value NUMERIC,          -- e.g., -3 points

  -- Timing
  window_type TEXT,                -- '4h', '24h', '7d', '15d', '30d', '60d'
  time_lag_minutes INTEGER,        -- Typically 120-180 for food-mood

  -- Scoring
  strength NUMERIC(3,2),           -- 0.0-1.0
  confidence NUMERIC(3,2),         -- 0.0-1.0
  occurrences INTEGER,             -- Number of times pattern observed

  -- Health impact
  health_impact_severity TEXT,     -- 'high', 'moderate', 'low', 'positive'
  affected_domains TEXT[],         -- ['mood', 'energy', 'sleep']
  expected_outcome TEXT,           -- Natural language description

  -- Metadata
  evidence_json JSONB,             -- Full evidence data
  last_observed_date DATE,         -- When pattern was last detected
  first_observed_date DATE,        -- When pattern first appeared
  is_active BOOLEAN DEFAULT true,  -- Still valid?

  -- Audit
  computed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, correlation_type, rule_name, window_type)
);

-- Indexes for performance
CREATE INDEX idx_corr_user_active ON user_correlations(user_id, is_active);
CREATE INDEX idx_corr_user_confidence ON user_correlations(user_id, confidence DESC);
CREATE INDEX idx_corr_type ON user_correlations(correlation_type);
```

### New Table: `correlation_evidence`

```sql
CREATE TABLE correlation_evidence (
  id SERIAL PRIMARY KEY,
  correlation_id INTEGER NOT NULL,

  -- Evidence point
  observation_date DATE,
  food_log_id INTEGER REFERENCES food_log(id),
  mood_log_id INTEGER REFERENCES mood_log(id),
  water_log_id INTEGER REFERENCES water_log(id),

  -- Raw signals
  signal_a_actual NUMERIC,
  signal_b_actual NUMERIC,

  -- Context
  tags JSONB,                      -- sleep, exercise, stress, etc.

  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (correlation_id) REFERENCES user_correlations(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_corr ON correlation_evidence(correlation_id);
```

---

## 8. API CONTRACT

### Compute Correlations (Run Daily)

**POST** `/api/correlations/compute`

**Request**:
```javascript
{
  userId: "user_123",
  window_types: ['4h', '24h', '7d', '30d'],  // Which windows to compute
  force_recompute: false                      // Force even if recent
}
```

**Response**:
```javascript
{
  userId: "user_123",
  computed_at: "2024-01-15T10:00:00Z",
  new_correlations: 3,
  updated_correlations: 5,
  correlations: [
    {
      id: 42,
      rule_name: "high_nova_mood_crash",
      correlation_type: "mood_food",
      strength: 0.82,
      confidence: 0.88,
      occurrences: 5,
      health_impact_severity: "moderate",
      affected_domains: ["mood_stability", "energy"],
      expected_outcome: "Mood crashes 2-3h after high-NOVA meals",
      last_observed_date: "2024-01-14",
      evidence_json: { /* full details */ }
    },
    // ... more correlations
  ]
}
```

### Get User Correlations

**GET** `/api/correlations?userId=user_123&min_confidence=0.6`

**Response**: Array of correlations as above

### Get Correlation Evidence

**GET** `/api/correlations/:correlationId/evidence`

**Response**:
```javascript
{
  correlationId: 42,
  rule_name: "high_nova_mood_crash",
  evidence_points: [
    {
      date: "2024-01-14",
      signal_a: { type: "high_nova_carbs", value: 45 },
      signal_b: { type: "mood_drop", value: -3 },
      context: { sleep: "poor", stress: true },
      lag_minutes: 150
    },
    // ... more evidence
  ]
}
```

---

## 9. LIFECYCLE-AWARE CORRELATION DEPTH

| Lifecycle Stage | Window Types | Min Occurrences | Min Confidence | Action |
|---|---|---|---|---|
| **Day 0** | None | N/A | N/A | No correlations (data needed) |
| **Days 1-2** | 24h only | 1 | 0.5 | Show weak signals as "early patterns" |
| **Days 3-6** | 24h, 7d | 2 | 0.6 | Show emerging patterns |
| **Days 7-29** | 24h, 7d, 15d | 2 | 0.7 | Show confident patterns |
| **30+ days** | All windows | 3 | 0.75 | Deep multi-window insights |

---

## 10. IMPLEMENTATION ROADMAP

### Phase 1: Core Engine (This Sprint)
- [ ] Implement signal extraction functions
- [ ] Build correlation detection rules
- [ ] Create scoring formulas
- [ ] Implement database schema
- [ ] Build daily compute job

### Phase 2: API & Orchestrator (Next Sprint)
- [ ] Build `/api/correlations/*` endpoints
- [ ] Create daily recommendation orchestrator
- [ ] Integrate with lifecycle detector
- [ ] Build decision pipeline (Speak/Reinforce/Predict/Silent)

### Phase 3: Frontend Visualization (Following Sprint)
- [ ] Design visual components (gauges, progress bars, trend lines)
- [ ] Integrate with dashboard
- [ ] Build correlation detail screens
- [ ] Add lifecycle-aware messaging

---

## 11. EXAMPLE: FULL FLOW

### Day 5 for New User

**Input Logs**:
- Breakfast: Rice + curry (NOVA 3, 45g carbs, 8g protein)
- Mood at 2pm: tired, intensity 3/10, energy 4/10
- Lunch: Rice + curry (NOVA 3, 42g carbs, 10g protein)
- Mood at 4pm: energy crash, intensity 2/10, energy 2/10
- Water: 1 liter (below goal of 3L)

**Correlation Detection**:
```
Rule: high_nova_mood_crash
- Occurrence 1: Morning rice → 2h later mood drop ✓
- Occurrence 2: Lunch rice → 2h later energy crash ✓
- Pattern emerging

Strength: 2/2 = 1.0
Confidence: (2 occurrences >= 2) * (consistent timing) * (no sleep confound) = 0.75
Health Impact: moderate (happens 2x on day 5, but limited data)
```

**Correlation Stored**:
```json
{
  rule_name: "high_nova_mood_crash",
  strength: 0.75,
  confidence: 0.75,
  occurrences: 2,
  health_impact_severity: "low",  // Only 2 occurrences, needs pattern stability
  window_type: "24h",
  expected_outcome: "High-NOVA meals may cause mood dips 2-3h later"
}
```

**User Sees** (in recommendation):
- "We noticed: After rice-based meals, your mood dips around 2-3 hours later. Could try: Adding protein (paneer/dal) to stabilize your mood."

---

## 12. TESTING EXAMPLES

### Test Case 1: High Confidence Pattern
- User logs rice+curry 3 days in a row
- Logs mood crashes 2-3h after each time
- Sleep tagged as "good" (not confounding)
- Expected: High confidence (0.85+), rule fires

### Test Case 2: Confounded by Sleep
- User logs rice+curry, mood crashes
- But sleeps "poor" both nights
- Expected: Lower confidence (0.5-0.6), show sleep as primary factor

### Test Case 3: Not Enough Data
- User logs one high-NOVA meal, one mood drop
- Timing: 3h later
- Expected: Correlation created with confidence 0.5, labeled "early signal"

---

## 13. FAILURE MODES & GUARDS

| Scenario | Guard | Action |
|----------|-------|--------|
| **No logs in window** | Check occurrence count | Show "need more data" |
| **Conflicting patterns** | Weight by confidence | Show highest confidence pattern |
| **Confounders strong** | Apply penalty | Downgrade confidence if sleep/stress/weather is strong |
| **Rare pattern** | Min occurrences | Don't report if < threshold for lifecycle stage |
| **User skips tags** | Handle gracefully | Reduce confidence but don't fail |

---

**Status**: Design phase complete. Ready for implementation.
