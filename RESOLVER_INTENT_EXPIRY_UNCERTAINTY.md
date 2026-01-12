# Critical Missing Layers
## Resolver + User Intent Override + Expiry Model + Uncertainty States

---

## 1. RECOMMENDATION RESOLVER

### Purpose
Transform generic correlation → personalized, executable action

### Architecture

```
Orchestrator Output:
{
  correlation: { ruleName: "high_nova_mood_crash", ... },
  decision: "SPEAK",
  message: { headline, subtitle, actions: ["Add protein", ...] }
}
              ↓
Resolver Input: User profile + constraints
              ↓
Resolver Processing:
  1. Extract intent ("add protein")
  2. Map to user's actual foods (history + preferences)
  3. Filter by: allergies, diet, budget, region
  4. Rank by: likelihood of acceptance, effort
  5. Generate specific action
              ↓
Resolver Output:
{
  actions: [
    {
      icon: "🥛",
      text: "Add paneer to lunch",
      description: "25g protein, stabilizes mood",
      specifics: "100g paneer sambar (15min prep)",
      navigationTarget: "/(tabs)/log?food=paneer_sambar",
      confidence: 0.92,  // "user will accept this action"
      reasoning: "You logged paneer 12x, south Indian cuisine"
    }
  ]
}
```

### Database Schema

```javascript
export const userIntentMappingsTable = pgTable(
  "user_intent_mappings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),

    // Generic intent → User's foods
    genericIntent: text("generic_intent").notNull(),  // "add_protein", "increase_hydration"
    userFoods: json("user_foods").default([]),        // ["paneer", "yogurt", "dal", ...]
    userDrinks: json("user_drinks").default([]),      // ["water", "coconut_water", ...]

    // Preferences
    favoritePreparations: json("favorite_preps").default([]),  // ["sambar", "curry", ...]
    effortLevel: text("effort_level"),  // "quick" (5min), "easy" (15min), "involved" (45min)

    // Filtering rules
    excludeFoods: json("exclude_foods").default([]),  // allergies + dislikes
    dietaryRestrictions: json("dietary").default([]), // vegan, keto, etc.

    // Region-specific
    cuisinePreferences: json("cuisine_prefs").default([]),  // ["south_indian", "punjabi"]
    availabilityRegion: text("region"),  // "south_india", "north_india", "us", etc.

    // Cost/accessibility
    budgetLevel: text("budget_level"),  // "affordable", "moderate", "premium"
    hasKitchen: boolean("has_kitchen").default(true),

    // Learning
    acceptanceRate: json("acceptance_rate").default({}),  // { "paneer": 0.92, "tofu": 0.1 }
    rejectionReasons: json("rejection_reasons").default({}),  // { "tofu": ["taste", "texture"] }
    lastUpdatedAt: timestamp("last_updated_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdUnique: unique("user_intent_map_user_id").on(table.userId),
  })
);
```

### Service Implementation

