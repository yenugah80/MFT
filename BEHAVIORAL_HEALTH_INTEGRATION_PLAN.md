# Behavioral Health Intelligence Integration Plan

**Document Status:** Comprehensive Implementation Strategy
**Date:** 2026-01-11
**Current Challenge:** DashboardContent.jsx is 2457 lines; needs integration of 10+ new behavioral health components while maintaining existing functionality
**Goal:** Systematic, non-disruptive integration of Daily Intelligence, Correlations, and Lifecycle features

---

## 1. Executive Summary

The DashboardContent.jsx file is a critical bottleneck. Rather than modifying it directly (high-risk refactoring), this plan proposes:

1. **Add minimal imports and hooks** to DashboardContent.jsx (top of file)
2. **Create wrapper components** to encapsulate behavioral health rendering logic
3. **Insert 3 strategic sections** into the existing render flow
4. **Use composition** to keep DashboardContent.jsx focused on orchestration, not implementation

### Key Principle: Composition > Modification
- Keep DashboardContent.jsx's core logic intact
- Extract rendering into focused, testable components
- Use status guards (isNewUser, hasAnyData, hasLoggedToday) to show/hide features

---

## 2. Current DashboardContent.jsx Structure

### Render Flow (Lines 1101-1331)

```
LinearGradient (container)
  └─ ScrollView
     ├─ DashboardHeaderSection (line 1117)
     ├─ EmptyState IF isNewUser (line 1162)
     ├─ DashboardInsightsSection (line 1174)
     ├─ PremiumCalendarStrip IF hasAnyData (line 1182)
     ├─ FoodMoodScoreCard IF hasAnyData (line 1201) ← HERO
     ├─ CompactDashboardTiles IF hasAnyData (line 1216)
     ├─ PremiumAchievementsCard IF hasLoggedToday && !isOnboarding (line 1227)
     ├─ AllergenWarningCard IF allergenWarnings.length > 0 (line 1244)
     ├─ SmartMealSuggestionCard IF uniqueFoodLogs.length > 0 (line 1258)
     ├─ DashboardNutritionSection (line 1287)
     ├─ DashboardWellnessSection (line 1302)
     └─ DashboardProgressSection (line 1323)

Modals (outside ScrollView)
```

### State Management (Lines 180-230)

**Existing Hooks:**
- useDashboard, useFoodLog, useProfileContext, useTheme
- useMoodTrends, useMoodInsights, useWaterLog, useRecommendations
- useNotification, useRouter, useUser, useQueryClient

**Existing State:**
- refreshing, insightsModalVisible, nutritionExpanded, wellnessExpanded, progressExpanded
- focusMode, selectedRecommendation, allergenWarnings

---

## 3. New Components to Integrate

### A. Already Created Components

| Component | Path | Purpose | Integration Point |
|-----------|------|---------|-------------------|
| DailyIntelligenceCard | dashboard/DailyIntelligenceCard.jsx | Main recommendation display (SPEAK/REINFORCE/PREDICT/SILENT) | After CompactDashboardTiles |
| CorrelationCard | dashboard/CorrelationCard.jsx | Individual pattern display (expandable) | List after DailyIntelligenceCard |
| LifecycleStageIndicator | dashboard/LifecycleStageIndicator.jsx | User stage progress (DISCOVERER→ELITE) | Footer/bottom of ScrollView |
| EvidenceTimeline | dashboard/EvidenceTimeline.jsx | Pattern evidence history | Inside CorrelationCard expansion |
| DismissReasonSelector | dashboard/DismissReasonSelector.jsx | Modal for pattern dismissal reasons | Modal layer |
| ProgressBar | dashboard/ProgressBar.jsx | Visual confidence/progress bars | Used by other components |
| ConfidenceIndicator | recommendations/ConfidenceIndicator.jsx | Confidence display (visual + label) | Used by DailyIntelligenceCard |
| ActionItem | dashboard/ActionItem.jsx | Individual action button | Used by DailyIntelligenceCard |

### B. New Hooks (from useOrchestrator.ts)

