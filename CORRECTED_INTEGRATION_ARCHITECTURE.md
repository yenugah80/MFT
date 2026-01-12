# Corrected Integration Architecture
## Addressing Critical Issues Before Implementation

**Date:** 2026-01-11
**Status:** Final verified approach (fixes all 5 issues)

---

## Issue 1: Orchestrator Fetched Twice ❌→✅

### ❌ WRONG (from previous plan)
```javascript
// DashboardContent.jsx
const { data: orchestratorData } = useOrchestrator();

// DailyIntelligenceBehaviorSection.jsx (WRONG - refetches!)
const { data: orchestratorData } = useOrchestrator();
```
**Problem:** React Query caches, but still causes:
- Extra render cycles
- State divergence between sections
- Harder debugging ("why did data change?")
- Component coupling to API

### ✅ CORRECT (fixed)
```javascript
// DashboardContent.jsx - SINGLE FETCH
const { data: orchestratorData, isLoading: orchestratorLoading } = useOrchestrator();

// DailyIntelligenceBehaviorSection.jsx - RECEIVE AS PROP
export function DailyIntelligenceBehaviorSection({
  orchestratorData,        // ← Passed down, not fetched
  onRequestDismiss,
  onAction,
}) {
  // Use orchestratorData directly, no hook call
  if (!orchestratorData) return null;

  const { message, correlations } = orchestratorData;
  // ... rest of component
}

// DashboardContent.jsx - PASS DATA
{hasAnyData && !isOnboarding && (
  <DailyIntelligenceBehaviorSection
    orchestratorData={orchestratorData}      // ← Single source of truth
    onRequestDismiss={handleDismissRequest}
    onAction={handleCorrelationAccept}
  />
)}
```

**Rule:** Data fetching lives at component that orchestrates layout (DashboardContent). Wrappers receive via props.

---

## Issue 2: LifecycleStageIndicator Prop Mismatch ❌→✅

### ❌ WRONG
```javascript
// LifecycleStageFooter.jsx
<LifecycleStageIndicator
  stage={stage}
  daysSinceStart={daysSinceStart}
/>

// But LifecycleStageIndicator.jsx expects:
export function LifecycleStageIndicator({
  stage = 'DISCOVERER',
  daysSinceStart = 0,
})
```
**Problem:** If backend doesn't provide daysInStage/daysToNextStage, component can't calculate progress accurately.

### ✅ CORRECT (two approaches)

**Approach A: Backend provides everything** (Recommended)
```javascript
// Orchestrator response includes:
{
  lifecycle: {
    stage: 'TRACKER',
    daysSinceStart: 15,           // Total days since account created
    daysInCurrentStage: 8,        // Days in TRACKER stage specifically
    daysToNextStage: 15,          // Days until next stage (23 - 8 = 15)
  }
}

// LifecycleStageFooter receives and passes:
<LifecycleStageIndicator
  stage={orchestratorData.lifecycle.stage}
  daysSinceStart={orchestratorData.lifecycle.daysSinceStart}
  daysInStage={orchestratorData.lifecycle.daysInCurrentStage}
  daysToNextStage={orchestratorData.lifecycle.daysToNextStage}
/>

// LifecycleStageIndicator.jsx uses provided values (no calculation)
export function LifecycleStageIndicator({
  stage,
  daysSinceStart,
  daysInStage,        // ← Provided by backend
  daysToNextStage,    // ← Provided by backend
}) {
  // Render using provided values
  // No calculation needed = no drift
}
```

**Approach B: Frontend calculates from constant**
```javascript
// Backend provides only:
{ lifecycle: { stage: 'TRACKER', daysSinceStart: 15 } }

// Frontend uses STAGE_PROGRESSION constant to calculate:
const STAGE_PROGRESSION = {
  DISCOVERER: { duration: 1, ... },
  BUILDER: { duration: 5, ... },
  TRACKER: { duration: 23, ... },  // ← TRACKER lasts 23 days
  // ...
};

function calculateStageProgress(stage, daysSinceStart) {
  // Calculate daysInStage and daysToNextStage from constant
  // Return { daysInStage, daysToNextStage }
}

// LifecycleStageFooter:
const stageProgress = calculateStageProgress(
  orchestratorData.lifecycle.stage,
  orchestratorData.lifecycle.daysSinceStart
);

<LifecycleStageIndicator
  stage={orchestratorData.lifecycle.stage}
  daysSinceStart={orchestratorData.lifecycle.daysSinceStart}
  daysInStage={stageProgress.daysInStage}
  daysToNextStage={stageProgress.daysToNextStage}
/>
```

**RECOMMENDATION:** Use Approach A (backend provides all values). Prevents drift and keeps calculation logic in one place (backend).