```javascript
export async function resolveRecommendation(
  baseCorrelation,
  orchestratorDecision,
  userId,
  userMessage
) {
  // 1. Get user preferences & history
  const userProfile = await getUserProfile(userId);
  const userIntents = await getUserIntentMappings(userId);
  const foodHistory = await getUserFoodHistory(userId, 30);  // Last 30 days
  const budget = await calculateRemainingBudget(userId);

  // 2. Extract generic intent from message
  const intents = extractIntents(userMessage.actions);
  // ["add_protein", "increase_fiber", "reduce_sodium"]

  // 3. For each intent, resolve to specific foods/actions
  const resolvedActions = [];

  for (const intent of intents) {
    const specificAction = await resolveIntent(
      intent,
      {
        userIntents,
        foodHistory,
        budget,
        allergies: userProfile.allergies,
        dietaryRestrictions: userProfile.dietaryRestrictions,
        region: userProfile.region,
        acceptanceRate: userIntents.acceptanceRate,
      }
    );

    if (specificAction) {
      resolvedActions.push(specificAction);
    }
  }

  // 4. Return personalized recommendation
  return {
    ...userMessage,
    actions: resolvedActions,
    resolverConfidence: calculateResolverConfidence(resolvedActions),
  };
}

async function resolveIntent(intent, userContext) {
  // Map generic intent to user's foods
  const foods = userContext.userIntents[intent];  // ["paneer", "yogurt", "dal"]

  if (!foods || foods.length === 0) {
    return null;  // Can't resolve (no history)
  }

  // Filter by constraints
  const available = foods.filter(food => {
    const isAllergen = userContext.allergies.includes(food);
    const violatesDiet = checkDietaryViolation(food, userContext.dietaryRestrictions);
    const fitsBudget = checkBudget(food, userContext.budget);

    return !isAllergen && !violatesDiet && fitsBudget;
  });

  if (available.length === 0) {
    return null;  // No valid options
  }

  // Rank by likelihood of acceptance
  const ranked = available.sort((a, b) => {
    const acceptanceA = userContext.acceptanceRate[a] || 0.5;
    const acceptanceB = userContext.acceptanceRate[b] || 0.5;
    return acceptanceB - acceptanceA;  // Descending
  });

  const topFood = ranked[0];
  const acceptanceConfidence = userContext.acceptanceRate[topFood] || 0.5;

  // Generate specific action
  return {
    icon: getFoodEmoji(topFood),
    text: `Add ${topFood} to meal`,
    description: generateDescription(topFood, intent),
    specifics: generateSpecifics(topFood),
    navigationTarget: `/(tabs)/log?food=${topFood}`,
    confidence: acceptanceConfidence,  // "likelihood user accepts this"
    reasoning: generateReasoning(topFood, userContext),
  };
}

function generateReasoning(food, context) {
  const reasons = [];

  if (context.acceptanceRate[food] > 0.8) {
    reasons.push(`You logged ${food} regularly`);
  }

  if (context.foodHistory.topFoods.includes(food)) {
    reasons.push(`One of your favorites`);
  }

  if (context.region === "south_india" && isRegionalFood(food, "south_india")) {
    reasons.push(`South Indian staple`);
  }

  return reasons.join(" • ");
}
```

---

## 2. USER INTENT OVERRIDE LOGIC

### Purpose
Users override correlations ("I actually like this" or "This doesn't apply")

### Database Schema

```javascript
export const userCorrelationFeedbackTable = pgTable(
  "user_correlation_feedback",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    correlationId: integer("correlation_id").notNull(),

    // Feedback type
    feedbackType: text("feedback_type").notNull(),  // "accept", "reject", "refine", "context"
    // accept: "Yes, this pattern is real"
    // reject: "No, this doesn't apply to me"
    // refine: "Yes, but only when X"
    // context: "This is true because of Y (not the food)"

    // Specific overrides
    isOverridden: boolean("is_overridden").default(false),  // User said "ignore this"
    overrideReason: text("override_reason"),  // "I love this food", "Not the cause", "Already fixed"

    // Conditional refinement
    refinedCondition: json("refined_condition").default({}),
    // { "only_if": "stressed", "except_when": "exercised" }
    // { "strength_modifier": 0.5 }  // "Pattern is weaker than detected"

    // Evidence override
    dismissedEvidence: json("dismissed_evidence").default([]),  // Evidence point IDs user rejected

    // Context: external factors user attributes
    externalCause: text("external_cause"),  // "I was sick", "Bad sleep", "Stress from work"

    // Confidence impact
    confidenceAdjustment: decimal("confidence_adjustment", { precision: 3, scale: 2 }),
    // +0.1 if user confirms, -0.2 if user rejects

    // Audit
    submittedAt: timestamp("submitted_at").defaultNow(),
    feedbackSource: text("feedback_source"),  // "dashboard_card", "detail_sheet", "push_notification"

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userCorrelationUnique: unique("feedback_user_corr_unique").on(
      table.userId,
      table.correlationId
    ),
    userIdx: index("feedback_user_idx").on(table.userId),
    correlationIdx: index("feedback_corr_idx").on(table.correlationId),
  })
);
```

### UI for Feedback