```typescript
useOrchestrator()              // Fetch daily decision (SPEAK/REINFORCE/PREDICT/SILENT)
useCorrelationFeedback()       // Send pattern feedback (dismiss, helpful, etc.)
useLearningFeedback()          // Send learning feedback
useLearningState()             // Get user's learning readiness state
useResolveIntent()             // Convert intent to specific foods
useExpiryStats()               // Get pattern expiry statistics
useRevalidateCorrelation()     // Revalidate dismissed patterns
```

---

## 4. Detailed Integration Points

### 4.1 SECTION A: Daily Intelligence (Lines 1220-1240)

**Location:** After `CompactDashboardTiles` (line 1221), before `PremiumAchievementsCard` (line 1227)

**Condition:** `hasAnyData && !isOnboarding && hasLoggedToday`
(Show only after user has logged at least one meal AND past onboarding)

**New Code (Insert at Line 1222):**

```jsx
{/* ============================================ */}
{/* BEHAVIORAL HEALTH: DAILY INTELLIGENCE */}
{/* Decision engine recommendations (SPEAK/REINFORCE/PREDICT/SILENT) */}
{/* ============================================ */}
{hasAnyData && !isOnboarding && hasLoggedToday && (
  <DailyIntelligenceBehaviorSection
    styles={styles}
    onDismiss={handleCorrelationDismiss}
    onAccept={handleCorrelationAccept}
  />
)}
```

**New Wrapper Component:** `/mobile/components/dashboard/DailyIntelligenceBehaviorSection.jsx`

```jsx
/**
 * DailyIntelligenceBehaviorSection
 *
 * Orchestrates display of:
 * 1. Main daily decision (DailyIntelligenceCard)
 * 2. List of related correlations (CorrelationCard list)
 * 3. Learning state indicator
 */

import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useOrchestrator, useCorrelationFeedback } from '../../hooks/useOrchestrator';
import DailyIntelligenceCard from './DailyIntelligenceCard';
import { CorrelationCard } from './CorrelationCard';
import { DismissReasonSelector } from './DismissReasonSelector';
import { SPACING } from '../../constants/designTokens';
import { SURFACES, TEXT } from '../../constants/premiumTheme';

export default function DailyIntelligenceBehaviorSection({
  styles,
  onDismiss,
  onAccept,
}) {
  const { data: orchestratorData, isLoading, error } = useOrchestrator();
  const { mutate: sendFeedback } = useCorrelationFeedback();
  const [dismissingCorrelation, setDismissingCorrelation] = useState(null);

  if (isLoading) return null; // Or show skeleton
  if (error) return null;     // Fail silently for behavioral features
  if (!orchestratorData) return null;

  const { decision, correlations = [] } = orchestratorData;

  const handleCorrelationDismiss = (correlationId, reason) => {
    setDismissingCorrelation(null);
    sendFeedback({
      correlationId,
      overrideType: reason === 'not_relevant' ? 'USER_DISMISSED' : 'TEMPORARY_DISMISS',
      userReason: reason,
    });
    onDismiss?.(correlationId);
  };

  return (
    <>
      {/* Main Decision Card */}
      <View style={styles.section}>
        <DailyIntelligenceCard
          type={decision.type}
          headline={decision.headline}
          subtitle={decision.subtitle}
          confidence={decision.confidence}
          confidenceLabel={decision.confidenceLabel}
          actions={decision.actions || []}
          onAction={onAccept}
        />
      </View>

      {/* Correlations List */}
      {correlations.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: SPACING[4] }]}>
          <FlatList
            scrollEnabled={false}
            data={correlations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <CorrelationCard
                id={item.id}
                headline={item.pattern}
                confidence={item.confidence}
                onDismiss={() => setDismissingCorrelation(item.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: SPACING[2] }} />}
          />
        </View>
      )}

      {/* Dismiss Modal */}
      <DismissReasonSelector
        visible={dismissingCorrelation !== null}
        headline="Pattern Feedback"
        onDismiss={(reason) => {
          if (dismissingCorrelation) {
            handleCorrelationDismiss(dismissingCorrelation, reason);
          }
        }}
        onCancel={() => setDismissingCorrelation(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: SPACING[3],
  },
});
```

---

### 4.2 SECTION B: Lifecycle Footer (Lines 1330-1331)

**Location:** Before closing `</ScrollView>` (line 1331), after `DashboardProgressSection` (line 1330)

