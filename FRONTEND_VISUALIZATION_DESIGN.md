# Frontend Visualization Design
## Beautiful, Non-Technical Intelligence Delivery

---

## 1. DESIGN PRINCIPLES

### Core Rules
- **No raw data**: Never show numbers without interpretation
- **One source of truth**: Dashboard only, no duplication elsewhere
- **Lifecycle-aware**: Component depth and complexity matches user stage
- **Layman-friendly**: No "correlation coefficient", use "pattern" instead
- **Visual-first**: Show insights as gauges, sparklines, progress bars, not tables
- **Action-oriented**: Every insight includes 1-3 clear actions
- **Gestalt principles**: Group related information visually
- **Silence has voice**: Silent decisions show calm confirmation, not empty space
- **Micro-interactions matter**: Every action gets instant feedback (haptic + visual)
- **User control visible**: Every dismissal asks why (feeds learning)

### Visual Language
```
Positive patterns (energy, mood, consistency) → Green (#10B981)
Negative patterns (crashes, fatigue, stress) → Amber/Red (#F59E0B / #DC2626)
Neutral (informational) → Blue/Gray (#3B82F6 / #6B7280)
Lifecycle stage indicators → Subtle background color
Quiet confidence (silent decision) → Calm green (#ECFDF5)
```

### Responsive Design Strategy (Mobile-First)
- **Tiny phones (320px)**: Essential content only, stack everything vertically
- **Mobile (375-430px)**: Optimized touch targets (min 44px), gestures-first
- **Tablet (768px+)**: Side-by-side layouts, grids of patterns
- **Content priority**: Main insight → Actions → Patterns → Lifecycle badge
- **Touch-first**: All buttons ≥44x44px tap area, padding for fat fingers
- **Micro-interactions**: Haptic feedback, visual confirmation on every action

---

## 2. COMPONENT ARCHITECTURE

### Component Hierarchy

```
DashboardPage
├── DailyIntelligenceCard (Main insight from orchestrator)
│   ├── InsightHeadline
│   ├── InsightVisual (Gauge/Progress/Sparkline)
│   ├── Actions (1-3 actionable items)
│   └── ConfidenceIndicator
├── CorrelationsSection (All discovered patterns)
│   ├── CorrelationCard (repeating)
│   │   ├── PatternIcon
│   │   ├── PatternStatement
│   │   ├── VisualIndicator
│   │   └── ExpandButton → DetailSheet
│   └── CorrelationDetailSheet (modal/bottom sheet)
│       ├── FullExplanation
│       ├── EvidenceTimeline
│       ├── Recommendations
│       └── Deactivate/Dismiss
└── LifecycleProgressIndicator (Subtle footer)
    ├── CurrentStage Badge
    ├── Next Milestone
    └── Days Until Next Stage
```

---

## 3. CORE COMPONENTS

### Component 1: Daily Intelligence Card

**Purpose**: Show today's main insight from orchestrator (SPEAK, REINFORCE, PREDICT) or quiet confirmation (SILENT)

**Props**:
```javascript
{
  type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT',
  headline: string,
  subtitle: string,
  visual: { type: 'gauge' | 'progress' | 'sparkline', data: {...} },
  actions: [{ icon, text, description, onTap, onSuccess }, ...],
  confidence: number (0-1),
  confidenceLabel: 'Low' | 'Moderate' | 'High' | 'Very High',
  lifecycleStage: string,
}
```

**Layout (SPEAK/REINFORCE/PREDICT)**:
```
┌──────────────────────────────────────┐
│  [Pattern Icon] Headline             │
│                                      │
│  Subtitle (gray, 2 lines max)        │
│                                      │
│       [Visual Component]             │
│       (Gauge/Progress/Trend)         │
│                                      │
│  ┌─────────────────┐ ┌──────────────┐
│  │ 🥗 Add protein  │ │ 🥜 Try nuts  │
│  │ Stabilizes BG   │ │ Instead of   │
│  │ [44x44 min]     │ │ crackers     │
│  └─────────────────┘ └──────────────┘
│                                      │
│  Confidence: High · Based on 5 days  │
└──────────────────────────────────────┘
```

**Layout (SILENT - Quiet Confidence Card)**:
```
┌──────────────────────────────────────┐
│  ✓ You're On Track Today             │
│                                      │
│  Your habits align with your goals.  │
│  No changes needed right now.        │
│                                      │
│  [Subtle green background]           │
│  [No actions - just confirmation]    │
└──────────────────────────────────────┘
```