```javascript
// CorrelationDetailSheet.jsx

export function FeedbackButtons({ correlation, onSubmitFeedback }) {
  return (
    <FeedbackContainer>
      {/* Accept: Pattern is real */}
      <FeedbackButton
        icon="👍"
        label="This is accurate"
        description="Yes, I notice this pattern"
        onTap={() => onSubmitFeedback('accept')}
      />

      {/* Reject: Pattern is NOT real */}
      <FeedbackButton
        icon="👎"
        label="This doesn't apply"
        description="I don't see this pattern"
        onTap={() => onSubmitFeedback('reject')}
      />

      {/* Refine: Pattern is conditional */}
      <FeedbackButton
        icon="🎯"
        label="Only sometimes"
        description="True only when... (tap to explain)"
        onTap={() => openRefineSheet()}
      />

      {/* Context: External cause */}
      <FeedbackButton
        icon="🤔"
        label="Different reason"
        description="Actually caused by... (tap to explain)"
        onTap={() => openContextSheet()}
      />

      {/* Dismiss: Override permanently */}
      <FeedbackButton
        icon="🚫"
        label="Stop showing this"
        description="Never mention this again"
        onTap={() => onSubmitFeedback('override')}
      />
    </FeedbackContainer>
  );
}

// When user taps "Only sometimes"
export function RefinePatternSheet({ correlation, onSubmit }) {
  return (
    <BottomSheet>
      <Title>When does this happen?</Title>

      {/* Conditional options */}
      <ToggleGroup>
        <Toggle label="Only when stressed" name="only_if_stressed" />
        <Toggle label="Only on weekends" name="only_weekends" />
        <Toggle label="Only when tired" name="only_tired" />
        <Toggle label="Except after exercise" name="except_exercise" />
      </ToggleGroup>

      <Slider
        label="How strong is the pattern?"
        min={0.3}  // User says it's weaker than detected
        max={1.0}
        defaultValue={correlation.confidence}
        onUpdate={(val) => setStrengthModifier(val)}
      />

      <Button onTap={() => onSubmit({ type: 'refine', conditions, strengthMod })}>
        Save Refinement
      </Button>
    </BottomSheet>
  );
}

// When user taps "Different reason"
export function ContextSheet({ correlation, onSubmit }) {
  return (
    <BottomSheet>
      <Title>What's the real cause?</Title>

      <TextInput
        placeholder="e.g., I was sick, bad sleep, stressful work day, medication change"
        multiline
        onChangeText={setExternalCause}
      />

      <Select label="Does this still matter?">
        <Option value="keep">Keep watching this pattern</Option>
        <Option value="suppress">Don't show this pattern anymore</Option>
      </Select>

      <Button onTap={() => onSubmit({ type: 'context', externalCause })}>
        Save Context
      </Button>
    </BottomSheet>
  );
}
```

### Service: Apply Feedback

```javascript
export async function applyUserFeedback(
  userId,
  correlationId,
  feedback
) {
  const { feedbackType, refinedCondition, externalCause, overrideReason } = feedback;

  // Store feedback
  await db.insert(userCorrelationFeedbackTable).values({
    userId,
    correlationId,
    feedbackType,
    refinedCondition,
    externalCause,
    isOverridden: feedbackType === 'override',
    overrideReason,
  });

  // Update correlation based on feedback
  const correlation = await db
    .select()
    .from(userCorrelationsTable)
    .where(eq(userCorrelationsTable.id, correlationId))
    .limit(1);

  if (!correlation) return;

  let confidenceAdjustment = 0;

  switch (feedbackType) {
    case 'accept':
      // User confirms: increase confidence
      confidenceAdjustment = +0.1;
      break;
    case 'reject':
      // User denies: decrease confidence
      confidenceAdjustment = -0.2;
      // If enough rejections, deactivate
      if (correlation.confidence + confidenceAdjustment < 0.4) {
        await deactivateCorrelation(correlationId);
        return;
      }
      break;
    case 'refine':
      // User clarifies condition: adjust strength
      const strengthMod = refinedCondition.strength_modifier || 1.0;
      await db.update(userCorrelationsTable)
        .set({
          strength: parseFloat(correlation.strength) * strengthMod,
          expectedOutcome: `${correlation.expectedOutcome} (when ${Object.keys(refinedCondition).join(', ')})`,
        })
        .where(eq(userCorrelationsTable.id, correlationId));
      break;
    case 'context':
      // User attributes to external cause: suppress
      confidenceAdjustment = -0.15;
      break;
    case 'override':
      // User permanently dismisses
      await deactivateCorrelation(correlationId);
      return;
  }

  // Update confidence
  const newConfidence = Math.max(0, Math.min(1,
    parseFloat(correlation.confidence) + confidenceAdjustment
  ));

  await db.update(userCorrelationsTable)
    .set({
      confidence: newConfidence,
      updatedAt: new Date(),
    })
    .where(eq(userCorrelationsTable.id, correlationId));
}
```