**Condition:** Always show (optional: `!isOnboarding`)

**New Code (Insert at Line 1331, before ScrollView close):**

```jsx
{/* ============================================ */}
{/* BEHAVIORAL HEALTH: LIFECYCLE STAGE INDICATOR */}
{/* Shows user's current stage and progress to next */}
{/* ============================================ */}
{orchestratorData && (
  <LifecycleStageFooter
    stage={orchestratorData.stage}
    daysSinceStart={orchestratorData.daysSinceStart}
    styles={styles}
  />
)}
```

**New Wrapper Component:** `/mobile/components/dashboard/LifecycleStageFooter.jsx`

```jsx
/**
 * LifecycleStageFooter
 *
 * Renders lifecycle stage indicator with progress bar.
 * Positioned at bottom of dashboard (before closing ScrollView).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LifecycleStageIndicator } from './LifecycleStageIndicator';
import { SPACING, TYPOGRAPHY } from '../../constants/designTokens';
import { SURFACES } from '../../constants/premiumTheme';

export default function LifecycleStageFooter({
  stage,
  daysSinceStart,
  styles,
}) {
  return (
    <View style={[componentStyles.container, { paddingHorizontal: SPACING[4] }]}>
      <LifecycleStageIndicator
        stage={stage}
        daysSinceStart={daysSinceStart}
      />
      <View style={componentStyles.spacer} />
    </View>
  );
}

const componentStyles = StyleSheet.create({
  container: {
    marginTop: SPACING[6],
    marginBottom: SPACING[4],
  },
  spacer: {
    height: SPACING[4],
  },
});
```

---

### 4.3 STATE & HOOKS ADDITIONS

**File:** `mobile/components/DashboardContent.jsx` (Top of component function)

**Add after line 244 (after useMoodInsights hook):**

```jsx
// ============================================================================
// BEHAVIORAL HEALTH HOOKS
// ============================================================================

// Orchestrator (daily decision engine)
const { data: orchestratorData, isLoading: orchestratorLoading } = useOrchestrator();

// Correlation feedback
const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();

// Learning state
const { data: learningState } = useLearningState();

// State for managing correlation dismiss modal
const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);
```

**Add after line 377 (after handleGoalsUpdate handler):**

```jsx
// ============================================================================
// BEHAVIORAL HEALTH HANDLERS
// ============================================================================

/**
 * Handle when user dismisses a correlation pattern
 * Sends feedback to backend for learning system
 */
const handleCorrelationDismiss = useCallback(async (correlationId, reason) => {
  try {
    await sendCorrelationFeedback({
      correlationId,
      overrideType: reason === 'not_relevant' ? 'USER_DISMISSED' : 'TEMPORARY_DISMISS',
      userReason: reason,
    });
    // Optional: Show toast confirmation
    notify.info('Pattern feedback recorded');
  } catch (error) {
    console.error('[Dashboard] Failed to send correlation feedback:', error);
    // Fail silently - behavioral features are secondary
  }
}, [sendCorrelationFeedback, notify]);

/**
 * Handle when user accepts a correlation action
 * For example: Accept food recommendation from orchestrator
 */
const handleCorrelationAccept = useCallback(async (action) => {
  try {
    // Implementation depends on action type
    // Could add to food log, toggle hydration tracking, etc.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notify.success('Action recorded!');
  } catch (error) {
    console.error('[Dashboard] Failed to process correlation action:', error);
    notify.error('Failed to process action');
  }
}, [notify]);
```

---

## 5. Import Statements

**File:** `mobile/components/DashboardContent.jsx`

**Add after line 56 (after existing component imports):**

```jsx
// Behavioral Health Components
import DailyIntelligenceBehaviorSection from './dashboard/DailyIntelligenceBehaviorSection';
import LifecycleStageFooter from './dashboard/LifecycleStageFooter';
```

**Add after line 26 (after existing hook imports):**

```jsx
import {
  useOrchestrator,
  useCorrelationFeedback,
  useLearningState,
  useLearningFeedback,
} from '../hooks/useOrchestrator';
```

---

## 6. Integration Locations: Visual Map