**Variants by Lifecycle Stage**:

- **DISCOVERER**: Celebration card, no actions, just encouragement
- **BUILDER**: Simple pattern card, 1 action, "early signal" label
- **TRACKER**: Pattern + 2 actions, confidence label (not just %)
- **OPTIMIZER**: Predictive card, 3 actions, "Based on your month" language
- **MASTER+**: Complex multi-signal card, sophisticated language

**Responsive Behavior**:

- **Mobile <375px**: Stack actions vertically, full-width buttons
- **Mobile 375-430px**: 2 actions side-by-side, 44x44px minimum tap area
- **Tablet 768px+**: Up to 3 actions in row, can add secondary pattern cards

---

### Component 2: Pattern Indicator Gauge

**Purpose**: Visual representation of pattern strength (0-1 confidence)

**Styles**:
```
Half-circle gauge (0-180°)

        0.0                    1.0
        ↓                       ↓
     ○─────────────────────────○
      \                       /
       \                     /
        \─────────────────/    ← Needle position

  Colors:
  0.0-0.4: Red (#DC2626)
  0.4-0.6: Amber (#F59E0B)
  0.6-0.8: Yellow (#FBBF24)
  0.8-1.0: Green (#10B981)

  Center label: "78%"
  Bottom label: "Pattern strength"
```

**React Component Structure**:
```javascript
export function PatternGauge({ confidence, label = 'Pattern strength' }) {
  const angle = confidence * 180; // 0-180 degrees
  const colors = {
    background: '#F3F4F6',
    needle: angle < 0.4 ? '#DC2626' : angle < 0.6 ? '#F59E0B' : angle < 0.8 ? '#FBBF24' : '#10B981',
  };

  return (
    <GaugeContainer>
      <SVGGauge angle={angle} color={colors.needle} />
      <CenterLabel>{Math.round(confidence * 100)}%</CenterLabel>
      <BottomLabel>{label}</BottomLabel>
    </GaugeContainer>
  );
}
```

---

### Component 3: Progress Indicator Bar

**Purpose**: Show progress toward a goal or metric

**Styles**:
```
Goal: 3L water today
└────────────[████████░░░░]───── 2.3L / 3.0L
             76%

Colors:
- Filled: Gradient green (0% → 100%)
- Background: Light gray
- Text: "76% · 2.3L of 3.0L"

Variants:
- Linear (above)
- With checkpoint markers: [░░░░|░░░░|████]
- Segmented: [██│██│░░│░░] (4 segments)
```

**React Component**:
```javascript
export function ProgressBar({ current, goal, label, unit = '', showPercent = true }) {
  const percent = (current / goal) * 100;
  return (
    <ProgressContainer>
      <FilledBar percent={percent} />
      <Label>{showPercent ? `${Math.round(percent)}%` : `${current}${unit} / ${goal}${unit}`}</Label>
    </ProgressContainer>
  );
}
```

---

### Component 4: Correlation Card

**Purpose**: Show discovered pattern (one card per correlation)

**Props**:
```javascript
{
  ruleName: string,
  headline: string,
  pattern: string, // "High-NOVA meals → energy crashes"
  confidence: number,
  occurrences: number,
  affectedDomains: string[], // ['mood', 'energy']
  severity: 'high' | 'moderate' | 'low' | 'positive',
  isExpanded: boolean,
}
```

**Compact View** (default):
```
┌──────────────────────────────────┐
│ 🔗 High-NOVA Mood Crashes        │
│                                  │
│ Pattern: High-processed meals    │
│ → energy dips 2-4h later         │
│                                  │
│ [████████░░] 78% · 5 times seen  │
│                                  │
│ Affects: Mood, Energy            │
│          [→] Details             │
└──────────────────────────────────┘
```

