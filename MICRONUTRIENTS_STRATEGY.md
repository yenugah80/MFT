# Micronutrient Strategy in Correlation Engine

## The Question
**"If we focus on macros, where do the 5 key micros go?"**

---

## 📊 CURRENT STATE

### What Data Exists
Food logs contain rich micronutrient data:
```javascript
micros: {
  fiber: "8g",           // Satiety, blood sugar stability
  sugar: "12g",          // Energy crashes, mood
  sodium: "450mg",       // Blood pressure, water retention
  calcium: "200mg",      // Bone health
  iron: "2mg",           // Energy, fatigue
  vitaminD: "400IU",     // Mood, recovery
  magnesium: "80mg",     // Sleep, stress
  potassium: "300mg",    // Heart health
  omega3: "0.5g",        // Inflammation, mood
  // ... and more
}
```

### Current Correlation Rules
**Focus: Macros + Processing Level**
- High NOVA score (processing)
- Sugar content
- Protein quantity
- Carb-to-fiber ratio
- Overall calories

---

## 🎯 MICRONUTRIENT STRATEGY

### Phase 1: Macro-First (MVP)
**Focus on the 20% that drives 80% of outcomes**

**Primary Signals** (use for correlations):
```
✅ NOVA score (processing level)
✅ Sugar (simple carbs)
✅ Protein (recovery, satiety)
✅ Fiber (satiety, stability)
✅ Sodium (water retention, bloating)
```

**Why These 5?**
- **NOVA**: Most predictive for mood crashes, energy dips
- **Sugar**: Direct energy spike→crash pattern
- **Protein**: Recovery, satiety, mood stability
- **Fiber**: Stabilizes blood sugar (counteracts sugar)
- **Sodium**: Bloating, water retention (visible impact)

### Phase 2: Micro Integration (Growth)
**Add secondary signals for deeper insights**

**Secondary Micros** (add after MVP):
```
🔄 Vitamin D → Mood (seasonal, winter patterns)
🔄 Magnesium → Sleep quality (stress buffering)
🔄 Iron → Energy (fatigue patterns)
🔄 Omega-3 → Inflammation (joint pain, mood)
🔄 Potassium → Recovery (post-exercise)
```

**How to use?**
- As modifier/amplifier (not primary signal)
- "Protein + low magnesium → poor sleep recovery"
- "Iron deficit → amplifies fatigue from exercise"
- "Vitamin D low → seasonal mood decline"

### Phase 3: Deficiency Detection (Premium)
**Identify nutritional gaps**

```javascript
// Track cumulative micros across days
if (averageVitaminD < 200IU) {
  // Supplement recommendation
  // Cross-check with mood patterns
  // Predict seasonal impact
}
```

---

## 🔗 WHERE MICROS FIT IN SIGNALS

### Signal Extraction Enhancement

```javascript
function extractFoodSignals(foodLog) {
  const macroSignals = {
    // Phase 1 (MVP)
    nova_score: foodLog.novaScore,
    sugar_grams: foodLog.micros.sugar || 0,
    protein_grams: foodLog.protein,
    fiber_grams: foodLog.micros.fiber || 0,
    sodium_mg: foodLog.micros.sodium || 0,

    // Phase 2 (Growth)
    vitaminD_iu: foodLog.micros.vitaminD || 0,
    magnesium_mg: foodLog.micros.magnesium || 0,
    iron_mg: foodLog.micros.iron || 0,
    omega3_g: foodLog.micros.omega3 || 0,

    // Derived scores
    is_high_sugar: sugar_grams > 20,
    is_high_sodium: sodium_mg > 600,
    is_low_fiber: fiber_grams < 3,
    is_low_protein: protein_grams < 10,

    // Ratio scores (new)
    sugar_to_fiber_ratio: sugar_grams / (fiber_grams || 1),
    protein_quality_score: calculateProteinQuality(foodLog),
  };

  return macroSignals;
}
```

---

## 📈 CORRELATION RULES WITH MICROS