```
DashboardContent.jsx Render Flow (1101-1331)
────────────────────────────────────────────────

1117 ├─ DashboardHeaderSection
     │
1162 ├─ EmptyState (IF isNewUser)
     │
1174 ├─ DashboardInsightsSection
     │
1182 ├─ PremiumCalendarStrip (IF hasAnyData)
     │
1201 ├─ FoodMoodScoreCard (IF hasAnyData)
     │
1216 ├─ CompactDashboardTiles (IF hasAnyData)
     │
     ├─ ⭐ NEW: DailyIntelligenceBehaviorSection ⭐
     │        (hasAnyData && !isOnboarding && hasLoggedToday)
     │        - DailyIntelligenceCard (main decision)
     │        - CorrelationCard list (patterns)
     │        - DismissReasonSelector modal
     │
1227 ├─ PremiumAchievementsCard (IF hasLoggedToday && !isOnboarding)
     │
1244 ├─ AllergenWarningCard (IF allergenWarnings.length > 0)
     │
1258 ├─ SmartMealSuggestionCard (IF uniqueFoodLogs.length > 0)
     │
1287 ├─ DashboardNutritionSection
     │
1302 ├─ DashboardWellnessSection
     │
1323 ├─ DashboardProgressSection
     │
     ├─ ⭐ NEW: LifecycleStageFooter ⭐
     │        (IF orchestratorData exists)
     │        - Shows stage + progress bar
     │
1331 └─ </ScrollView>

MODALS (1335-end)
     ├─ Insights Modal
     ├─ Protein Modal
     ├─ Theme Modal
     ├─ RecommendationDetailModal
     │
     └─ ⭐ NEW MODAL: DismissReasonSelector
          (managed by DailyIntelligenceBehaviorSection)
```

---

## 7. Data Flow Architecture

### From Backend to Dashboard

```
GET /orchestrator/run
       │
       ├─ decision: { type, headline, subtitle, confidence, actions }
       ├─ correlations: [{ id, pattern, confidence, isHidden }]
       ├─ stage: 'DISCOVERER' | 'BUILDER' | ... | 'ELITE'
       └─ daysSinceStart: 42

       ROUTES TO:
       ├─ DailyIntelligenceCard (decision)
       ├─ CorrelationCard list (correlations)
       ├─ LifecycleStageIndicator (stage, daysSinceStart)
       └─ TBD: Recommendation hydration (if included in correlations)
```

### Feedback Flow (User Actions to Backend)

```
User dismisses correlation
       │
       ├─ CorrelationCard.onDismiss(id) → DailyIntelligenceBehaviorSection
       ├─ Show DismissReasonSelector modal
       │
       └─ User selects reason (not_relevant, temporary, fixed, never_show)
              │
              └─ POST /correlations/{id}/feedback
                 { overrideType, userReason }

               Backend applies logic:
               ├─ USER_DISMISSED → confidence → 0, hidden for 7d
               ├─ TEMPORARY_DISMISS → hidden for 7d, revalidate
               ├─ RESOLVED → mark resolved, 30d refresh
               └─ DEACTIVATION → permanent hide
```

---

## 8. State Management Summary

### New State Variables to Add (Line ~230)

```javascript
// Behavioral health modal state
const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);

// From useOrchestrator hook
const { data: orchestratorData, isLoading: orchestratorLoading } = useOrchestrator();

// From useLearningState hook
const { data: learningState } = useLearningState();

// Mutation hook for sending feedback
const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();
```

### Existing State That Remains Unchanged
- refreshing, insightsModalVisible, nutritionExpanded, etc. (all preserved)
- All existing useDashboard() data flows unchanged
- No modifications to existing handlers

---

## 9. Visibility Rules (When to Show Each Feature)

| Feature | Show When | Hide When |
|---------|-----------|-----------|
| DailyIntelligenceBehaviorSection | `hasAnyData && !isOnboarding && hasLoggedToday` | New user (Day 0), onboarding phase, no logs today |
| CorrelationCard list | `correlations.length > 0` (inside DailyIntelligenceBehaviorSection) | No patterns discovered yet |
| DismissReasonSelector | `dismissingCorrelationId !== null` | User dismisses modal or selects reason |
| LifecycleStageFooter | Always (or `!isOnboarding`) | Optional: Hide during onboarding |
| LifecycleStageIndicator | `orchestratorData?.stage` exists | Backend doesn't return stage |