**Expanded View** (bottom sheet):
```
┌──────────────────────────────────┐
│ ← High-NOVA Mood Crashes         │
│                                  │
│ WHAT'S HAPPENING                 │
│ When you eat processed, high-    │
│ sugar foods, your mood drops     │
│ 2-4 hours later.                 │
│                                  │
│ WHY THIS HAPPENS                 │
│ Blood sugar spikes from refined  │
│ carbs → insulin surge → dopamine │
│ crash → low energy & mood.       │
│                                  │
│ WHEN WE SEE IT                   │
│ Every time after rice-based      │
│ meals (seen 5 times in 7 days).  │
│                                  │
│ HOW IT AFFECTS YOUR HEALTH       │
│ Mood swings and afternoon        │
│ energy crashes impact focus and  │
│ productivity.                    │
│                                  │
│ WHAT'S RECOMMENDED               │
│ 1. Add protein to meals (eggs,   │
│    yogurt, nuts)                 │
│ 2. Include fiber (vegetables)    │
│ 3. Try nuts as snacks vs         │
│    crackers                      │
│                                  │
│ [Timeline of 5 occurrences]      │
│ [Dismiss] [Keep Watching]        │
└──────────────────────────────────┘
```

---

### Component 5: Sparkline Chart

**Purpose**: Show trend over time (last 7 days, 14 days, 30 days)

**Styles**:
```
Compact line chart with area fill:

  8 ╱╲    ╱╲
  7│  ╲  ╱  ╲  ← Mood score
  6│   ╲╱    ╲
  5└──────────╲── baseline

  Last 7 days | Shows trend
  Color: Blue (#3B82F6)
  No axis labels (layman-friendly)
  Tooltip on hover: "Average: 6.2/10"
```

**Use Cases**:
- Mood trend (daily mood scores)
- Energy trend (daily energy levels)
- Consistency trend (days logged)
- Hydration trend (daily water intake)

**React Component**:
```javascript
export function Sparkline({ data, label, height = 40, stroke = '#3B82F6' }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data.map((val, i) =>
    `${(i / (data.length - 1)) * 100},${100 - ((val - min) / (max - min)) * 100}`
  );

  return (
    <SmallChart>
      <SVGPolyline points={points} />
      <Tooltip>{`Avg: ${(data.reduce((a,b)=>a+b)/data.length).toFixed(1)}`}</Tooltip>
    </SmallChart>
  );
}
```

---

### Component 6: Action Item

**Purpose**: Clickable action from an insight

**Props**:
```javascript
{
  icon: string, // emoji or icon name
  text: string, // "Add protein"
  description: string, // "Stabilizes blood sugar"
  onTap: () => void,
}
```

**Layout (Idle)**:
```text
┌────────────────────────────┐
│ 🥗                         │
│ Add protein                │
│ Stabilizes blood sugar     │
│ [44x44px minimum tap]      │
└────────────────────────────┘
```

**Post-Action Feedback (CRITICAL)**:

After user taps and navigates successfully:

```text
┌────────────────────────────┐
│ ✓ Nice choice              │
│ This supports energy       │
│ stability                  │
│                            │
│ [Subtle haptic feedback]   │
│ [Checkmark animation 2s]   │
└────────────────────────────┘
```

**Props**:
```javascript
{
  icon: string,              // emoji
  text: string,              // "Add protein"
  description: string,       // "Stabilizes blood sugar"
  onTap: () => void,         // Navigation handler
  onSuccess: () => void,     // Post-action feedback trigger
}
```

**Behavior**:

- **Tap**: Navigate to relevant logging screen or show tutorial
  - "Add protein" → Food logging with protein filter preset
  - "Increase hydration" → Water logging with 250ml suggestion
  - "Early morning walk" → Activity logging with 30min walk preset
- **On success**: Show 2-second confirmation (haptic + checkmark + text)
- **Learning**: System learns user accepted recommendation (+0.1 confidence)

---

### Component 6b: Dismiss Reason Selector (Feedback Modal)

**Purpose**: Capture user's dismissal reason (feeds learning & expiry logic)

**Trigger**: User taps "Dismiss" or "Not For Me" button on correlation card

**Modal Layout**:

```text
┌──────────────────────────────────┐
│ Why dismiss this pattern?        │
│                                  │
│ This helps us improve            │
│                                  │
│ ○ Not relevant to me             │
│ ○ Just temporary situation       │
│ ○ Already fixed it               │
│ ○ Don't want to see this again   │
│                                  │
│ [Cancel]  [Confirm]              │
└──────────────────────────────────┘
```

**Props**:

```javascript
{
  correlationId: string,
  headline: string,           // "High-NOVA Mood Crashes"
  onDismiss: (reason) => void,
  onCancel: () => void,
}
```

**Dismiss Reasons & Impacts**:

