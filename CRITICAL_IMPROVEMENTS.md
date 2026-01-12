# Critical Improvements & Corrections

## 1. CONFOUNDING FACTOR CLASSIFICATION

### Problem
Current approach: Single penalty multiplier reduces confidence uniformly. Doesn't distinguish between different types of confounding.

### Solution: Three Types of Confounders

```javascript
// Type 1: CONFOUNDER - Reduces confidence
// Sleep explains mood variance better than food
{
  name: 'poor_sleep',
  type: 'CONFOUNDER',
  confidencePenalty: 0.70,  // 30% reduction
  explanation: 'Poor sleep explains most mood variance'
}

// Type 2: AMPLIFIER - Increases impact severity
// Exercise without proper recovery amplifies energy impact
{
  name: 'exercise_insufficient_recovery',
  type: 'AMPLIFIER',
  severityMultiplier: 1.3,  // 30% increase in expected impact
  explanation: 'Unrecovered exercise amplifies energy crashes'
}

// Type 3: MEDIATOR - Changes relationship structure
// Coffee + dehydration creates false energy → crash pattern
{
  name: 'coffee_dehydration_mediator',
  type: 'MEDIATOR',
  effect: 'relationship_change',
  explanation: 'Coffee masks dehydration, creating boom-bust cycle',
  newStrengthEstimate: 0.85  // Higher than just food-mood
}
```

### Implementation

```javascript
export function classifyConfoundingFactors(moodSignals, foodSignals, waterSignals) {
  const confounders = {
    byType: {
      confounder: [],      // Reduce confidence
      amplifier: [],       // Increase severity
      mediator: [],        // Change relationship
    },
    confidencePenalty: 1.0,  // Multiplicative (0.7 = 30% reduction)
    severityMultiplier: 1.0, // Multiplicative
  };

  // --- CONFOUNDERS (reduce confidence) ---
  const hasPoorSleep = moodSignals.some(m => m.sleepQuality === 'poor');
  if (hasPoorSleep) {
    confounders.byType.confounder.push({
      name: 'poor_sleep',
      penalty: 0.70,  // Sleep explains ~70% of mood, so food signal is weaker
    });
    confounders.confidencePenalty *= 0.70;
  }

  const hasHighStress = moodSignals.some(m => m.stressLevel > 7);
  if (hasHighStress) {
    confounders.byType.confounder.push({
      name: 'high_stress',
      penalty: 0.85,  // Stress is strong but doesn't completely override
    });
    confounders.confidencePenalty *= 0.85;
  }

  // --- AMPLIFIERS (increase severity) ---
  const hasExerciseNoRecovery = moodSignals.some(
    m => m.exerciseLevel !== 'none' && m.energyLevel < 4
  );
  if (hasExerciseNoRecovery) {
    confounders.byType.amplifier.push({
      name: 'exercise_insufficient_recovery',
      multiplier: 1.3,  // 30% more severe
      explanation: 'Unrecovered exercise amplifies fatigue',
    });
    confounders.severityMultiplier *= 1.3;
  }

  // --- MEDIATORS (change relationship) ---
  const hasCoffeeDehydration = waterSignals.some(w => w.beverageType === 'coffee') &&
                               waterSignals.reduce((sum, w) => sum + w.hydrationLiters, 0) < 1.5;
  if (hasCoffeeDehydration) {
    confounders.byType.mediator.push({
      name: 'coffee_dehydration_mediator',
      explanation: 'Coffee creates false energy masking dehydration → crash cycle',
      effect: 'pattern_becomes_more_extreme',
    });
    // Mediators don't use multiplier; they change rule application
  }

  return confounders;
}
```

---

## 2. CONSISTENCY BONUS FORMULA FIX

### Problem
```javascript
// WRONG: Bonus < 1.0 reduces confidence
confidence = base * bonus;  // If bonus = 0.15, reduces by 85%!
```

### Solution
```javascript
// CORRECT: Bonus adds to multiplier
// base * (1 + bonus) = base * 1.15 = +15%
confidence = base * (1 + consistencyBonus);

// Full formula:
const occurrenceConfidence = Math.min(occurrences / 3, 1.0);  // 0-1
const baseConfidence = 0.6;  // Rule-dependent
const consistencyBonus = 0.15;  // If pattern is consistent
const confoundPenalty = 0.85;  // From confounding factors

const finalConfidence =
  occurrenceConfidence
  * baseConfidence
  * (1 + consistencyBonus)  // ← Correct: adds, not multiplies
  * confoundPenalty;         // ← Correct: multiplicative penalty

// Example:
// 5 occurrences, base 0.6, bonus 0.15, confound 0.85
// = (5/3 → capped 1.0) * 0.6 * 1.15 * 0.85
// = 1.0 * 0.6 * 1.15 * 0.85
// = 0.586 → 59% confidence
```

---

## 3. CORRELATION vs RECOMMENDATION SEPARATION

### Problem
Frontend shouldn't render user_correlations directly. Correlations are engine state.

### Solution: Two Objects

