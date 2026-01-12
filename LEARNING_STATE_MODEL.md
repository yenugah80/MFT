# Learning State Model
## System's Knowledge About User + Progressive Personalization

---

## 🧠 THE PROBLEM

Current system:
- Stores user feedback ✅
- Correlations expire ✅
- Shows uncertainty ✅
- But: **Doesn't track what it learned**

Example failure:
```
Day 5: User logs tofu
       System: "Tofu has high protein, try it"
Day 6: User rejects recommendation (dislikes tofu)
       System: Stores feedback ✅
Day 10: System shows same tofu recommendation again ❌
        Why? No unified "what I know about this user" model
```

---

## 🎯 LEARNING STATE MODEL

### Core Concept

```
User Signals (food history, feedback, behavior)
        ↓
Learning Engine
├─ Food Preferences (acceptance rate per food)
├─ Cuisine Preferences (Italian vs Indian)
├─ Effort Tolerance (quick 5min vs involved 45min)
├─ Budget Tolerance (cost-sensitive vs premium)
├─ Pattern Confidence (strength of discovered patterns)
├─ Behavioral Triggers (stress, tiredness, social)
└─ Lifestyle Constraints (has kitchen, time available)
        ↓
Learning State (what system knows)
├─ Confidence in each learning (0-1)
├─ Evidence base (N occurrences)
├─ Last updated (stale learning?)
└─ Contradiction flags (conflicting data)
        ↓
Resolver + Recommendations
(Use learned state to personalize)
```

---

## 📊 DATABASE SCHEMA

### Learning State Table

```javascript
export const userLearningStateTable = pgTable(
  "user_learning_state",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),

    // Learning stage
    learningStage: text("learning_stage").notNull(),
    // MINIMAL (0-7 days), LEARNING (7-30 days), PROFICIENT (30-90 days),
    // EXPERT (90+ days), PLATEAU (no new learning)

    // Overall learning confidence
    overallConfidence: decimal("overall_confidence", { precision: 3, scale: 2 }),  // 0-1
    // How confident is system in recommendations (aggregate)

    // Knowledge base
    knowledgeBase: json("knowledge_base").default({}),
    // {
    //   food_preferences: { paneer: 0.92, tofu: 0.15, rice: 0.88, ... },
    //   cuisine_preferences: { south_indian: 0.95, italian: 0.3, ... },
    //   effort_tolerance: { quick: 0.85, moderate: 0.7, involved: 0.2 },
    //   prep_types: { sambar: 0.9, curry: 0.8, stir_fry: 0.5, ... },
    //   behavioral_triggers: { stress_eating: true, skip_meals: true, ... },
    //   cost_sensitivity: 0.6,  // 0=premium, 1=budget-conscious
    //   time_available: 'moderate',  // minimal, moderate, plenty
    // }

    // Learning metrics
    totalFoodLogsAnalyzed: integer("total_food_logs_analyzed").default(0),
    totalFeedbackGiven: integer("total_feedback_given").default(0),
    feedbackAccuracy: decimal("feedback_accuracy", { precision: 3, scale: 2 }),
    // % of "yes" feedback on recommendations

    // Contradiction tracking
    contradictions: json("contradictions").default([]),
    // [
    //   { food: "paneer", acceptance: 0.9, rejections: 2, context: "only when fresh" },
    //   { pattern: "high_nova", user_says: "not always", occasions: ["weekends"] }
    // ]

    // Learning rate
    learningRate: decimal("learning_rate", { precision: 3, scale: 2 }).default("0.5"),
    // How quickly user preferences change (0.1=stable, 0.9=volatile)

    // Plateau detection
    hasPlateaued: boolean("has_plateaued").default(false),
    plateauedAt: timestamp("plateaued_at"),
    // System has learned all it can, diminishing returns

    // Audit
    lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdUnique: unique("learning_state_user_id").on(table.userId),
    stageIdx: index("learning_state_stage_idx").on(table.learningStage),
  })
);
```

### Learning Evidence Table