| Reason | Backend Action | Expiry Status | Learning Update |
| --- | --- | --- | --- |
| Not relevant to me | Set USER_DISMISSED state | Permanent | Confidence → 0, -0.2 adjustment |
| Just temporary situation | Apply 7-day revalidation | Expiring Soon | Schedule revalidation, keep conf |
| Already fixed it | Mark as RESOLVED (seasonal) | 30-day refresh | Positive resolution, boost conf |
| Don't want to see | Permanent override (DEACTIVATION) | Never reactivate | Confidence → 0, permanent veto |

**Button Specifications (ALL INTERACTIVE ELEMENTS)**:

```javascript
{
  // Layout
  minTouchArea: '44px × 44px',        // iOS/Android standards
  padding: '12px horizontal, 10px vertical',
  spacing: 'minimum 8px between buttons',

  // States
  states: {
    idle: {
      backgroundColor: '#10B981 (Emerald)',
      textColor: '#FFFFFF',
      opacity: '1.0'
    },
    active: {
      backgroundColor: '#059669 (Darker emerald)',
      textColor: '#FFFFFF',
      scale: '0.98',  // Subtle press feedback
      boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
    },
    success: {
      backgroundColor: '#10B981',
      icon: '✓ Checkmark animation',
      haptic: 'Light haptic feedback (10ms)'
    },
    disabled: {
      backgroundColor: '#E5E7EB (Light gray)',
      textColor: '#9CA3AF (Medium gray)',
      opacity: '0.5',
      cursor: 'not-allowed'
    }
  },

  // Typography
  fontSize: '16px-18px',
  fontWeight: '600 (semibold)',
  lineHeight: '1.5',

  // Contrast
  wcag: 'AAA (4.5:1 minimum)',

  // Animation
  transition: '200ms ease-out',
  ripple: 'Material Design ripple (optional)'
}
```

**Responsive Button Layout**:

- **Mobile <375px**: Full-width buttons (100% - 2×12px padding), stacked vertically
- **Mobile 375-430px**: 2 buttons side-by-side (49% each, 8px gap)
- **Tablet 768px+**: Can do 3-4 buttons in row

---

### Component 7: Evidence Timeline

**Purpose**: Show the individual occurrences that led to a correlation

**Display**:
```
5 times pattern observed:

Mon, Jan 14       Lunch: Rice + curry
14:30             Mood drops (2/10)
                  ↓ 2.5 hours after

Wed, Jan 16       Dinner: Pasta
19:00             Mood drops (3/10)
                  ↓ 3 hours after

[+ 3 more occurrences]
```

**React Layout**:
```javascript
export function EvidenceTimeline({ evidence }) {
  return (
    <TimelineContainer>
      {evidence.map((e) => (
        <TimelineItem key={e.id}>
          <Date>{formatDate(e.date)}</Date>
          <Food>{e.foodName}</Food>
          <Arrow>↓ {e.lagMinutes} min</Arrow>
          <Mood>{e.moodAfter}</Mood>
        </TimelineItem>
      ))}
    </TimelineContainer>
  );
}
```

---

### Component 8: Lifecycle Stage Badge

**Purpose**: Show user's progress and next milestone

**Compact** (bottom of dashboard):
```
┌─────────────────────────┐
│ Your Stage: Builder 🏗️  │
│ 4 more days → Tracker   │
│ [Progress: ████░░░░░░]  │
└─────────────────────────┘
```