---

## 3. RECOMMENDATION EXPIRY MODEL

### Purpose
Recommendations expire, need re-validation, don't stale

### Database Schema

```javascript
export const recommendationExpiryTable = pgTable(
  "recommendation_expiry",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    correlationId: integer("correlation_id").notNull(),

    // Expiry tracking
    expiryType: text("expiry_type").notNull(),  // "observation", "action", "prediction"
    expiresAt: timestamp("expires_at").notNull(),
    reason: text("reason"),  // Why it expires

    // Validation tracking
    requiresRevalidation: boolean("requires_revalidation").default(false),
    revalidationDueAt: timestamp("revalidation_due_at"),
    revalidationPromptShown: boolean("revalidation_prompt_shown").default(false),

    // Lifecycle
    status: text("status").default("active"),  // "active", "expiring_soon", "expired", "revalidated"
    expiryReason: text("expiry_reason"),  // "no_new_evidence", "user_rejected", "seasonal_change"

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userCorrelationUnique: unique("expiry_user_corr_unique").on(
      table.userId,
      table.correlationId
    ),
    expiresAtIdx: index("expiry_expires_at_idx").on(table.expiresAt),
  })
);
```

### Expiry Rules

```javascript
const EXPIRY_RULES = {
  // Observation: "We've seen X happen N times"
  observation: {
    // If no new evidence in 14 days, expiring
    expiresIn: 14 * 24 * 60 * 60 * 1000,  // 14 days
    reason: "No new observations",
    requiresRevalidation: true,
    message: "We haven't seen this pattern recently. Still relevant?",
  },

  // Action: "Try doing X to solve Y"
  action: {
    // If user doesn't try action in 7 days, expiring
    expiresIn: 7 * 24 * 60 * 60 * 1000,  // 7 days
    reason: "Action not taken",
    requiresRevalidation: true,
    message: "We recommended this action. Want to try it?",
  },

  // Prediction: "Based on pattern, tomorrow you'll feel X"
  prediction: {
    // Expires after the predicted day passes
    expiresIn: 1 * 24 * 60 * 60 * 1000,  // 1 day
    reason: "Prediction window closed",
    requiresRevalidation: true,
    message: "Did our prediction come true?",
  },

  // Seasonal: "Winter months show lower mood"
  seasonal: {
    // Expires when season changes
    expiresIn: null,  // Custom calculation
    reason: "Seasonal pattern expired",
    requiresRevalidation: true,
    checkFunction: (correlation) => {
      const now = new Date();
      const season = getSeason(now);
      const correlationSeason = correlation.detectedSeason;
      return season !== correlationSeason;
    },
  },

  // Deficiency: "Low iron levels detected"
  deficiency: {
    // Expires when resolved (food added to diet) or after 30 days
    expiresIn: 30 * 24 * 60 * 60 * 1000,  // 30 days
    reason: "Deficiency pattern expired",
    requiresRevalidation: true,
    checkFunction: (correlation, userLogs) => {
      const recentIron = calculateAverageNutrient('iron', userLogs, 7);
      return recentIron > correlation.threshold;  // Resolved
    },
  },
};
```