#### Correlation Object (Internal, Engine State)
```javascript
{
  id: 42,
  userId: "user_123",
  correlationType: "mood_food",
  ruleName: "high_nova_mood_crash",

  // Signals
  signalA: "high_nova_carbs",
  signalAValue: 45,
  signalAUnit: "grams",
  signalB: "mood_intensity_drop",
  signalBValue: -3,
  signalBUnit: "points",

  // Scoring
  strength: 0.82,
  confidence: 0.78,
  occurrences: 5,

  // Classification
  healthImpactSeverity: "moderate",
  affectedDomains: ["mood_stability", "energy"],

  // Metadata
  evidenceJson: { ... },
  lastObservedDate: "2024-01-15",
  firstObservedDate: "2024-01-10",
  isActive: true,
  computedAt: "2024-01-15T10:00:00Z",
}
```

#### Recommendation Object (User-Facing Product)
```javascript
{
  id: "rec_789",  // Unique recommendation ID (not correlation ID)
  userId: "user_123",
  generatedAt: "2024-01-15T10:00:00Z",

  // Content (human-readable, not technical)
  headline: "Mood Dips After Certain Foods",
  subtitle: "We noticed: High-processed meals → energy crashes 2-4h later (seen 5 times)",

  // Visual indicator
  visual: {
    type: "gauge",
    value: 0.78,  // confidence
    label: "Pattern strength",
    color: "yellow",  // yellow = 0.6-0.8 confidence
  },

  // Actions (lifecycle-aware)
  actions: [
    {
      icon: "🥗",
      text: "Add protein to meals",
      description: "Stabilizes blood sugar and mood",
      navigationTarget: "/(tabs)/log?filter=protein",
    },
    {
      icon: "🥜",
      text: "Try nuts or yogurt",
      description: "Instead of crackers or candy",
      navigationTarget: "/(tabs)/log?filter=snack",
    },
  ],

  // Metadata for frontend logic
  confidence: 0.78,
  confidenceLabel: "78% confidence",
  decision: "SPEAK",  // or REINFORCE, PREDICT, SILENT
  lifecycleStage: "TRACKER",

  // Origin (for debugging/feedback)
  baseCorrelationId: 42,
  baseRuleName: "high_nova_mood_crash",
}
```

### Frontend Usage

```javascript
// WRONG: Don't render correlations directly
const correlations = await db.select().from(userCorrelationsTable);
return correlations.map(c => <CorrelationCard {...c} />);

// CORRECT: Render recommendations from orchestrator
const recommendations = await apiClient.post('/api/orchestrator/run');
return <DailyIntelligenceCard message={recommendations.message} />;
```

---

## 4. PREMIUM UI/UX DESIGN

### Color System (High Contrast, Luxury Aesthetic)

```javascript
// Primary brand
BRAND = {
  primary: '#10B981',     // Emerald (health, growth)
  dark: '#047857',        // Deep emerald
  light: '#D1FAE5',       // Mint
  accent: '#F59E0B',      // Amber (insight/attention)
}

// Semantic (with luxury contrast)
SENTIMENT = {
  positive: '#10B981',    // Green (wellness achieved)
  neutral: '#6366F1',     // Indigo (information)
  warning: '#F59E0B',     // Amber (caution/pattern)
  critical: '#EF4444',    // Red (health risk)
  supporting: '#8B5CF6',  // Purple (premium insight)
}

// Backgrounds (luxury + contrast)
BACKGROUNDS = {
  primary: '#FFFFFF',     // Pure white (clean, minimal)
  secondary: '#F9FAFB',   // Off-white (subtle depth)
  elevated: '#F3F4F6',    // Light gray (card surfaces)
  overlay: 'rgba(0,0,0,0.75)',  // Dark overlay for sheets
}

// Text (WCAG AAA contrast)
TEXT = {
  primary: '#111827',     // Near-black (100% contrast on white)
  secondary: '#4B5563',   // Dark gray (70% contrast)
  tertiary: '#6B7280',    // Medium gray (50% contrast, non-critical only)
  inverse: '#FFFFFF',     // White on dark backgrounds
}

// Borders & Dividers
DIVIDER = {
  light: '#E5E7EB',       // Subtle on white
  medium: '#D1D5DB',      // Card borders
  dark: '#9CA3AF',        // Interactive elements
}
```

### Luxury Component Styling