```javascript
export const learningEvidenceTable = pgTable(
  "learning_evidence",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    learningType: text("learning_type").notNull(),
    // "food_acceptance", "cuisine_preference", "effort_tolerance", "behavioral_trigger"

    // What was learned
    subject: text("subject").notNull(),  // "paneer", "sambar", "5min_prep", "stress"
    learningValue: text("learning_value"),  // "0.92" (acceptance) or "high" (preference)

    // Evidence points
    positiveCount: integer("positive_count").default(0),  // Times accepted/confirmed
    negativeCount: integer("negative_count").default(0),  // Times rejected/contradicted
    confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),  // 0-1

    // Context
    context: json("context").default({}),
    // { triggered_by: "high_stress", only_when: "weekend", season: "winter" }

    // Recency
    lastObservedAt: timestamp("last_observed_at"),
    firstObservedAt: timestamp("first_observed_at"),
    isActive: boolean("is_active").default(true),  // Still valid?

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userLearningTypeIdx: index("evidence_user_type_idx").on(table.userId, table.learningType),
    subjectIdx: index("evidence_subject_idx").on(table.subject),
  })
);
```

---

## 📈 LEARNING STAGES

### Stage 1: MINIMAL (0-7 days)
```
System: "I know almost nothing"
├─ Food logs: 0-20
├─ Feedback: 0-5 points
├─ Confidence: < 0.3
└─ Behavior: Show generic recommendations, collect data

Characteristics:
- Can't personalize much
- Asking for feedback constantly
- Showing variety to test user
- No strong pattern assertions
```

### Stage 2: LEARNING (7-30 days)
```
System: "I'm starting to understand"
├─ Food logs: 20-100
├─ Feedback: 5-30 points
├─ Confidence: 0.3-0.6
└─ Behavior: Personalize moderately, test hypotheses

Characteristics:
- Learning food preferences
- Testing cuisine preferences
- Discovering behavioral triggers
- Starting to build confidence in patterns
```

### Stage 3: PROFICIENT (30-90 days)
```
System: "I know you pretty well"
├─ Food logs: 100-300
├─ Feedback: 30-100 points
├─ Confidence: 0.6-0.85
└─ Behavior: Personalize heavily, predict accurately

Characteristics:
- Strong food preferences learned
- Cuisine/effort preferences stable
- Patterns predictive
- Few surprise rejections
```

### Stage 4: EXPERT (90-180 days)
```
System: "I know you very well"
├─ Food logs: 300+
├─ Feedback: 100+
├─ Confidence: 0.85-0.95
└─ Behavior: Highly personalized, anticipatory

Characteristics:
- Deep behavioral understanding
- Seasonal patterns detected
- Edge cases known
- Can handle contradictions
```

### Stage 5: PLATEAU (180+ days)
```
System: "No new learning possible"
├─ Learning rate: < 0.05
├─ New data doesn't change model
├─ Confidence: 0.95+
└─ Behavior: Maintenance mode

Characteristics:
- User behavior stable
- Recommendations rarely rejected
- Focus on execution, not learning
- Waiting for behavioral change
```

---

## 🔄 LEARNING ALGORITHM

### Process