### Service: Manage Expiry

```javascript
export async function checkAndExpireRecommendations(userId) {
  // Find correlations expiring soon or already expired
  const expiringCorrelations = await db
    .select()
    .from(recommendationExpiryTable)
    .where(
      and(
        eq(recommendationExpiryTable.userId, userId),
        eq(recommendationExpiryTable.status, 'active'),
        lte(recommendationExpiryTable.expiresAt, new Date())
      )
    );

  const expiringAction = [];

  for (const expiry of expiringCorrelations) {
    const correlation = await getCorrelation(expiry.correlationId);

    if (expiry.requiresRevalidation) {
      // Show user: "Does this still apply?"
      expiringAction.push({
        type: 'revalidation_prompt',
        correlationId: expiry.correlationId,
        headline: `Still relevant?`,
        subtitle: correlation.expectedOutcome,
        message: expiry.reason,
        actions: [
          { label: 'Still seeing this', value: 'confirm' },
          { label: 'Not anymore', value: 'dismiss' },
          { label: 'Need more time', value: 'extend' },
        ],
      });

      // Mark prompt as shown
      await db.update(recommendationExpiryTable)
        .set({ revalidationPromptShown: true })
        .where(eq(recommendationExpiryTable.id, expiry.id));
    } else {
      // Just expire it
      await db.update(recommendationExpiryTable)
        .set({ status: 'expired' })
        .where(eq(recommendationExpiryTable.id, expiry.id));

      await deactivateCorrelation(expiry.correlationId);
    }
  }

  return expiringAction;
}

export async function handleRevalidationResponse(
  userId,
  correlationId,
  response
) {
  const expiry = await db
    .select()
    .from(recommendationExpiryTable)
    .where(
      and(
        eq(recommendationExpiryTable.userId, userId),
        eq(recommendationExpiryTable.correlationId, correlationId)
      )
    )
    .limit(1);

  if (!expiry) return;

  switch (response) {
    case 'confirm':
      // User confirms pattern still exists
      // Reset expiry
      const newExpiresAt = new Date(Date.now() + EXPIRY_RULES[expiry.expiryType].expiresIn);
      await db.update(recommendationExpiryTable)
        .set({
          expiresAt: newExpiresAt,
          status: 'revalidated',
          revalidationPromptShown: false,
        })
        .where(eq(recommendationExpiryTable.id, expiry.id));

      // Increase confidence (user confirmed)
      const correlation = await getCorrelation(correlationId);
      await updateCorrelationConfidence(
        correlationId,
        Math.min(1, parseFloat(correlation.confidence) + 0.1)
      );
      break;

    case 'dismiss':
      // User says pattern no longer applies
      await db.update(recommendationExpiryTable)
        .set({ status: 'expired' })
        .where(eq(recommendationExpiryTable.id, expiry.id));

      await deactivateCorrelation(correlationId);
      break;

    case 'extend':
      // User needs more time
      const extendedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 more days
      await db.update(recommendationExpiryTable)
        .set({
          expiresAt: extendedExpiry,
          status: 'active',
          revalidationPromptShown: false,
        })
        .where(eq(recommendationExpiryTable.id, expiry.id));
      break;
  }
}
```

### Dashboard: Expiry Warnings

```javascript
// DashboardContent.jsx

export function ExpiryWarningCard({ expiringRecommendations }) {
  if (expiringRecommendations.length === 0) return null;

  return (
    <WarningCard style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}>
      <Title>Need your feedback</Title>

      {expiringRecommendations.map((item) => (
        <ExpiryItem key={item.correlationId}>
          <Subtitle>{item.headline}</Subtitle>
          <Description>{item.subtitle}</Description>

          <ButtonGroup>
            <Button
              primary
              onTap={() => handleResponse(item.correlationId, 'confirm')}
            >
              Still seeing this
            </Button>
            <Button
              secondary
              onTap={() => handleResponse(item.correlationId, 'dismiss')}
            >
              Not anymore
            </Button>
          </ButtonGroup>
        </ExpiryItem>
      ))}
    </WarningCard>
  );
}
```