```javascript
// Glass-morphism + subtle depth
const CardStyles = {
  container: {
    background: 'rgba(255, 255, 255, 0.95)',  // Slight transparency
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',  // Generous radius
    border: `1px solid ${DIVIDER.light}`,
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',  // Soft shadow
    padding: '20px',
    marginBottom: '16px',
  },
};

// Typography hierarchy
const Typography = {
  headline: {
    fontSize: 18,
    fontWeight: '700',  // Bold
    lineHeight: 1.3,
    color: TEXT.primary,
    letterSpacing: '-0.3px',  // Tight for premium feel
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',  // Semi-bold
    lineHeight: 1.5,
    color: TEXT.secondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 1.6,
    color: TEXT.secondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 1.4,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

// Gauge coloring (luxury gradient)
const GaugeColors = {
  background: 'linear-gradient(135°, #F9FAFB 0%, #F3F4F6 100%)',
  track: '#E5E7EB',
  needle: {
    0.0: '#EF4444',     // Red (critical)
    0.4: '#F97316',     // Orange (warning)
    0.6: '#F59E0B',     // Amber (caution)
    0.8: '#10B981',     // Green (strong)
    1.0: '#047857',     // Deep green (excellent)
  },
};

// Action buttons
const ButtonStyles = {
  primary: {
    background: BRAND.primary,
    color: TEXT.inverse,
    borderRadius: '14px',
    padding: '14px 20px',
    fontWeight: '600',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',  // Emerald glow
  },
  secondary: {
    background: BACKGROUNDS.elevated,
    color: TEXT.primary,
    borderRadius: '14px',
    padding: '14px 20px',
    border: `1px solid ${DIVIDER.medium}`,
    fontWeight: '600',
  },
};
```

### Premium Layout Components

```javascript
// Recommendation card with luxury styling
export function DailyIntelligenceCard({ message, lifecycleStage }) {
  return (
    <CardContainer style={CardStyles.container}>
      {/* Header with icon + headline */}
      <HeaderRow>
        <PatternIcon>🔗</PatternIcon>
        <Headline style={Typography.headline}>
          {message.headline}
        </Headline>
      </HeaderRow>

      {/* Descriptive subtitle */}
      <Subtitle style={Typography.subtitle}>
        {message.subtitle}
      </Subtitle>

      {/* Premium visual component */}
      <VisualsSection>
        {message.visual.type === 'gauge' && (
          <PatternGauge value={message.visual.value} />
        )}
      </VisualsSection>

      {/* Actions with premium styling */}
      <ActionsRow>
        {message.actions.map((action) => (
          <ActionButton key={action.text}>
            <Icon>{action.icon}</Icon>
            <Text style={Typography.body}>{action.text}</Text>
            <Subtext style={Typography.label}>{action.description}</Subtext>
          </ActionButton>
        ))}
      </ActionsRow>

      {/* Confidence indicator (subtle) */}
      <ConfidenceRow>
        <Label style={Typography.label}>
          {message.confidenceLabel}
        </Label>
      </ConfidenceRow>
    </CardContainer>
  );
}
```

### Lifecycle-Aware Color Coding

```javascript
const LifecycleColors = {
  DISCOVERER: '#DBEAFE',   // Light blue
  BUILDER: '#FEF3C7',      // Light yellow
  TRACKER: '#FED7AA',      // Light orange
  OPTIMIZER: '#FBCFE8',    // Light pink
  MASTER: '#DCFCE7',       // Light green
  CHAMPION: '#CFFAFE',     // Light cyan
  ELITE: '#E0E7FF',        // Light purple
};

// Applied as subtle background tint
const StageIndicator = ({ stage }) => (
  <StageContainer style={{
    backgroundColor: LifecycleColors[stage],
    borderRadius: '12px',
    padding: '12px 16px',
    border: `1px solid ${DIVIDER.light}`,
  }}>
    <StageLabel>Your Stage: {stage}</StageLabel>
  </StageContainer>
);
```

---

## 5. IMPLEMENTATION CHECKLIST

### Backend Fixes
- [ ] Update `classifyConfoundingFactors()` with three types
- [ ] Fix consistency bonus formula: `(1 + bonus)` instead of `* bonus`
- [ ] Create `Recommendation` object schema (separate from `Correlation`)
- [ ] Update orchestrator to return `Recommendation` objects, not `Correlation`
- [ ] Add `baseCorrelationId` to recommendation for traceability

### Frontend Fixes
- [ ] Update component props to accept `Recommendation` objects
- [ ] Implement luxury color system (high contrast)
- [ ] Update visual components (gauge, progress, sparkline) with new colors
- [ ] Remove any correlation-to-UI rendering
- [ ] Update action button styling for premium look
- [ ] Implement lifecycle-aware color tinting
- [ ] Ensure WCAG AAA contrast on all text

### Testing
- [ ] Unit test: Confounding factor classification
- [ ] Unit test: Consistency bonus formula
- [ ] Unit test: Recommendation generation from correlation
- [ ] Component test: Verify contrast ratios (WCAG AAA)
- [ ] Visual test: Premium appearance on iOS/Android

---

## 6. SUMMARY OF CHANGES

| Aspect | Before | After |
|--------|--------|-------|
| Confounding | Single penalty | Three types (confounder/amplifier/mediator) |
| Bonus formula | `base * bonus` | `base * (1 + bonus)` |
| Frontend model | `Correlation` | `Recommendation` |
| UI aesthetics | Basic | Premium (glass-morphism, luxury colors) |
| Contrast | WCAG AA | WCAG AAA |
| Color palette | Functional | Brand-aligned emerald + luxury |

---

**Status**: Documentation complete. Ready for implementation.