---

## Issue 3: Inconsistent Decision Payload ❌→✅

### ❌ WRONG (from previous docs)
Payload shape is unclear:
```javascript
// Example 1 says:
decision: { type, headline, subtitle, confidence, ... }

// Example 2 says:
decision: 'SPEAK'
message: { type, headline, ... }

// UI doesn't know which one!
```

### ✅ CORRECT (single unified schema)

**Orchestrator Response Contract:**
```typescript
interface OrchestratorResponse {
  success: boolean;
  userId: string;

  // ← Decision envelope (what to show)
  decision: {
    type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT';
    headline: string;
    subtitle?: string;
    confidence: number;              // 0-1
    confidenceLabel: 'Low' | 'Moderate' | 'High' | 'Very High';
    actions?: Array<{
      icon: string;
      text: string;
      description: string;
      type: string;
      metadata?: Record<string, any>;
    }>;
    uncertaintyBadge?: string;      // For uncertain patterns
    visualComponent?: string;        // 'gauge' | 'progress' | 'sparkline'
  };

  // ← Supporting patterns
  correlations?: Array<{
    id: number;
    pattern: string;
    confidence: number;
    occurrences: number;
    affectedDomains?: string[];
    isHidden?: boolean;
    whatHappens?: string;
    whyHappens?: string;
    whenSeeIt?: string;
    recommendations?: string[];
    evidence?: Array<{
      date: string;
      strength: number;
      context?: string;
      tags?: string[];
    }>;
  }>;

  // ← User's journey
  lifecycle: {
    stage: 'DISCOVERER' | 'BUILDER' | 'TRACKER' | 'OPTIMIZER' | 'MASTER' | 'CHAMPION' | 'ELITE';
    daysSinceStart: number;
    daysInCurrentStage?: number;     // Optional if frontend calculates
    daysToNextStage?: number;        // Optional if frontend calculates
  };

  // ← Learning readiness
  learningState?: {
    canShowCorrelations: boolean;
    canShowPredictions: boolean;
    nextMilestone?: string;
  };

  timestamp: string;
}
```

**Usage in DashboardContent:**
```javascript
if (orchestratorData?.decision.type === 'SILENT') {
  // Show QuietConfidenceCard instead
  return <QuietConfidenceCard />;
}

// For other types, always use:
<DailyIntelligenceCard
  type={orchestratorData.decision.type}
  headline={orchestratorData.decision.headline}
  subtitle={orchestratorData.decision.subtitle}
  confidence={orchestratorData.decision.confidence}
  confidenceLabel={orchestratorData.decision.confidenceLabel}
  actions={orchestratorData.decision.actions}
/>
```

**Rule:** Never interpret `decision` in UI. Always render `decision` payload as-is.

---

## Issue 4: Modal Duplication Risk ❌→✅

### ❌ WRONG
```javascript
// DailyIntelligenceBehaviorSection.jsx (BAD - modal here)
export function DailyIntelligenceBehaviorSection() {
  const [dismissingCorrelation, setDismissingCorrelation] = useState(null);

  return (
    <>
      <View>
        {/* Cards */}
      </View>

      {/* WRONG: Modal inside nested component */}
      <Modal visible={dismissingCorrelation !== null}>
        <DismissReasonSelector ... />
      </Modal>
    </>
  );
}
```

**Problems:**
- Multiple modals at different levels → z-index hell
- Keyboard overlay issues on Android
- Modal stacking bugs
- Hard to manage presentation on iOS

### ✅ CORRECT
```javascript
// DashboardContent.jsx - SINGLE MODAL LAYER
export function DashboardContent() {
  const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);

  // All modals in one place
  return (
    <LinearGradient>
      <ScrollView>
        {/* All content sections */}
        <DailyIntelligenceBehaviorSection
          orchestratorData={orchestratorData}
          onRequestDismiss={(id) => setDismissingCorrelationId(id)}  // ← Just callback
          onAction={handleCorrelationAccept}
        />
      </ScrollView>

      {/* All modals here (single layer) */}
      <DismissReasonSelector
        visible={dismissingCorrelationId !== null}
        headline="Pattern Feedback"
        onDismiss={(reason) => {
          handleCorrelationDismiss(dismissingCorrelationId, reason);
          setDismissingCorrelationId(null);
        }}
        onCancel={() => setDismissingCorrelationId(null)}
      />

      {/* Other modals */}
      <InsightsModal visible={...} />
      <ProteinModal visible={...} />
      {/* etc */}
    </LinearGradient>
  );
}

// DailyIntelligenceBehaviorSection.jsx - NO MODAL
export function DailyIntelligenceBehaviorSection({
  orchestratorData,
  onRequestDismiss,  // ← Just callback, no state
  onAction,
}) {
  const handleDismiss = (correlationId) => {
    onRequestDismiss(correlationId);  // ← Bubbles up to parent
  };

  return (
    <View>
      {/* Cards only - no modal */}
    </View>
  );
}
```