---

## 4. EXPLICIT "WE'RE NOT SURE" STATE

### Problem
Currently: Low confidence → silence (no message)
Reality: Users want to see uncertainty, not emptiness

### Solution: Show uncertainty explicitly

### States

```javascript
const CONFIDENCE_STATES = {
  // 0.0-0.3: Not enough data
  INSUFFICIENT_DATA: {
    headline: "Still learning",
    subtitle: "Log a few more [meals/days/exercises] for patterns to emerge",
    visual: "empty_state",
    action: "Keep logging",
    color: "gray",
  },

  // 0.3-0.5: Early signal
  EARLY_SIGNAL: {
    headline: "Early pattern spotted",
    subtitle: "We've only seen this 1-2 times. Keep an eye out.",
    visual: "eye_icon",
    confidence_label: "Early signal • Still learning",
    color: "amber",
  },

  // 0.5-0.7: Emerging pattern
  EMERGING_PATTERN: {
    headline: "Pattern emerging",
    subtitle: "Seen this [N] times. Might be real.",
    visual: "question_mark",
    confidence_label: "Uncertain • Needs more data",
    color: "blue",
  },

  // 0.7-0.9: Confident pattern
  CONFIDENT_PATTERN: {
    headline: "Clear pattern",
    subtitle: "We're [confidence]% sure about this.",
    visual: "checkmark",
    confidence_label: `${confidence}% confident`,
    color: "green",
  },

  // 0.9-1.0: Very confident
  VERY_CONFIDENT: {
    headline: "Strong pattern",
    subtitle: "Consistently happens.",
    visual: "checkmark_filled",
    confidence_label: `${confidence}% confident`,
    color: "deep_green",
  },

  // Special: Confounded (low confidence due to external factors)
  CONFOUNDED: {
    headline: "Pattern unclear",
    subtitle: "Sleep/stress might be masking the real pattern.",
    visual: "confused_face",
    confidence_label: "Uncertain • Other factors at play",
    action: "Track your sleep to clarify",
    color: "orange",
  },

  // Special: Inverse (user experience contradicts pattern)
  USER_SAYS_NO: {
    headline: "You said 'not me'",
    subtitle: "You marked this as 'doesn't apply'. Keeping it quiet.",
    visual: "muted_icon",
    confidence_label: "Dismissed by you",
    action: "Re-enable if you change your mind",
    color: "gray",
  },
};
```

### UI Implementation

```javascript
export function UncertaintyIndicator({ correlation }) {
  const state = getConfidenceState(correlation.confidence);

  return (
    <UncertaintyContainer>
      {/* Visual indicator */}
      <StateIcon>{state.visual}</StateIcon>

      {/* Headline + Subtitle */}
      <Headline>{state.headline}</Headline>
      <Subtitle>{state.subtitle}</Subtitle>

      {/* Confidence gauge (explicit) */}
      <ConfidenceGauge value={correlation.confidence} />
      <ConfidenceLabel>{state.confidence_label}</ConfidenceLabel>

      {/* User action */}
      {state.action && (
        <ActionButton onTap={() => handleAction(state.action)}>
          {state.action}
        </ActionButton>
      )}

      {/* Help text */}
      <HelpText>
        We'll keep watching. {Math.floor((1 - correlation.confidence) * 100)}%
        more evidence needed to be sure.
      </HelpText>
    </UncertaintyContainer>
  );
}
```

### States in Dashboard

```
┌─────────────────────────────────┐
│ YOUR INTELLIGENCE                │
├─────────────────────────────────┤
│                                 │
│ 🟢 Clear Patterns (0.8+)        │
│   ✓ Mood dips after sugar      │
│   ✓ Hydration + energy link    │
│                                 │
│ 🟡 Emerging (0.5-0.8)          │
│   ⚠ Coffee affecting sleep?    │
│   ⚠ Weekend eating pattern     │
│                                 │
│ 🔵 Early Signals (0.3-0.5)     │
│   👀 Still learning about...   │
│   👀 Early signal: salt impact │
│                                 │
│ ⚪ Not Enough Data (0-0.3)     │
│   📋 Log more meals            │
│   📋 Log more mood entries     │
│                                 │
│ 🔇 Dismissed by You            │
│   ✖ High-fat meals (you said no│
│                                 │
└─────────────────────────────────┘
```