---

## 10. Implementation Checklist

### Phase 1: Core Integration (Day 1)

- [ ] Add import statements to DashboardContent.jsx (useOrchestrator hooks, wrapper components)
- [ ] Add state variables (orchestratorData, dismissingCorrelationId)
- [ ] Add handlers (handleCorrelationDismiss, handleCorrelationAccept)
- [ ] Create `/mobile/components/dashboard/DailyIntelligenceBehaviorSection.jsx`
- [ ] Create `/mobile/components/dashboard/LifecycleStageFooter.jsx`
- [ ] Insert DailyIntelligenceBehaviorSection after CompactDashboardTiles
- [ ] Insert LifecycleStageFooter before closing ScrollView

### Phase 2: Testing & Refinement (Day 2)

- [ ] Test with real orchestrator data (empty, one correlation, multiple)
- [ ] Test dismiss flow (all 4 reason types)
- [ ] Test visibility rules (new user, onboarding, no data)
- [ ] Verify no layout regressions on existing sections
- [ ] Test on both iOS and Android

### Phase 3: Polish & Optimization (Day 3)

- [ ] Add loading states for orchestratorData
- [ ] Add error boundaries for safe failure
- [ ] Optimize re-render frequency (React Query cache + staleTime)
- [ ] Add accessibility labels
- [ ] Document component API in JSDoc

### Phase 4: Deployment

- [ ] Code review checklist
- [ ] No breaking changes to existing features
- [ ] All new features are gracefully disabled on error
- [ ] Commit with conventional format

---

## 11. Error Handling Strategy

### Safe Failures (No User Disruption)

All behavioral health features should fail gracefully:

```jsx
// If orchestrator API fails, show nothing (not an error)
if (!orchestratorData) return null;

// If correlation feedback fails, log and continue
try {
  await sendCorrelationFeedback(...);
} catch (error) {
  console.error('[Dashboard] Feedback error:', error);
  // Don't interrupt user experience
}
```

### Why?
- Behavioral features are *enhancements*, not core functionality
- User can still log meals, track water, view nutrition (core features intact)
- Orchestrator is optional; graceful degradation is critical

---

## 12. Performance Considerations

### React Query Caching

```javascript
useOrchestrator() {
  staleTime: 60 * 1000,        // Fresh data important - 60 seconds
  gcTime: 10 * 60 * 1000,       // Cache for 10 minutes
  refetchOnMount: true,         // Always check for new data on mount
}
```

### Optimization Strategies

1. **Wrapper Components:** Each behavioral section is self-contained → easy to lazy-load if needed
2. **Conditional Rendering:** Use status guards (isNewUser, hasAnyData) to avoid rendering unused components
3. **FlatList:** Use FlatList for CorrelationCard list (efficient for long lists)
4. **Memoization:** Wrap handlers in useCallback to prevent unnecessary re-renders

---

## 13. Testing Strategy

### Unit Tests

```javascript
// DailyIntelligenceBehaviorSection.test.js
test('renders DailyIntelligenceCard when orchestrator data exists', () => {
  const { getByText } = render(
    <DailyIntelligenceBehaviorSection
      orchestratorData={mockOrchestratorData}
    />
  );
  expect(getByText(mockOrchestratorData.decision.headline)).toBeTruthy();
});

test('renders CorrelationCard list when correlations exist', () => {
  const { getByText } = render(
    <DailyIntelligenceBehaviorSection
      orchestratorData={mockOrchestratorDataWithCorrelations}
    />
  );
  // Verify each correlation is rendered
});

test('calls handleCorrelationDismiss when user dismisses', () => {
  const mockHandler = jest.fn();
  render(
    <DailyIntelligenceBehaviorSection onDismiss={mockHandler} />
  );
  // Simulate dismissal flow
  expect(mockHandler).toHaveBeenCalled();
});
```

### Integration Tests

