# DashboardContent.jsx - Exact Modifications Guide

This document provides the exact code locations and content to modify DashboardContent.jsx for behavioral health integration.

---

## MODIFICATION 1: Import Statements

### Location: Lines 31-56 (After existing component imports)

**Current (Line 56):**
```jsx
import CompactDashboardTiles from "./dashboard/CompactDashboardTiles";
```

**Add After (New Lines 57-59):**
```jsx
// Behavioral Health Components
import DailyIntelligenceBehaviorSection from './dashboard/DailyIntelligenceBehaviorSection';
import LifecycleStageFooter from './dashboard/LifecycleStageFooter';
```

### Location: Lines 20-29 (After existing hook imports)

**Current (Line 26):**
```jsx
import { useRecommendations } from "../hooks/useRecommendations";
```

**Add After (New Lines 27-31):**
```jsx
import {
  useOrchestrator,
  useCorrelationFeedback,
  useLearningState,
} from '../hooks/useOrchestrator';
```

---

## MODIFICATION 2: Add State Variables

### Location: After Line 244 (After useMoodInsights hook)

**Current (Lines 242-244):**
```jsx
  // Mood tracking hooks
  const { data: trendData } = useMoodTrends({ period: 'week' });
  const { data: moodInsightsData, isLoading: moodInsightsLoading } = useMoodInsights({ windowDays: 30, trendDays: 7 });
```

**Add After (New Lines 245-265):**
```jsx

  // ============================================================================
  // BEHAVIORAL HEALTH HOOKS & STATE
  // ============================================================================

  // Orchestrator (daily decision engine) - fetches SPEAK/REINFORCE/PREDICT/SILENT decisions
  const {
    data: orchestratorData,
    isLoading: orchestratorLoading,
    error: orchestratorError,
  } = useOrchestrator();

  // Correlation feedback mutation
  const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();

  // Learning state (readiness for new patterns)
  const { data: learningState } = useLearningState();

  // State for managing which correlation is being dismissed
  const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);
```

---

## MODIFICATION 3: Add Event Handlers

### Location: After Line 377 (After handleGoalsUpdate)

**Current (Lines 362-377):**
```jsx
  // Update nutrition goals (inline edit from RemainingBudgetCard)
  // eslint-disable-next-line no-unused-vars
  const handleGoalsUpdate = useCallback(async (goalUpdates) => {
    try {
      const response = await apiClient.post('/api/nutrition/goals', goalUpdates);
      if (response?.data?.success) {
        notify.success('Goal updated!');
        // Refresh dashboard data
        await refetch();
      } else {
        notify.error('Failed to update goal');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to update goals:', error);
      notify.error(error?.response?.data?.error || 'Failed to update goal');
    }
  }, [refetch, notify]);
```

**Add After (New Lines 378-429):**
```jsx

  // ============================================================================
  // BEHAVIORAL HEALTH HANDLERS
  // ============================================================================

  /**
   * Handle when user dismisses a correlation pattern
   * Sends feedback to backend for learning system
   *
   * Reasons map to backend override types:
   * - 'not_relevant' → USER_DISMISSED (confidence = 0)
   * - 'temporary' → TEMPORARY_DISMISS (7-day revalidation)
   * - 'fixed' → RESOLVED (30-day refresh)
   * - 'never_show' → DEACTIVATION (permanent hide)
   */
  const handleCorrelationDismiss = useCallback(async (correlationId, reason) => {
    try {
      // Map UI reason to backend override type
      const overrideTypeMap = {
        'not_relevant': 'USER_DISMISSED',
        'temporary': 'TEMPORARY_DISMISS',
        'fixed': 'RESOLVED',
        'never_show': 'DEACTIVATION',
      };

      await sendCorrelationFeedback({
        correlationId,
        overrideType: overrideTypeMap[reason] || 'USER_DISMISSED',
        userReason: reason,
      });

      // Show confirmation
      notify.info('Pattern feedback recorded');
    } catch (error) {
      console.error('[Dashboard] Failed to send correlation feedback:', error);
      // Fail silently - behavioral features are secondary
    }
  }, [sendCorrelationFeedback, notify]);

  /**
   * Handle when user accepts a correlation action
   * Actions include: food recommendations, hydration nudges, etc.
   *
   * This can trigger different flows depending on action.type:
   * - 'food_suggestion' → Add to meal log
   * - 'hydration_nudge' → Log water intake
   * - 'timing_adjustment' → Modify meal timing
   */
  const handleCorrelationAccept = useCallback(async (action) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // TODO: Implement action handling based on action.type
      // For now, just show success and optionally navigate

      notify.success('Action recorded!');
    } catch (error) {
      console.error('[Dashboard] Failed to process correlation action:', error);
      notify.error('Failed to process action');
    }
  }, [notify]);
```

---

## MODIFICATION 4: Insert DailyIntelligenceBehaviorSection

### Location: Line 1221 (After CompactDashboardTiles, before PremiumAchievementsCard)

**Current (Lines 1216-1227):**
```jsx
        {hasAnyData && (
          <CompactDashboardTiles
            today={today}
            onTapMacros={() => setNutritionExpanded(true)}
          />
        )}

        {/* ============================================ */}
        {/* ACHIEVEMENTS & ENGAGEMENT - Gamification Card */}
        {/* Only show after user logs today AND past onboarding phase */}
        {/* ============================================ */}
        {hasLoggedToday && !isOnboarding && (
```