**Colors by Stage**:
- DISCOVERER: Light blue (#DBEAFE)
- BUILDER: Yellow (#FEF3C7)
- TRACKER: Amber (#FED7AA)
- OPTIMIZER: Orange (#FDBA74)
- MASTER: Green (#BBEF63)
- CHAMPION: Emerald (#A7F3D0)
- ELITE: Blue (#BAE6FD)

---

## 4. DATA FLOW: Backend → Frontend

### API Response Structure

```javascript
// GET /api/orchestrator/run (authenticated user)
{
  success: true,
  userId: "user_123",
  orchestratedAt: "2024-01-15T10:00:00Z",
  lifecycleStage: "TRACKER",
  decision: "SPEAK", // or REINFORCE, PREDICT, SILENT
  message: {
    type: "SPEAK",
    headline: "Mood Dips After Certain Foods",
    subtitle: "We noticed: High-processed meals → energy crashes 2-4h later (5 times)",
    actions: [
      { icon: "🥗", text: "Add protein", description: "Stabilizes blood sugar" },
      { icon: "🥜", text: "Try nuts or yogurt", description: "Instead of crackers" }
    ],
    confidenceLabel: "Confidence: 78%",
    visual: {
      type: "progress_indicator",
      value: 0.78,
      label: "Pattern strength"
    }
  },
  correlations: [
    {
      id: 1,
      ruleName: "high_nova_mood_crash",
      expectedOutcome: "...",
      confidence: 0.78,
      affectedDomains: ["mood", "energy"]
    },
    // ... more correlations
  ]
}
```

### Frontend Integration Points

**DashboardContent.jsx**:
```javascript
export function DashboardContent() {
  const { data: orchestration } = useQuery(['orchestrator'], () =>
    apiClient.post('/api/orchestrator/run')
  );

  if (!orchestration) return <SkeletonLoader />;

  return (
    <DashboardContainer>
      {/* Main insight card */}
      <DailyIntelligenceCard message={orchestration.message} />

      {/* All correlations */}
      <CorrelationsSection
        correlations={orchestration.correlations}
        onExpand={(correlationId) => showDetailSheet(correlationId)}
      />

      {/* Lifecycle progress */}
      <LifecycleStageIndicator stage={orchestration.lifecycleStage} />
    </DashboardContainer>
  );
}
```

---

## 4b. TERMINOLOGY & LANGUAGE (User-Facing)

### Simplify Technical Jargon

Replace technical terms with human-friendly language:

| Technical | User-Facing | Example |
| --- | --- | --- |
| "Pattern strength" | "How strong this pattern is" | "We've seen this 5 times" |
| "Confidence: 78%" | "Confidence: High" (with % smaller/secondary) | Show "High" prominently, "78%" as detail |
| "Correlation" | "Pattern" | "We found a pattern" |
| "Signal" | "What we noticed" | "What we noticed: mood drops" |
| "Time lag" | "How long after" | "2-3 hours after eating" |
| "Confounding factor" | "Other things could matter too" | "Weather might also affect this" |
| "Severity" | "How much this matters" | "This impacts your focus" |
| "Occurrence" | "Times seen" or "Times this happened" | "Seen 5 times this week" |

### Examples in Context

**Instead of**: "Correlation coefficient: 0.78, occurrences: 5, time lag: 120 minutes"

**Say**: "Strong pattern: High-sugar meals → mood drops 2 hours later (seen 5 times)"

**Instead of**: "Confidence is low due to confounding factor: weather"

**Say**: "This pattern might be affected by other things (like rainy days)"

---

## 5. IMPLEMENTATION CHECKLIST

### Phase 1: Core Components

- [ ] PatternGauge (half-circle gauge, color-coded by confidence)
- [ ] ProgressBar (linear + segmented variants)
- [ ] Sparkline (minimal trend chart)
- [ ] DailyIntelligenceCard (SPEAK/REINFORCE/PREDICT)
- [ ] **QuietConfidenceCard** (SILENT decision type - NEW)
- [ ] CorrelationCard (compact + expanded views)
- [ ] ActionItem (with post-action feedback)
- [ ] **DismissReasonSelector** modal (Component 6b - NEW)
- [ ] EvidenceTimeline (individual occurrences)
- [ ] LifecycleStageIndicator

### Phase 2: Micro-Interactions (CRITICAL)

- [ ] **Post-action feedback**: Show checkmark + haptic after action tapped
- [ ] **Dismiss reason flow**: Modal with 4 reasons before dismissal
- [ ] **Touch states**: Active (darkened), Success (checkmark), Disabled (grayed)
- [ ] **Haptic feedback**: Light vibration on action + feedback
- [ ] **Confidence label**: Show "High/Moderate/Low" before showing percentage
- [ ] **Button sizing**: Ensure all interactive elements ≥44×44px tap area

### Phase 3: Integration

- [ ] Update DashboardContent.jsx to fetch orchestration
- [ ] Wire orchestration.message → DailyIntelligenceCard (or QuietConfidenceCard if SILENT)
- [ ] Wire orchestration.correlations → CorrelationCards
- [ ] Add bottom sheet for correlation detail view
- [ ] Add evidence timeline view
- [ ] Add dismiss reason selector modal
- [ ] Wire feedback → backend intent override service

### Phase 4: Responsive Design

- [ ] **Mobile <375px**: Test vertical stacking, full-width buttons
- [ ] **Mobile 375-430px**: Test 2-column button layout, 44px tap targets
- [ ] **Tablet 768px+**: Test side-by-side patterns, 3-column layouts
- [ ] **Touch targets**: Verify all buttons ≥44px, padding adequate
- [ ] **Orientation changes**: Test portrait ↔ landscape transitions

### Phase 5: Polish & Animation

- [ ] Add slide-in animations (cards)
- [ ] Add fade-in animations (correlations list)
- [ ] Add checkmark animation (post-action feedback)
- [ ] Add skeleton loaders (while fetching)
- [ ] Add error states + retry logic
- [ ] Add empty states (no correlations yet)

### Phase 6: Accessibility & WCAG AAA

- [ ] Verify contrast: All text ≥4.5:1 on background
- [ ] Verify button states: Clear visual distinction
- [ ] Verify keyboard navigation: Tab order makes sense
- [ ] Test with screen reader: VoiceOver (iOS), TalkBack (Android)
- [ ] Test high contrast mode
- [ ] Verify touch target sizing (min 44×44px)

### Phase 7: Testing (Each Lifecycle Stage)

- [ ] **DISCOVERER (Day 0-1)**: Celebration card only, no patterns, encouraging message
- [ ] **BUILDER (Day 2-6)**: 1 early signal with 1 action, "early pattern" label
- [ ] **TRACKER (Day 7-29)**: 2-3 patterns with 2 actions, confidence percentage, evidence count
- [ ] **OPTIMIZER (Day 30-89)**: Predictive insights, 3 actions, "based on your month" language
- [ ] **MASTER+ (Day 90+)**: Complex multi-signal, sophisticated language, anticipatory
- [ ] **SILENT Decision**: QuietConfidenceCard shows, no actions, calm confirmation
- [ ] **Dismiss Flow**: Verify all 4 reasons capture and feed backend correctly
- [ ] **Post-Action Feedback**: Verify haptic + checkmark animation appears

---

## 6. EXAMPLES

### DISCOVERER (Day 1)
```
┌─────────────────────────┐
│ 🎉 Great Start!         │
│                         │
│ You logged your first   │
│ meal! Keep it up.       │
│                         │
│ Log one more meal →     │
└─────────────────────────┘
```

### BUILDER (Day 3)
```
┌─────────────────────────┐
│ 🔗 Early Signal        │
│                         │
│ Chocolate at 3pm →      │
│ energy dip at 5pm       │
│ (seen 2 times)          │
│                         │
│ [████░░░░░░] 50%        │
│ Early pattern           │
│                         │
│ 💡 Try: nuts instead    │
└─────────────────────────┘
```

### TRACKER (Day 14)
```
┌─────────────────────────┐
│ 🔗 Mood Drops After     │
│    High-Sugar Meals     │
│                         │
│ Pattern: When you eat   │
│ processed foods, mood   │
│ dips 2-4h later         │
│                         │
│ [██████░░░░] 67%        │
│ Seen 4 times this week  │
│                         │
│ 🥗 Add protein          │
│ 🥜 Try healthy snacks   │
│ 📊 Details              │
└─────────────────────────┘
```

### OPTIMIZER (Day 45)
```
┌─────────────────────────┐
│ 🔮 Your Weekly Pattern  │
│                         │
│ Weekend meals ≠ weekday │
│ More sodium on weekend  │
│ → Monday sluggishness   │
│                         │
│ [███████░░░░] 72%       │
│ 4 weeks consistent      │
│                         │
│ 💡 Hydrate Monday AM    │
│ 🥗 Reduce salt weekend  │
│ 🏃 Morning walk helps   │
└─────────────────────────┘
```

### MASTER (Day 120)
```
┌─────────────────────────┐
│ 🧠 Anticipatory Insight │
│                         │
│ Your 3-month pattern:   │
│ Rainy days + low        │
│ hydration + high        │
│ processed food =        │
│ 4-point mood dip        │
│                         │
│ Tomorrow: Rainy         │
│ Plan ahead:             │
│ 💧 +1L water            │
│ 🥗 High-protein meals   │
│ 🏃 2 indoor workouts    │
│                         │
│ [█████████░] 81% likely │
└─────────────────────────┘
```

---

**Status**: Design complete. Ready for React implementation.