```javascript
// DashboardContent.integration.test.js
test('DailyIntelligenceBehaviorSection appears after CompactDashboardTiles', () => {
  const { getByTestId } = render(<DashboardContent />);
  const tilesElement = getByTestId('compact-tiles');
  const intelligenceElement = getByTestId('daily-intelligence-section');

  // Verify order
  const tilesPosition = tilesElement.getBoundingClientRect();
  const intelligencePosition = intelligenceElement.getBoundingClientRect();
  expect(intelligencePosition.top).toBeGreaterThan(tilesPosition.bottom);
});

test('LifecycleStageFooter appears at bottom before ScrollView closes', () => {
  // Verify footer is rendered
  // Verify no layout overflow
});
```

---

## 14. Deployment Rollout

### Step 1: Feature Flag (Optional but Recommended)

```javascript
// Use existing useFeatureFlags hook to gate behavioral features
const { isBehavioralHealthEnabled } = useFeatureFlags();

{isBehavioralHealthEnabled && (
  <DailyIntelligenceBehaviorSection ... />
)}
```

### Step 2: Beta Rollout

1. Deploy to staging environment
2. Run full test suite
3. Deploy to 10% of production users (gradual rollout)
4. Monitor error logs + analytics
5. Ramp to 100%

### Step 3: Monitor

- Watch for API errors from `/orchestrator/run`
- Monitor component re-render frequency
- Check user engagement with new features
- Collect user feedback

---

## 15. Future Enhancements

### Phase 2 Opportunities

1. **Correlation Deep-Dive Screen:** Navigate from DailyIntelligenceBehaviorSection to `/insights/correlation/[id]`
2. **Learning Feedback Loop:** After user accepts action, collect outcome feedback (did it help?)
3. **Expiry Revalidation:** "Dismissed this pattern 7 days ago—should we check again?" nudge
4. **Pattern Comparison:** "You had this pattern in Month 1. It evolved in Month 2. Now in Month 3..."
5. **Personalized Recommendations Dropdown:** Extend actions array with contextual food suggestions

### Phase 3 Opportunities

1. **Predictive Nudges:** "Tomorrow looks like a high-energy day based on your patterns"
2. **Recovery Protocols:** "After intense exercise, these foods help your recovery"
3. **Social Learning:** "Users with similar patterns found these meals helpful"

---

## 16. Code Location Reference

### Files to Create

```
mobile/components/dashboard/
  ├─ DailyIntelligenceBehaviorSection.jsx      [NEW] - Main orchestrator wrapper
  └─ LifecycleStageFooter.jsx                   [NEW] - Lifecycle stage footer wrapper
```

### Files to Modify

```
mobile/components/
  └─ DashboardContent.jsx                       [MODIFY] - Add imports, state, handlers, 2 new sections
```

### Files Already Existing (Use As-Is)

```
mobile/components/dashboard/
  ├─ DailyIntelligenceCard.jsx                  [EXISTING] - Main decision display
  ├─ CorrelationCard.jsx                        [EXISTING] - Pattern card (expandable)
  ├─ EvidenceTimeline.jsx                       [EXISTING] - Evidence history
  ├─ LifecycleStageIndicator.jsx                [EXISTING] - Stage + progress
  ├─ DismissReasonSelector.jsx                  [EXISTING] - Modal for feedback
  ├─ ActionItem.jsx                             [EXISTING] - Action button
  ├─ ProgressBar.jsx                            [EXISTING] - Progress visualization
  └─ QuietConfidenceCard.jsx                    [EXISTING] - Quiet confidence display

mobile/hooks/
  └─ useOrchestrator.ts                         [EXISTING] - All orchestrator hooks
```

---

## 17. Key Design Decisions

### Why Wrapper Components?

1. **Separation of Concerns:** DashboardContent.jsx orchestrates layout; wrappers handle feature-specific logic
2. **Testability:** Each wrapper can be tested independently
3. **Reusability:** Wrappers can be used in other screens (Insights, Profile, etc.)
4. **Maintainability:** Behavioral health logic stays together, not scattered in DashboardContent.jsx

### Why Status Guards?

1. **UX:** New users don't see patterns they haven't discovered yet
2. **Performance:** Skip rendering during onboarding phase
3. **Data Integrity:** Wait until hasLoggedToday before showing recommendations

### Why Fail Silently on Behavioral Features?

1. **Core Features Unaffected:** Nutrition, mood, water tracking still work
2. **Backend Independence:** Orchestrator API being down doesn't break dashboard
3. **User Experience:** No error messages for secondary features