**Rule:** Modal layer owns all modals (single parent). Child components request via callbacks.

---

## Issue 5: hasLoggedToday Gate Too Strict ❌→✅

### ❌ WRONG
```javascript
// Hide daily intelligence until user logs TODAY
{hasAnyData && !isOnboarding && hasLoggedToday && (
  <DailyIntelligenceBehaviorSection ... />
)}
```

**Problems:**
- User logs on Day 1 → sees intelligence
- User logs on Day 2 → sees intelligence
- User logs on Day 10 → doesn't log on Day 11 → no intelligence!
- Hides system when it's most useful (predictive nudges)

### ✅ CORRECT
```javascript
// Show if user has ANY data (not just today)
// Let decision type determine messaging
{hasAnyData && !isOnboarding && (
  <DailyIntelligenceBehaviorSection
    orchestratorData={orchestratorData}
    onRequestDismiss={handleDismissRequest}
    onAction={handleCorrelationAccept}
  />
)}

// If orchestrator returns SILENT:
if (orchestratorData.decision.type === 'SILENT') {
  return <QuietConfidenceCard />;  // "You're on track today"
}

// If orchestrator returns PREDICT (even without today's logs):
// Shows predictive nudges like "Today looks like a high-energy day"

// If no data at all: component returns null naturally
if (!orchestratorData) return null;
```

**Backend handles gating logic:**
```javascript
// orchestratorService.ts (backend)
export async function orchestrateDailyRecommendations(userId) {
  // Check if user has logged today
  const todayLogs = await getTodayLogs(userId);

  if (todayLogs.length === 0) {
    // Return PREDICT or SILENT based on patterns
    return {
      decision: {
        type: 'PREDICT',
        headline: 'Today looks like a high-energy day based on your patterns',
        // ...
      },
      // ...
    };
  } else {
    // Return SPEAK or REINFORCE based on today's data
    // ...
  }
}
```

**Rule:** Backend decides what to show. Frontend doesn't gate with hasLoggedToday.

---

## Final Integration Pattern (All Issues Fixed)

### Architecture Diagram
```
DashboardContent.jsx (2457 lines)
├─ useOrchestrator() ← SINGLE FETCH
│  └─ orchestratorData
├─ State for modals
│  └─ dismissingCorrelationId
├─ Handlers
│  ├─ handleDismissRequest
│  ├─ handleCorrelationDismiss
│  └─ handleCorrelationAccept
│
├─ ScrollView (render)
│  ├─ DashboardHeaderSection
│  ├─ EmptyState (IF isNewUser)
│  ├─ ... existing sections ...
│  │
│  ├─ DailyIntelligenceBehaviorSection
│  │  └─ Props: orchestratorData, onRequestDismiss, onAction
│  │     (No internal fetching, no modal)
│  │
│  └─ LifecycleStageFooter
│     └─ Props: orchestratorData
│
└─ Modal Layer (outside ScrollView)
   ├─ DismissReasonSelector
   │  └─ State: dismissingCorrelationId (in DashboardContent)
   │  └─ Props: visible, onDismiss, onCancel
   │
   └─ Other modals (InsightsModal, ProteinModal, etc)
```

### Code Template (Corrected)

**DashboardContent.jsx**
```javascript
// Line ~30: Add hooks import
import {
  useOrchestrator,
  useCorrelationFeedback,
} from '../hooks/useOrchestrator';

// Line ~60: Add component imports
import DailyIntelligenceBehaviorSection from './dashboard/DailyIntelligenceBehaviorSection';
import LifecycleStageFooter from './dashboard/LifecycleStageFooter';

// Line ~200: Add state
const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);

// Line ~230: Add hooks (SINGLE fetch)
const { data: orchestratorData, isLoading: orchestratorLoading } = useOrchestrator();
const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();

// Line ~400: Add handlers
const handleDismissRequest = useCallback((correlationId) => {
  setDismissingCorrelationId(correlationId);
}, []);

const handleCorrelationDismiss = useCallback(async (correlationId, reason) => {
  try {
    await sendCorrelationFeedback({
      correlationId,
      overrideType: reason === 'not_relevant' ? 'USER_DISMISSED' : 'TEMPORARY_DISMISS',
      userReason: reason,
    });
    setDismissingCorrelationId(null);
  } catch (error) {
    console.error('[Dashboard] Failed to send feedback:', error);
  }
}, [sendCorrelationFeedback]);

const handleCorrelationAccept = useCallback(async (action) => {
  // Implement based on action type
}, []);

// Line ~1220: Insert DailyIntelligenceBehaviorSection
{hasAnyData && !isOnboarding && (
  <DailyIntelligenceBehaviorSection
    orchestratorData={orchestratorData}
    onRequestDismiss={handleDismissRequest}
    onAction={handleCorrelationAccept}
  />
)}

// Line ~1330: Insert LifecycleStageFooter
{orchestratorData?.lifecycle && (
  <LifecycleStageFooter
    orchestratorData={orchestratorData}
  />
)}

// Line ~1350: Add DismissReasonSelector to modal layer
<DismissReasonSelector
  visible={dismissingCorrelationId !== null}
  headline="Why dismiss this pattern?"
  onDismiss={(reason) => handleCorrelationDismiss(dismissingCorrelationId, reason)}
  onCancel={() => setDismissingCorrelationId(null)}
/>
```