### Progressive Disclosure

```javascript
// User sees uncertainty progressively

// Week 1: Empty state
"Keep logging to discover patterns"

// Week 2: Early signals
"Early signal: Chocolate → energy dips (seen 2x)"
Confidence: 🔵 Still learning (50%)

// Week 3: Emerging pattern
"Pattern emerging: High sugar → mood crashes"
Confidence: 🟡 Emerging (65%)

// Week 4: Clear pattern
"Clear pattern: High-NOVA meals → energy crashes 2-4h later"
Confidence: 🟢 Clear (78%)

// If user says "not me"
"You marked this as 'doesn't apply'. Keeping quiet. (Re-enable?)"
Confidence: 🔇 Dismissed
```

---

## 5. INTEGRATION: RESOLVER + INTENT + EXPIRY + UNCERTAINTY

### Complete Flow

```
User Logs Food/Mood/Water
        ↓
Correlation Engine (detects)
        ↓
Orchestrator (decides SPEAK/REINFORCE/PREDICT/SILENT)
        ↓
Get Confidence State (INSUFFICIENT/EARLY/EMERGING/CONFIDENT/etc.)
        ↓
Check User Intent Overrides (user said "reject", "refine", etc.)
        ↓
Check Expiry (is this recommendation still valid?)
        ↓
Resolver (transform to specific actions)
        ↓
Decision:
  ├─ Show with Uncertainty Label + Actions (if confident)
  ├─ Show as "Early Signal" (0.3-0.5)
  ├─ Show as "Still Learning" (0-0.3)
  ├─ Show Revalidation Prompt (expiring)
  ├─ Stay Silent (user overridden)
  └─ Show "Dismissed by You" (inactive)
        ↓
Frontend Displays
```

### Database Additions

```javascript
// In recommendationOrchestratorService output:

{
  correlation: { ... },
  message: { ... },
  resolved_actions: [ ... ],  // From Resolver
  user_intent: { ... },       // User overrides
  expiry: { ... },            // Expiry info
  uncertainty_state: "EARLY_SIGNAL",  // Confidence state
  confidence_label: "50% • Still learning",
  show_revalidation: false,
  should_display: true,
  suppression_reason: null,  // If hidden: "user_override", "expired", "insufficient_data"
}
```

---

## Implementation Roadmap

### Phase 0 (Before Rollout)
- [ ] Add intent feedback table
- [ ] Add expiry model table
- [ ] Implement Resolver service
- [ ] Update Orchestrator to call Resolver
- [ ] Add uncertainty states to recommendation object

### Phase 1 (MVP)
- [ ] Basic intent feedback (accept/reject)
- [ ] Basic expiry (14 days, require revalidation)
- [ ] Resolver v1 (basic food mapping)
- [ ] Show uncertainty labels

### Phase 2 (Growth)
- [ ] Advanced intent (refine conditions, context override)
- [ ] Seasonal expiry logic
- [ ] Resolver v2 (history-based ranking)
- [ ] Revalidation prompts

### Phase 3 (Premium)
- [ ] Deficiency detection with expiry
- [ ] Resolver v3 (cost/accessibility)
- [ ] Confidence-based display (not binary)
- [ ] Dashboard uncertainty cards

---

## Summary

| Feature | Purpose | User Impact |
|---------|---------|-------------|
| **Resolver** | Generic → Specific actions | "Add paneer" not "add protein" |
| **Intent Override** | User corrects system | System learns from feedback |
| **Expiry Model** | Recommendations stay fresh | No stale patterns forever |
| **Uncertainty States** | Explicit "not sure" vs silent | Transparency, trust, honesty |

**Together**: System is honest about what it knows, learns from users, doesn't show stale data, personalizes deeply.

---

**Status**: Design complete. Ready for implementation.