```javascript
export async function updateLearningState(userId, event) {
  // Event types:
  // - "food_logged"
  // - "recommendation_accepted"
  // - "recommendation_rejected"
  // - "feedback_submitted"
  // - "pattern_confirmed"
  // - "pattern_denied"

  const learningState = await getLearningState(userId);

  // 1. Extract learning signal from event
  const learningSignal = extractSignal(event);
  // { type: "food_acceptance", subject: "paneer", value: +1 (accept) or -1 (reject) }

  // 2. Update evidence
  await updateEvidence(userId, learningSignal);

  // 3. Recalculate confidence
  const evidence = await getEvidence(userId, learningSignal.type);
  const newConfidence = calculateConfidence(evidence);

  // 4. Update knowledge base
  const updatedKnowledge = updateKnowledgeBase(
    learningState.knowledgeBase,
    learningSignal,
    newConfidence
  );

  // 5. Detect contradictions
  const contradictions = detectContradictions(updatedKnowledge, evidence);

  // 6. Update learning stage
  const newStage = determineStage(
    learningState.totalFoodLogsAnalyzed + 1,
    learningState.totalFeedbackGiven,
    newConfidence
  );

  // 7. Check for plateau
  const hasPlateaued = checkPlateau(
    learningState.learningRate,
    evidence
  );

  // 8. Save updated state
  await db.update(userLearningStateTable)
    .set({
      learningStage: newStage,
      knowledgeBase: updatedKnowledge,
      contradictions,
      overallConfidence: calculateOverallConfidence(updatedKnowledge),
      learningRate: calculateLearningRate(evidence),
      hasPlateaued,
      lastUpdatedAt: new Date(),
    })
    .where(eq(userLearningStateTable.userId, userId));
}

function calculateConfidence(evidence) {
  // Evidence: [{ positive: 5, negative: 1, ... }, ...]
  const total = evidence.positive + evidence.negative;
  if (total < 2) return 0.3;  // Not enough data

  // Acceptance rate
  const acceptanceRate = evidence.positive / total;

  // Weight by recency
  const recency = calculateRecency(evidence.lastObservedAt);

  // Confidence = acceptance rate * recency weight * volume weight
  const volumeWeight = Math.min(total / 10, 1.0);  // Cap at 10 observations
  const confidence = acceptanceRate * recency * volumeWeight;

  return Math.min(confidence, 0.95);  // Never 1.0 (leave room for uncertainty)
}

function detectContradictions(knowledgeBase, evidence) {
  const contradictions = [];

  // Pattern: Food with high acceptance but occasional rejection
  for (const [food, acceptance] of Object.entries(knowledgeBase.food_preferences)) {
    const foodEvidence = evidence[food];
    if (!foodEvidence) continue;

    // User mostly accepts but has rejections
    if (acceptance > 0.8 && foodEvidence.negative > 0) {
      contradictions.push({
        type: "conditional_preference",
        food,
        pattern: `${food} accepted ${acceptance}% of the time`,
        explanation: "Preference depends on context (freshness, mood, time, etc.)",
        suggestedAction: "Ask: 'Only sometimes?' to let user refine",
      });
    }

    // User mostly rejects but has acceptances
    if (acceptance < 0.3 && foodEvidence.positive > 0) {
      contradictions.push({
        type: "outlier_acceptance",
        food,
        pattern: `${food} accepted ${acceptance}% of the time`,
        explanation: "User has accepted despite low preference",
        suggestedAction: "Track context when user accepts",
      });
    }
  }

  return contradictions;
}

function calculateLearningRate(evidence) {
  // How quickly is user changing preferences?
  // Low = stable preferences (0.1)
  // High = volatile preferences (0.9)

  const recent = evidence.filter(e => daysOld(e.lastObservedAt) < 7);
  const older = evidence.filter(e => daysOld(e.lastObservedAt) >= 7 && daysOld(e.lastObservedAt) < 30);

  if (older.length === 0) return 0.5;  // Not enough data, assume moderate

  const recentChangeRate = calculateChangeRate(recent);
  const olderChangeRate = calculateChangeRate(older);

  const volatility = Math.abs(recentChangeRate - olderChangeRate);
  return Math.min(volatility, 1.0);
}

function checkPlateau(learningRate, evidence) {
  // System has plateaued if:
  // 1. Learning rate < 0.05 (very stable)
  // 2. No contradictions
  // 3. 90+ days of data
  // 4. Overall confidence > 0.85

  return (
    learningRate < 0.05 &&
    evidence.length > 0 &&
    evidence.every(e => daysOld(e.firstObservedAt) > 90) &&
    calculateOverallConfidence(evidence) > 0.85
  );
}
```

---

## 🎯 RESOLVER USES LEARNING STATE

### Before (without learning state):
```javascript
resolveIntent("add_protein") →
  Search user history for protein foods →
  Return first available (generic)
```

### After (with learning state):
```javascript
resolveIntent("add_protein") →
  Get learning state (know user preferences) →
  Check food_preferences: { paneer: 0.92, tofu: 0.15, chicken: 0.3 } →
  Rank by acceptance rate →
  Return: Paneer (highest confidence)
  With confidence: 0.92 (system learned this)
```