### Phase 1: Macro-Focused Rules (Current)
```javascript
// Rule 1: NOVA + Sugar → Mood Crash
rule: "high_nova_mood_crash"
signals: [novaScore >= 3, sugar > 20, fiber < 5]
outcome: "mood_crash"

// Rule 2: Dehydration + Sodium → Bloating + Mood
rule: "dehydration_sodium_bloating"
signals: [dailyWater < 1.5L, sodium_day > 2000mg]
outcome: "bloating_low_mood"
```

### Phase 2: Micro-Enhanced Rules (Later)
```javascript
// Rule X: Protein Deficiency + Exercise = Poor Recovery
rule: "low_protein_exercise_recovery"
signals: [protein_day < 60g, exerciseLevel = 'intense']
outcome: "poor_recovery"
confidence_amplifier: 1.3  // Amplifier (not just penalty)

// Rule Y: Low Vitamin D + Winter = Seasonal Mood
rule: "low_vitamin_d_seasonal_mood"
signals: [vitaminD_avg < 200IU, season = 'winter', daysWithLogs >= 180]
outcome: "seasonal_mood_decline"
recommendation: "Vitamin D supplement + light therapy"
```

### Phase 3: Deficiency Rules (Premium)
```javascript
// Rule Z: Cumulative Iron Deficit
rule: "iron_deficit_fatigue"
signals: [iron_avg_7days < 10mg, iron_trend = 'declining']
outcome: "fatigue_pattern"
severity: "moderate"
recommendation: "Iron-rich foods or supplement (consult doctor)"
```

---

## 🎨 RECOMMENDATION WITH MICROS

### Phase 1: Macro Focus
```
"Mood Dips After Certain Foods"
Subtitle: "High-processed, high-sugar meals → energy crashes 2-4h later"

Actions:
1. Add protein (10g+) to meals
2. Include fiber (5g+) with carbs
3. Reduce simple sugars
```

### Phase 2: Micro Insights
```
"Protein + Recovery Gap"
Subtitle: "You exercise regularly but eating ~45g protein/day (need ~70g)"

Actions:
1. Add protein: eggs, yogurt, chicken
2. Pair with carbs within 30min post-exercise
3. Consider: Creatine or protein powder
```

### Phase 3: Supplement Recommendations
```
"Seasonal Mood Pattern Detected"
Subtitle: "Winter months show 40% lower mood. Check: Vitamin D? (only 150 IU/day avg)"

Actions:
1. Blood test: Check Vitamin D levels
2. Consider: 1000-2000 IU supplement
3. Try: 20min outdoor time daily (when possible)
```

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### Micro Tiers

```javascript
const MICRO_TIERS = {
  tier_1_mvp: [
    { name: 'fiber', unit: 'g', min: 25, source: 'vegetables' },
    { name: 'sodium', unit: 'mg', max: 2300, source: 'diet reduction' },
    { name: 'sugar', unit: 'g', max: 25, source: 'limit processed' },
  ],
  tier_2_growth: [
    { name: 'vitaminD', unit: 'IU', min: 600, source: 'sunlight + food' },
    { name: 'magnesium', unit: 'mg', min: 310, source: 'nuts + leafy' },
    { name: 'iron', unit: 'mg', min: 18, source: 'meat + legumes' },
  ],
  tier_3_premium: [
    { name: 'omega3', unit: 'g', min: 1.6, source: 'fish + flax' },
    { name: 'potassium', unit: 'mg', min: 2600, source: 'fruits + tubers' },
    { name: 'b12', unit: 'mcg', min: 2.4, source: 'meat + fortified' },
  ],
};
```

### Database Schema

```javascript
// Already in food_log.micros (JSON)
// No schema change needed for MVP

// Phase 2: Add cumulative tracking
export const dailyMicroSummaryTable = pgTable(
  "daily_micro_summary",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    date: timestamp("date").notNull(),

    // Tier 1
    fiberG: integer("fiber_g"),
    sodiummg: integer("sodium_mg"),
    sugarG: integer("sugar_g"),

    // Tier 2
    vitaminDIU: integer("vitamin_d_iu"),
    magnesiumMg: integer("magnesium_mg"),
    ironMg: decimal("iron_mg", { precision: 4, scale: 2 }),

    // Tier 3 (optional)
    omega3G: decimal("omega3_g", { precision: 3, scale: 2 }),
    potassiumMg: integer("potassium_mg"),

    // Tracking
    meetsGoal_fiber: boolean("meets_goal_fiber"),
    meetsGoal_vitaminD: boolean("meets_goal_vitamin_d"),
    // ... more goal tracking

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userDateUnique: unique("daily_micro_summary_user_date").on(table.userId, table.date),
  })
);
```