**DailyIntelligenceBehaviorSection.jsx**
```javascript
export function DailyIntelligenceBehaviorSection({
  orchestratorData,      // ← Passed from parent (NO internal fetch)
  onRequestDismiss,      // ← Callback to parent for modal
  onAction,
}) {
  // Guard
  if (!orchestratorData) return null;

  const { decision, correlations = [] } = orchestratorData;

  // SILENT: show quiet card
  if (decision.type === 'SILENT') {
    return <QuietConfidenceCard />;
  }

  // Other types: show main card + correlations
  return (
    <>
      <DailyIntelligenceCard
        type={decision.type}
        headline={decision.headline}
        subtitle={decision.subtitle}
        confidence={decision.confidence}
        confidenceLabel={decision.confidenceLabel}
        actions={decision.actions}
        onAction={onAction}
      />

      {correlations.length > 0 && (
        <FlatList
          scrollEnabled={false}
          data={correlations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <CorrelationCard
              id={item.id}
              headline={item.pattern}
              confidence={item.confidence}
              onDismiss={() => onRequestDismiss(item.id)}  // ← Callback
            />
          )}
        />
      )}
    </>
  );
}
```

**LifecycleStageFooter.jsx**
```javascript
export function LifecycleStageFooter({
  orchestratorData,  // ← Passed from parent
}) {
  if (!orchestratorData?.lifecycle) return null;

  const { stage, daysSinceStart, daysInCurrentStage, daysToNextStage } =
    orchestratorData.lifecycle;

  return (
    <LifecycleStageIndicator
      stage={stage}
      daysSinceStart={daysSinceStart}
      daysInStage={daysInCurrentStage}
      daysToNextStage={daysToNextStage}
    />
  );
}
```

---

## Summary of Fixes

| Issue | ❌ Problem | ✅ Solution |
|-------|-----------|-----------|
| 1. Double fetch | Both DashboardContent and wrapper fetch orchestrator | Single fetch in DashboardContent, pass via props |
| 2. Prop mismatch | Wrapper passes daysSinceStart, component needs daysInStage | Backend provides all values OR frontend calculates from constant |
| 3. Inconsistent payload | Decision shape unclear (decision vs message) | Define single OrchestratorResponse schema |
| 4. Modal duplication | Modals in nested components → z-index issues | All modals in DashboardContent modal layer |
| 5. Too-strict gate | Hide intelligence if !hasLoggedToday | Show if hasAnyData, let backend decide messaging |

---

## Implementation Checklist (Corrected)

- [ ] Define OrchestratorResponse TypeScript interface
- [ ] Update backend orchestrator.ts to return lifecycle with all values
- [ ] Add single useOrchestrator hook call to DashboardContent
- [ ] Add state for dismissingCorrelationId in DashboardContent
- [ ] Add handlers in DashboardContent (handleDismissRequest, handleCorrelationDismiss)
- [ ] Create DailyIntelligenceBehaviorSection (receives orchestratorData as prop)
- [ ] Create LifecycleStageFooter (receives orchestratorData as prop)
- [ ] Move DismissReasonSelector to modal layer in DashboardContent
- [ ] Loosen visibility gate: change `hasLoggedToday` to just `hasAnyData`
- [ ] Test with empty orchestratorData (should show nothing)
- [ ] Test with SILENT decision (should show QuietConfidenceCard)
- [ ] Test with SPEAK/REINFORCE/PREDICT (should show main card + correlations)
- [ ] Test dismiss flow (sets dismissingCorrelationId, shows modal, sends feedback)
- [ ] Verify no layout regressions

---

**Status:** Ready for implementation (all 5 issues addressed)
**Next:** Update backend orchestrator.ts to provide all lifecycle values