### Resolution Flow

```javascript
export async function resolveIntentWithLearning(
  intent,
  userId,
  constraints
) {
  // 1. Get learning state
  const learningState = await getLearningState(userId);

  if (learningState.learningStage === 'MINIMAL') {
    // Show generic + ask for feedback
    return {
      action: "Try paneer or tofu",
      actions: [
        { food: "paneer", confidence: null, ask_feedback: true },
        { food: "tofu", confidence: null, ask_feedback: true },
      ],
    };
  }

  if (learningState.learningStage === 'LEARNING') {
    // Show top option + 1 alternative
    const preferences = learningState.knowledgeBase.food_preferences;
    const paneerConf = preferences.paneer || 0.5;
    const tofuConf = preferences.tofu || 0.3;

    return {
      action: paneerConf > tofuConf ? "paneer" : "tofu",
      confidence: paneerConf,
      recommendation_confidence: "Emerging preference",
    };
  }

  if (learningState.learningStage in ['PROFICIENT', 'EXPERT']) {
    // Show learned preference
    const preferences = learningState.knowledgeBase.food_preferences;
    const sorted = Object.entries(preferences)
      .filter(([food, conf]) => conf > 0.6)
      .sort(([, a], [, b]) => b - a);

    const topFood = sorted[0];

    return {
      action: topFood[0],
      confidence: topFood[1],
      reasoning: "Based on your preferences",
      why_confident: "You've chosen this ${N} times (${acceptance}%)",
    };
  }

  if (learningState.learningStage === 'PLATEAU') {
    // Show high-confidence preference
    const preferences = learningState.knowledgeBase.food_preferences;
    const topFood = Object.entries(preferences)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      action: topFood[0],
      confidence: topFood[1],
      reasoning: "You consistently choose this",
      personalPronoun: "Your go-to choice",
    };
  }
}
```

---

## 🚨 CONTRADICTION HANDLING

### Example: Paneer Preference

```
Evidence:
- Paneer logged: 12 times
- Paneer accepted: 10 times (83%)
- Paneer rejected: 2 times
- Context of rejections:
  - Once: "Too oily this time" (quality issue)
  - Once: "Not hungry" (context, not food)

Learning Model:
- Food preference: paneer = 0.85
- Contradiction detected: "Conditional preference"
- System learns: "User loves paneer IF fresh/properly cooked"

Resolver Action:
- Recommendation: Paneer (high confidence)
- Note in UI: "You love paneer (85%)"
- Intent override option: "Only when fresh" (let user refine)
```

### Recommendation When Contradiction Exists

```javascript
export function handleContradictionInRecommendation(
  food,
  contradiction,
  learningState
) {
  if (contradiction.type === 'conditional_preference') {
    return {
      headline: `You love ${food}`,
      subtitle: `Usually (${contradiction.acceptance}%), but sometimes not`,
      note: `Help us understand: When do you NOT want ${food}?`,
      actions: [
        {
          label: "Only when fresh",
          value: "only_when_fresh",
        },
        {
          label: "Depends on preparation",
          value: "depends_prep",
        },
        {
          label: "Just varies",
          value: "unpredictable",
        },
      ],
    };
  }
}
```

---

## 📊 LEARNING PROGRESSION IN UI

### Stage-Based Messaging

```
MINIMAL (Day 1-7):
├─ Recommendation: "Try this"
├─ Confidence label: "We're learning about you"
├─ UI: Show generic + ask feedback
└─ Tone: Exploratory

LEARNING (Day 7-30):
├─ Recommendation: "We think you might like..."
├─ Confidence label: "Still learning (${confidence}%)"
├─ UI: Show top choice + alternative
└─ Tone: Tentative but improving

PROFICIENT (Day 30-90):
├─ Recommendation: "Based on your taste..."
├─ Confidence label: "We're fairly confident (${confidence}%)"
├─ UI: Show learned preference
└─ Tone: Knowledgeable

EXPERT (Day 90-180):
├─ Recommendation: "You consistently choose..."
├─ Confidence label: "${confidence}% confident"
├─ UI: Show strong preference with reasoning
└─ Tone: Authoritative, anticipatory

PLATEAU (180+ days):
├─ Recommendation: "Your go-to..."
├─ Confidence label: "${confidence}% match to your preferences"
├─ UI: Show with full context
└─ Tone: Partnership, "I know you"
```