---

## 18. Validation Checklist

Before deploying:

- [ ] All 7 new hooks (useOrchestrator, useCorrelationFeedback, etc.) are correctly imported
- [ ] Wrapper components (DailyIntelligenceBehaviorSection, LifecycleStageFooter) exist and compile
- [ ] DashboardContent.jsx imports are added (lines 31-56, after existing components)
- [ ] State variables are added (line ~230)
- [ ] Handlers are added (line ~377)
- [ ] Both wrapper components are inserted in correct locations (lines 1222 and 1331)
- [ ] Visibility rules are correct (hasAnyData && !isOnboarding && hasLoggedToday)
- [ ] No console errors on mount
- [ ] Existing sections are still visible (no layout regression)
- [ ] Responsive on iPhone SE, iPhone 14 Pro, iPad
- [ ] Modal dismissal works correctly
- [ ] Haptic feedback fires on interactions
- [ ] Error boundaries prevent crashes

---

## 19. Quick Reference: Insertion Points

### For Developers

**Insert #1: DailyIntelligenceBehaviorSection**
- **File:** mobile/components/DashboardContent.jsx
- **Line:** After 1221 (after CompactDashboardTiles closing brace)
- **Condition:** `hasAnyData && !isOnboarding && hasLoggedToday`
- **Component:** DailyIntelligenceBehaviorSection

**Insert #2: LifecycleStageFooter**
- **File:** mobile/components/DashboardContent.jsx
- **Line:** After 1330 (after DashboardProgressSection closing brace, before ScrollView close)
- **Condition:** `orchestratorData?.stage` (optional: add `&& !isOnboarding`)
- **Component:** LifecycleStageFooter

**Insert #3: Imports + State + Handlers**
- **File:** mobile/components/DashboardContent.jsx
- **Lines:**
  - Imports: After line 56 (components) + After line 26 (hooks)
  - State: After line 244 (after useMoodInsights)
  - Handlers: After line 377 (after handleGoalsUpdate)

---

## 20. Success Metrics

After integration, verify:

1. ✅ DailyIntelligenceBehaviorSection renders when hasLoggedToday && hasAnyData
2. ✅ CorrelationCard list shows discovered patterns
3. ✅ DismissReasonSelector modal appears when user dismisses a pattern
4. ✅ Feedback is sent to backend (monitor logs)
5. ✅ LifecycleStageFooter shows at bottom of dashboard
6. ✅ No errors in console (behavioral features fail silently)
7. ✅ Existing features (nutrition, mood, water) unaffected
8. ✅ All sections visible and responsive
9. ✅ Haptic feedback works on all interactions
10. ✅ No layout overflow or visual regressions

---

## Appendix A: Component API Reference

### DailyIntelligenceCard Props

```typescript
interface DailyIntelligenceCardProps {
  type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT';
  headline: string;
  subtitle?: string;
  visual?: { type: string; data: any };
  actions: Array<{
    icon: string;
    text: string;
    description: string;
    onTap: () => void;
  }>;
  confidence: number;          // 0-1
  confidenceLabel: string;     // 'Low' | 'Moderate' | 'High' | 'Very High'
  lifecycleStage?: string;
  visualComponent?: React.ReactNode;
}
```

### CorrelationCard Props

```typescript
interface CorrelationCardProps {
  id: number;
  icon?: string;
  headline: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  affectedDomains?: string[];
  whatHappens?: string;
  whyHappens?: string;
  whenSeeIt?: string;
  healthImpact?: string;
  recommendations?: string[];
  onDismiss: (id: number, reason: string) => void;
  onKeepWatching?: (id: number) => void;
}
```

### LifecycleStageIndicator Props

```typescript
interface LifecycleStageIndicatorProps {
  stage: 'DISCOVERER' | 'BUILDER' | 'TRACKER' | 'OPTIMIZER' | 'MASTER' | 'CHAMPION' | 'ELITE';
  daysSinceStart: number;
}
```

### DismissReasonSelector Props

```typescript
interface DismissReasonSelectorProps {
  visible: boolean;
  headline: string;
  onDismiss: (reason: string) => void;
  onCancel: () => void;
}
```

---

**Document Complete**
*Next Step: Begin Phase 1 Implementation*
