# Behavioral Health Intelligence - Quick Start Guide

**Status:** Ready to Implement
**Files Created:** 3 documentation + 2 components
**Estimated Implementation Time:** 9 hours (3 days)

---

## TL;DR - What to Do

### Phase 1: Review (1 hour)
1. Read `BEHAVIORAL_HEALTH_INTEGRATION_PLAN.md` (sections 1-5)
2. Understand DashboardContent.jsx structure
3. Review wrapper components

### Phase 2: Implement (4 hours)
1. Follow `DASHBOARDCONTENT_MODIFICATIONS.md` exactly
2. Copy 5 code blocks into DashboardContent.jsx
3. Copy 2 wrapper components to dashboard folder
4. Run `npm run lint` - verify no errors

### Phase 3: Test & Deploy (4 hours)
1. Test on iOS simulator
2. Test on Android emulator
3. Verify render order
4. Test dismiss flow
5. Code review
6. Deploy to staging
7. Deploy to production (10% → 100%)

---

## File Map

### To Read (In Order)
```
1. BEHAVIORAL_HEALTH_INTEGRATION_PLAN.md         ← START HERE
2. DASHBOARDCONTENT_MODIFICATIONS.md             ← THEN DO THIS
3. BEHAVIORAL_HEALTH_TECHNICAL_REFERENCE.md      ← REFERENCE ONLY
```

### To Copy
```
mobile/components/dashboard/DailyIntelligenceBehaviorSection.jsx  (already created)
mobile/components/dashboard/LifecycleStageFooter.jsx             (already created)
```

### To Modify
```
mobile/components/DashboardContent.jsx           (5 insertions at specific lines)
```

---

## The 5 Modifications

### 1. Add Hook Imports (Line ~27)
```javascript
import {
  useOrchestrator,
  useCorrelationFeedback,
  useLearningState,
} from '../hooks/useOrchestrator';
```

### 2. Add Component Imports (Line ~57)
```javascript
import DailyIntelligenceBehaviorSection from './dashboard/DailyIntelligenceBehaviorSection';
import LifecycleStageFooter from './dashboard/LifecycleStageFooter';
```

### 3. Add State (Line ~245)
```javascript
const { data: orchestratorData, isLoading: orchestratorLoading } = useOrchestrator();
const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();
const { data: learningState } = useLearningState();
const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);
```

### 4. Add Handlers (Line ~378)
```javascript
const handleCorrelationDismiss = useCallback(async (correlationId, reason) => {
  // See DASHBOARDCONTENT_MODIFICATIONS.md for full code
}, [sendCorrelationFeedback, notify]);

const handleCorrelationAccept = useCallback(async (action) => {
  // See DASHBOARDCONTENT_MODIFICATIONS.md for full code
}, [notify]);
```

### 5. Insert Render Components
```javascript
// After line 1221 (CompactDashboardTiles)
{hasAnyData && !isOnboarding && hasLoggedToday && !orchestratorLoading && (
  <DailyIntelligenceBehaviorSection ... />
)}

// Before line 1331 (ScrollView close)
{orchestratorData && (
  <LifecycleStageFooter ... />
)}
```

---

## Visibility Rules

**DailyIntelligenceBehaviorSection shows when:**
- User has logged data (`hasAnyData`)
- Past onboarding phase (`!isOnboarding`)
- User logged today (`hasLoggedToday`)
- Orchestrator finished loading (`!orchestratorLoading`)

**LifecycleStageFooter shows when:**
- Orchestrator returned stage data (`orchestratorData?.stage`)

---

## What Gets Added

### Main Feature: Daily Intelligence
- Decision card showing "SPEAK", "REINFORCE", "PREDICT", or "SILENT"
- List of discovered patterns (correlations)
- Dismiss modal with 4 reason options
- Full error handling (fails silently if API down)

### Secondary Feature: Lifecycle Stage
- Shows user stage (DISCOVERER → ELITE)
- Shows progress to next stage
- Motivational footer at bottom of dashboard

---

## Testing Checklist

- [ ] DailyIntelligenceBehaviorSection renders after CompactDashboardTiles
- [ ] CorrelationCard list shows patterns
- [ ] Tap dismiss → see modal with 4 reasons
- [ ] Select reason → closes modal
- [ ] LifecycleStageFooter at bottom of ScrollView
- [ ] No console errors
- [ ] Existing sections still visible
- [ ] Responsive on different screen sizes
- [ ] No layout overflow

---

## Troubleshooting

### "DailyIntelligenceBehaviorSection not showing"
1. Check if `hasLoggedToday` is true
2. Check if `hasAnyData` is true
3. Check if `orchestratorData` is not null (Network tab)
4. Check if orchestrator API is responding

### "Dismiss modal not appearing"
1. Check if CorrelationCard exists
2. Check if state `dismissingCorrelationId` is being set
3. Check DismissReasonSelector `visible` prop

### "No errors but not working"
1. Run `npm run lint` - check for syntax errors
2. Check React DevTools - verify hook data
3. Check Network tab - verify API calls
4. Check console - search for "[Dashboard]" logs

---

## Success Metrics

After implementation:

✅ DailyIntelligenceBehaviorSection visible (when conditions met)
✅ Correlations displayed properly
✅ Dismiss flow works (4 reasons, modal closes)
✅ Feedback sent to backend
✅ LifecycleStageFooter at bottom
✅ No console errors
✅ Existing features unaffected
✅ Responsive layout
✅ Haptic feedback working

---

## Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Read documentation | 1 hour |
| 2a | Add imports & state | 30 min |
| 2b | Add handlers | 30 min |
| 2c | Render insertions | 30 min |
| 2d | Copy components | 15 min |
| 3a | Lint & basic test | 30 min |
| 3b | Device testing | 1 hour |
| 3c | Code review | 1 hour |
| 3d | Deploy to staging | 1 hour |
| 3e | Deploy to production | 1 hour |
| **TOTAL** | | **9 hours** |

---

## Next Steps

1. **Now:** Read `BEHAVIORAL_HEALTH_INTEGRATION_PLAN.md` (sections 1-5)
2. **Then:** Follow `DASHBOARDCONTENT_MODIFICATIONS.md` exactly
3. **Finally:** Test and deploy

---

## Questions?

- **"What if orchestrator API is down?"** → Dashboard still works. Behavioral features fail silently.
- **"Will this break existing features?"** → No. All new features are additive.
- **"Can I revert if there are issues?"** → Yes, in ~5 minutes. See rollback instructions.
- **"How many lines added?"** → ~95 lines to DashboardContent.jsx total.
- **"Do I need to modify existing components?"** → No. Only add code; no modifications to existing sections.

---

## Document References

| File | Use When |
|------|----------|
| BEHAVIORAL_HEALTH_INTEGRATION_PLAN.md | Understand architecture & strategy |
| DASHBOARDCONTENT_MODIFICATIONS.md | Implement code changes |
| BEHAVIORAL_HEALTH_TECHNICAL_REFERENCE.md | Look up API contracts, troubleshoot |
| DailyIntelligenceBehaviorSection.jsx | Copy to dashboard folder |
| LifecycleStageFooter.jsx | Copy to dashboard folder |

---

**Ready to start?** → Open `BEHAVIORAL_HEALTH_INTEGRATION_PLAN.md`