**Replace with (Modified Lines 1216-1247):**
```jsx
        {hasAnyData && (
          <CompactDashboardTiles
            today={today}
            onTapMacros={() => setNutritionExpanded(true)}
          />
        )}

        {/* ============================================ */}
        {/* BEHAVIORAL HEALTH: DAILY INTELLIGENCE */}
        {/* Decision engine recommendations (SPEAK/REINFORCE/PREDICT/SILENT) */}
        {/* Shows discovered patterns (correlations) + lifecycle stage */}
        {/* ============================================ */}
        {hasAnyData && !isOnboarding && hasLoggedToday && !orchestratorLoading && (
          <DailyIntelligenceBehaviorSection
            styles={styles}
            orchestratorData={orchestratorData}
            onDismiss={handleCorrelationDismiss}
            onAccept={handleCorrelationAccept}
          />
        )}

        {/* ============================================ */}
        {/* ACHIEVEMENTS & ENGAGEMENT - Gamification Card */}
        {/* Only show after user logs today AND past onboarding phase */}
        {/* ============================================ */}
        {hasLoggedToday && !isOnboarding && (
```

---

## MODIFICATION 5: Insert LifecycleStageFooter

### Location: Line 1330 (After DashboardProgressSection, before ScrollView close)

**Current (Lines 1323-1331):**
```jsx
        {/* ============================================ */}
        {/* PROGRESS SECTION - Collapsible (Calendar moved to top) */}
        {/* ============================================ */}
        <DashboardProgressSection
          styles={styles}
          expanded={progressExpanded}
          onToggle={() => setProgressExpanded(!progressExpanded)}
          trends={trends}
          goals={goals}
          recentWeight={recentWeight}
        />
          </ScrollView>
```

**Replace with (Modified Lines 1323-1343):**
```jsx
        {/* ============================================ */}
        {/* PROGRESS SECTION - Collapsible (Calendar moved to top) */}
        {/* ============================================ */}
        <DashboardProgressSection
          styles={styles}
          expanded={progressExpanded}
          onToggle={() => setProgressExpanded(!progressExpanded)}
          trends={trends}
          goals={goals}
          recentWeight={recentWeight}
        />

        {/* ============================================ */}
        {/* BEHAVIORAL HEALTH: LIFECYCLE STAGE INDICATOR */}
        {/* Shows user's current stage progression and days until next stage */}
        {/* ============================================ */}
        {orchestratorData && (
          <LifecycleStageFooter
            stage={orchestratorData.stage}
            daysSinceStart={orchestratorData.daysSinceStart}
            styles={styles}
          />
        )}
          </ScrollView>
```

---

## Summary of Changes

### Files Modified
1. **mobile/components/DashboardContent.jsx**
   - Add 3 import statements (2 components, 3 hooks)
   - Add 4 new state variables + 1 state setter
   - Add 2 new event handlers (~52 lines)
   - Insert DailyIntelligenceBehaviorSection (~10 lines)
   - Insert LifecycleStageFooter (~6 lines)

### Files to Create
1. **mobile/components/dashboard/DailyIntelligenceBehaviorSection.jsx**
2. **mobile/components/dashboard/LifecycleStageFooter.jsx**

### Total Lines Added to DashboardContent.jsx
- Imports: ~6 lines
- State & Hooks: ~21 lines
- Handlers: ~52 lines
- Render insertions: ~16 lines
- **Total: ~95 lines added** (from 2457 to ~2552)

### Existing Components Used (No Modifications)
- DailyIntelligenceCard
- CorrelationCard
- EvidenceTimeline
- LifecycleStageIndicator
- DismissReasonSelector
- ActionItem
- ProgressBar

---

## Implementation Order

1. **Step 1:** Add imports (Lines 27-31 & 57-59)
2. **Step 2:** Add state + hooks (After line 244)
3. **Step 3:** Add handlers (After line 377)
4. **Step 4:** Create DailyIntelligenceBehaviorSection.jsx
5. **Step 5:** Create LifecycleStageFooter.jsx
6. **Step 6:** Insert DailyIntelligenceBehaviorSection in render (Line 1221)
7. **Step 7:** Insert LifecycleStageFooter in render (Line 1330)
8. **Step 8:** Test & verify

---

## Validation After Modifications

Run these checks:

```bash
# Check syntax errors
npm run lint mobile/components/DashboardContent.jsx

# Test on iOS simulator
npm run ios

# Test on Android emulator
npm run android

# Monitor for errors
adb logcat | grep -i error
```

Expected behaviors:
- ✅ Dashboard renders without errors
- ✅ DailyIntelligenceBehaviorSection appears after CompactDashboardTiles (if hasLoggedToday && hasAnyData)
- ✅ LifecycleStageFooter appears at bottom of ScrollView (if orchestratorData exists)
- ✅ Dismiss reason modal appears when tapping dismiss on a pattern
- ✅ Haptic feedback fires on all interactions
- ✅ No console errors for behavioral features (fail silently if API down)

---

## Rollback Instructions

If issues occur, revert:

1. Remove both new wrapper components (DailyIntelligenceBehaviorSection.jsx, LifecycleStageFooter.jsx)
2. Remove imports of those components (lines 57-59)
3. Remove orchestrator hook imports (lines 27-31)
4. Remove inserted render sections (DailyIntelligenceBehaviorSection, LifecycleStageFooter)
5. Remove state variables and handlers

DashboardContent.jsx will return to original state without behavioral health features.