### Dashboard: Learning Progress Card

```
┌─────────────────────────────┐
│ 🧠 My Learning Progress     │
├─────────────────────────────┤
│                             │
│ Stage: Learning             │
│ Progress: Day 18 of 30      │
│ [████████░░░░░░░░]          │
│                             │
│ What I've learned:          │
│ ✓ You love paneer (92%)     │
│ ✓ Prefer quick meals (7min) │
│ ✓ Love south Indian foods   │
│ ? Still learning: Sweetness │
│                             │
│ Next milestone:             │
│ → Reach "Proficient" stage  │
│ → 12 more days              │
│                             │
│ Your feedback: +23 points   │
│ (Helps me learn faster)     │
│                             │
└─────────────────────────────┘
```

---

## 🔗 INTEGRATION WITH OTHER LAYERS

```
Event (user logged paneer)
        ↓
Update Learning State ← NEW
├─ Add to evidence: paneer +1
├─ Update confidence: 0.92
├─ Detect contradictions: None
└─ Remain in LEARNING stage
        ↓
Correlation Engine (unchanged)
        ↓
Orchestrator (unchanged)
        ↓
Resolver (uses Learning State)
├─ Check preferences: paneer = 0.92
├─ Resolve: "Add paneer"
└─ Confidence: 0.92
        ↓
Intent Override (uses Learning State)
├─ User rejects tofu
├─ Update evidence: tofu -1
├─ Learning state updates: tofu = 0.15
└─ Next time: Won't recommend tofu
        ↓
Expiry (uses Learning State)
├─ Check: Is this still valid?
├─ If contradiction detected: Ask user to refine
└─ If plateau: Low priority for revalidation
        ↓
Uncertainty States (uses Learning State)
├─ If learning_stage = MINIMAL: "Still learning"
├─ If confidence = 0.92: "Clear pattern"
└─ If contradiction: "Sometimes, context matters"
        ↓
Frontend (displays with learning awareness)
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 0: Foundation
- [ ] Create learning_state table
- [ ] Create learning_evidence table
- [ ] Build updateLearningState() service
- [ ] Build calculateConfidence() logic
- [ ] Build detectContradictions() logic

### Phase 1: Integration
- [ ] Update Resolver to use learning state
- [ ] Update Intent Override to update learning state
- [ ] Update Expiry to check learning stage
- [ ] Display learning stage in dashboard
- [ ] Show confidence in recommendations

### Phase 2: Smart Features
- [ ] Contradiction detection + UI prompts
- [ ] Learning rate calculation
- [ ] Plateau detection
- [ ] Progressive personalization (stage-based messaging)
- [ ] Learning progress card

### Phase 3: Advanced
- [ ] Behavioral trigger learning
- [ ] Seasonal pattern detection in learning state
- [ ] Cost/effort sensitivity learning
- [ ] Cuisine preference evolution
- [ ] "Explain why I'm learning this" feature

---

## 🎯 SUMMARY

| Feature | Without | With |
|---------|---------|------|
| Personalization | Generic | User-specific (paneer vs tofu) |
| Confidence | Binary (known/unknown) | Graduated (0-1) |
| Resolver | Random ranking | Preference ranking |
| Contradictions | Ignored | Detected & prompted |
| Learning Stage | Hidden | Visible ("Still learning") |
| Recommendations | Same forever | Evolve over time |
| User Feedback | Stored but ignored | Actively used |

**Result**: System gets smarter about THIS user, not just this generic user. Trust grows with each interaction.

---

**Status**: Design complete. Ready for implementation alongside Resolver, Intent Override, Expiry Model, and Uncertainty States.