---

## 📋 ROADMAP

### MVP (Weeks 1-2)
```
✅ Use micros in signal extraction (fiber, sodium, sugar)
✅ Include fiber-to-sugar ratio in correlation rules
✅ Display top micros in recommendation details
❌ Don't compute deficiency patterns yet
```

### Phase 2 (Weeks 3-4)
```
✅ Add vitamin D, magnesium, iron as secondary signals
✅ Create tier 2 correlation rules
✅ Seasonal pattern detection (vitamin D)
✅ Recovery tracking (iron + magnesium)
❌ Don't recommend supplementation yet
```

### Phase 3 (Weeks 5+)
```
✅ Full micronutrient tracking
✅ Deficiency detection algorithms
✅ Medical disclaimer + recommendations
✅ Integration with health providers
✅ Supplement recommendations (with disclaimers)
```

---

## 🚨 IMPORTANT: MEDICAL DISCLAIMER

**For MVP**: Focus on visible, behavioral correlations only.
- Don't diagnose deficiencies
- Don't recommend medical treatment
- Focus on food quality, not supplementation

**Recommendation Language**:
```
GOOD: "More fiber in meals → sustained energy"
BAD:  "You have an iron deficiency, take this supplement"

GOOD: "Plant-based eaters: consider iron-rich meals (lentils, spinach)"
BAD:  "Your iron is low, you need a supplement"
```

---

## 🎯 ANSWER TO "WHERE DO MICROS GO?"

1. **Phase 1 (MVP - Now)**
   - Use 5 key micros: fiber, sodium, sugar, (implicit protein, implicit carbs)
   - Show as secondary signals in correlations
   - Display in recommendation details
   - Location: Food correlations, recovery insights

2. **Phase 2 (Growth - Weeks 3-4)**
   - Add vitamin D, magnesium, iron
   - Use as amplifiers/mediators
   - Detect seasonal patterns
   - Location: Advanced insights (not dashboard home)

3. **Phase 3 (Premium - Weeks 5+)**
   - Full micronutrient tracking
   - Deficiency detection (with disclaimers)
   - Supplement recommendations
   - Location: Health insights section (opt-in)

---

## 📊 MICRONUTRIENT IN DASHBOARD

### Current Dashboard (MVP)
```
┌─────────────────────────────┐
│ Daily Intelligence Card     │
│ (Macro-focused correlation) │
│                             │
│ Actions: + protein, + fiber │
│ Gauge: 78% pattern strength │
└─────────────────────────────┘

Note: Micros shown in expanded details only
```

### Future Dashboard (Phase 2)
```
┌─────────────────────────────┐
│ Main Card: Macro insight    │
│                             │
│ Secondary Card:             │
│ "Vitamin D might help mood" │
│ (seasonal pattern)          │
└─────────────────────────────┘

Note: Micros promoted to cards at MASTER+ stage
```

### Premium Dashboard (Phase 3)
```
┌─────────────────────────────┐
│ Macro Card                  │
│ Micro Card (tier 2)         │
│ Health Score (aggregated)   │
│ Deficiency Alert (if any)   │
└─────────────────────────────┘

Note: Full micronutrient dashboard for ELITE users
```

---

## ✅ SUMMARY

| Phase | Focus | Micros Used | Location | User |
|-------|-------|-------------|----------|------|
| 1 (MVP) | Macros | fiber, sodium, sugar | Detail view | All |
| 2 (Growth) | Macros + Seasonal | + D, Mg, Fe | Cards | OPTIMIZER+ |
| 3 (Premium) | Macros + Micros + Health | All 15+ | Dashboard | ELITE |

**For now**: Implement Phase 1. Build the macro correlation engine, use micros as supporting signals. Don't overload MVP with deficiency detection.

---

**Status**: Micronutrient strategy aligned. Ready to build.
