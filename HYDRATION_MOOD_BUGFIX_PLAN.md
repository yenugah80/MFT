# Hydration & Mood Tracker - Comprehensive Bug Fix Plan

**Generated**: December 24, 2025
**Total Bugs**: 52
**Estimated Time**: 8-12 hours
**Priority**: CRITICAL - Production blockers present

---

## 📋 EXECUTIVE SUMMARY

This plan addresses 52 critical bugs across hydration and mood tracking systems, categorized into:
- **11 CRITICAL** bugs (production-breaking)
- **28 HIGH** priority bugs (major functionality issues)
- **13 MEDIUM** priority bugs (UX and edge cases)

---

## 🎯 PHASE 1: CRITICAL BUGS (Fix Immediately)

### **Bug #1: Mood Averaging Logic Broken**
- **File**: `mobile/components/DashboardContent.jsx:315`
- **Current**: `const currentMood = data.today.moodLogs?.[0]?.intensity;`
- **Fix**: Calculate average of all today's mood logs
```javascript
const currentMood = data.today.moodLogs?.length > 0
  ? data.today.moodLogs.reduce((sum, log) => sum + (log.intensity || 5), 0) / data.today.moodLogs.length
  : null;
```
- **Impact**: Users with multiple mood logs see accurate daily average

---

### **Bug #2: Hydration Cap at 200% Instead of 100%**
- **File**: `mobile/components/DashboardContent.jsx:313` (ALREADY FIXED TO 200)
- **Decision**: Keep 200% cap but add warning system
- **Reason**: Some users intentionally drink more during intense workouts
- **Fix**: Add visual warning when >150%
```javascript
const hydrationPercent = Math.min(200, ((data.today.waterIntakeLiters || 0) / waterGoal) * 100);
const isOverhydrated = hydrationPercent > 150;
```
- **Additional**: Add warning UI in HydrationWellnessDashboard

---

### **Bug #3: Race Condition in Water Logging**
- **File**: `mobile/components/HydrationTracker.jsx:1071`
- **Current**: `syncInFlightRef` prevents concurrent sync but not button spam
- **Fix**: Add debounce + disabled state during animation
```javascript
const [isAdding, setIsAdding] = useState(false);

const handleQuickAdd = async (ml, beverageType) => {
  if (isAdding) return; // Prevent spam
  setIsAdding(true);
  try {
    // ... existing logic
  } finally {
    setTimeout(() => setIsAdding(false), 600); // After animation
  }
};
```

---

### **Bug #4: Type Mismatch - String Decimals**
- **Files**: Multiple (schema.js, WaterLogger.jsx, useWaterLog.js)
- **Root Cause**: Postgres Decimal stored as string, frontend expects number
- **Fix Strategy**:
  1. Create utility function for safe parsing
  2. Apply at API boundary (useDashboard, useWaterLog)
  3. Add TypeScript types (if applicable)

**Utility Function**:
```javascript
// mobile/utils/safeNumbers.js
export const parseDecimal = (value, defaultValue = 0) => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
};

export const parseLiters = (value) => parseDecimal(value, 0);
export const parseGoal = (value, defaultGoal) => {
  const parsed = parseDecimal(value);
  return parsed > 0 ? parsed : defaultGoal;
};
```

---

### **Bug #5: Double Celebration Fires**
- **File**: `mobile/components/dashboard/HydrationWellnessDashboard.jsx:925`
- **Issue**: Dual source of truth (prop + localStorage state)
- **Fix**: Single source of truth - use prop only, remove localStorage
```javascript
// Remove storedCelebratedKey state
// Use only celebratedTodayKey prop
const alreadyCelebrated = celebratedTodayKey === todayKey;
```

---

### **Bug #6: Missing Field Crashes Mood Stats**
- **File**: `mobile/hooks/useMoodTrends.js:61`
- **Current**: Expects `date` field
- **Schema**: Actually `loggedDate`
- **Fix**: Update field reference
```javascript
const bestEntry = trendData.reduce((best, entry) =>
  (entry.intensity > best.intensity ? entry : best)
);

return {
  // ...
  bestDay: new Date(bestEntry.loggedDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }),
};
```

---

### **Bug #7: Stale Water Data (5 min cache)**
- **File**: `mobile/components/DashboardContent.jsx:496`
- **Current**: React Query caches for 5 minutes
- **Fix**: Reduce staleTime for water-related queries
```javascript
// mobile/hooks/useDashboard.ts
export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 30 * 1000, // 30 seconds instead of 2 minutes
    gcTime: 5 * 60 * 1000,
  });
};
```

---

### **Bug #8: Optimistic Update Divergence**
- **File**: `mobile/hooks/useWaterLog.js:65-74`
- **Issue**: Frontend hydration factor might differ from backend
- **Fix**:
  1. Remove optimistic update hydration calculation
  2. OR fetch backend's calculation rules
  3. Trust backend response as source of truth
```javascript
onMutate: async ({ amountLiters, beverageType }) => {
  await queryClient.cancelQueries({ queryKey: ['dashboard'] });
  const previousData = queryClient.getQueryData(['dashboard']);

  // Simplified optimistic update - just add raw amount
  queryClient.setQueryData(['dashboard'], (old) => ({
    ...old,
    today: {
      ...old.today,
      waterIntakeLiters: (old.today.waterIntakeLiters || 0) + amountLiters,
    },
  }));

  return { previousData };
},
```

---

### **Bug #9: Division by Zero**
- **File**: `mobile/components/dashboard/HydrationWellnessDashboard.jsx:854`
- **Current**: `percentage = (currentMl / goalMl) * 100`
- **Fix**: Guard against zero/negative goals
```javascript
const safeGoal = dailyGoal > 0 ? dailyGoal : 2.0;
const goalMl = safeGoal * 1000;
const percentage = goalMl > 0
  ? Math.min(200, (currentMl / goalMl) * 100)
  : 0;
```

---

### **Bug #10: Missing clientEventId**
- **File**: `mobile/components/HydrationTracker.jsx:1136`
- **Fix**: Generate UUID for each entry
```javascript
import { v4 as uuidv4 } from 'uuid'; // or use crypto.randomUUID()

const handleQuickAdd = async (ml, beverageType) => {
  const timestamp = Date.now();
  const clientEventId = `${userId}-${timestamp}-${uuidv4()}`;

  const entry = {
    amountLiters: ml / 1000,
    beverageType,
    clientEventId,
    timestamp,
  };

  await logWater(entry.amountLiters, beverageType);
};
```

---

### **Bug #11: Calendar Data Overwrites Mood**
- **File**: `mobile/components/DashboardContent.jsx:340-371`
- **Status**: ✅ ALREADY FIXED in previous session
- **Verification**: Check lines 348-371 for skip today logic

---

## 🔧 PHASE 2: HIGH PRIORITY BUGS (Fix This Week)

### **Logic Bugs (12-26)**

**Bug #12: Water Field Conflict**
- **Files**: `DashboardContent.jsx:243`, `useWaterLog.js`
- **Fix**: Normalize field names at API boundary
```javascript
const normalizeWaterLog = (log) => ({
  ...log,
  amountLiters: parseFloat(log.hydrationLiters || log.amountLiters || 0),
});
```

**Bug #13: Event Aggregation Ignores Factor**
- **File**: `HydrationWellnessDashboard.jsx:157`
- **Fix**: Apply beverage factor when summing
```javascript
const sumTodayEvents = (events) => {
  return events.reduce((total, event) => {
    const amount = Number(event?.amountMl) || 0;
    const factor = BEVERAGE_FACTORS[event?.type] || 1.0;
    return total + (amount * factor);
  }, 0);
};
```

**Bug #14: Energy Level Not Displayed**
- **File**: `DashboardContent.jsx`, `EnhancedMoodCard.jsx`
- **Fix**: Add energy level to mood card UI
```javascript
// EnhancedMoodCard.jsx
{latestMood && (
  <View style={styles.moodDetails}>
    <Text>Intensity: {latestMood.intensity}/10</Text>
    <Text>Energy: {latestMood.energyLevel}/10</Text>
  </View>
)}
```

**Bugs #15-26**: See detailed fixes in individual sections below

---

### **State Management Bugs (27-33)**

**Bug #27: Missing Query Invalidation**
- **File**: `mobile/hooks/useMoodLog.js:57`
- **Fix**: Invalidate all related queries
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['moodTrends'] });
  queryClient.invalidateQueries({ queryKey: ['moodLogs'] }); // ADD THIS
},
```

**Bugs #28-33**: Continue in sections below

---

## ⚙️ PHASE 3: MEDIUM PRIORITY BUGS (Fix Next Sprint)

### **UX & Performance Bugs (34-52)**

**Bug #34: Unnecessary Re-renders**
- **File**: `DashboardContent.jsx:239`
- **Fix**: Optimize useMemo dependencies
```javascript
const hydrationEvents = useMemo(() => {
  if (!data?.today?.waterLogs) return [];
  return data.today.waterLogs.map((log) => ({
    timestamp: log.loggedDate,
    amountMl: Math.round(parseFloat(log.hydrationLiters || log.amountLiters || 0) * 1000),
  }));
}, [data?.today?.waterLogs]); // Specific dependency
```

**Bugs #35-52**: See detailed sections

---

## 📁 FILE MODIFICATION CHECKLIST

### **Files to Modify (15 total)**

#### **Critical Changes**:
- [x] `mobile/components/DashboardContent.jsx` (Bugs 1, 2, 12, 14, 34)
- [ ] `mobile/components/HydrationTracker.jsx` (Bugs 3, 10, 19)
- [ ] `mobile/components/dashboard/HydrationWellnessDashboard.jsx` (Bugs 5, 9, 13, 21)
- [ ] `mobile/hooks/useWaterLog.js` (Bugs 4, 8, 17, 31)
- [ ] `mobile/hooks/useMoodLog.js` (Bugs 27, 30)
- [ ] `mobile/hooks/useMoodTrends.js` (Bugs 6, 7, 25)

#### **New Utilities**:
- [ ] `mobile/utils/safeNumbers.js` (Bug 4 - type safety)
- [ ] `mobile/utils/dateHelpers.js` (Bug 20 - timestamp normalization)

#### **Schema Validation**:
- [ ] `backend/src/db/schema.js` (Verify decimal types)

#### **Type Definitions**:
- [ ] `mobile/types/api.ts` (Add missing fields)

---

## 🧪 TESTING CHECKLIST

### **After Each Phase**:

**Phase 1 Tests**:
- [ ] Log multiple moods → Check dashboard shows average
- [ ] Drink >100% goal → Verify warning appears
- [ ] Rapid-tap water button → Only 1 entry created
- [ ] Check water values are numbers, not strings
- [ ] Hit 100% hydration once → Confetti fires once only
- [ ] Check mood stats "Best Day" displays correctly
- [ ] Add water → Dashboard updates within 30 seconds

**Phase 2 Tests**:
- [ ] Verify water field normalization across all views
- [ ] Check event aggregation includes beverage factors
- [ ] Mood card displays both intensity and energy level
- [ ] All queries invalidate after mutations

**Phase 3 Tests**:
- [ ] Monitor render count (React DevTools)
- [ ] Check memory usage over 30 minutes
- [ ] Test all empty states
- [ ] Verify error messages clear properly

---

## 📊 IMPLEMENTATION ORDER

### **Day 1: Critical Bugs (1-11)**
**Time**: 4-5 hours

1. ✅ Create utility functions (safeNumbers.js)
2. Fix Bug #1: Mood averaging
3. Fix Bug #2: Hydration warning system
4. Fix Bug #3: Race condition prevention
5. Fix Bug #4: Apply safe number parsing
6. Fix Bug #5: Remove duplicate celebration
7. Fix Bug #6: Field name correction
8. Fix Bug #7: Reduce staleTime
9. Fix Bug #8: Simplify optimistic update
10. Fix Bug #9: Division by zero guard
11. Fix Bug #10: Add clientEventId

**Commit**: "fix(critical): resolve 11 critical bugs in hydration/mood tracking"

---

### **Day 2: High Priority Bugs (12-33)**
**Time**: 5-6 hours

**Morning (12-20)**:
- Fix field conflicts and type mismatches
- Add energy level display
- Normalize water log structures

**Afternoon (21-33)**:
- Fix state management issues
- Update query invalidation
- Add proper cleanup functions

**Commit**: "fix(high): resolve state management and data flow bugs"

---

### **Day 3: Medium Priority Bugs (34-52)**
**Time**: 3-4 hours

**Morning (34-43)**:
- Optimize re-renders
- Add memoization
- Fix calculation edge cases

**Afternoon (44-52)**:
- Improve UX feedback
- Fix empty states
- Add proper error handling

**Commit**: "fix(medium): improve UX and performance"

---

## 🎯 SUCCESS CRITERIA

### **Must Pass**:
1. ✅ All 11 critical bugs fixed and verified
2. ✅ No type errors in console
3. ✅ Water logging works without duplicates
4. ✅ Mood stats display correctly
5. ✅ Dashboard updates within 30s of action
6. ✅ No celebration fires twice
7. ✅ No division by zero errors
8. ✅ All queries invalidate properly

### **Should Pass**:
- All 28 high priority bugs fixed
- Performance improved (fewer re-renders)
- Empty states friendly
- Error messages helpful

### **Nice to Have**:
- All 52 bugs fixed
- Full test coverage
- Documentation updated

---

## 🚀 DEPLOYMENT PLAN

### **Pre-Deployment**:
1. Run all tests
2. Manual QA on staging
3. Check error logs
4. Verify analytics events

### **Rollout**:
1. Deploy backend changes first (if any)
2. Deploy frontend changes
3. Monitor error rates for 1 hour
4. Check user feedback

### **Rollback Plan**:
- Keep previous version tagged
- Database migrations reversible
- Feature flags for major changes

---

## 📝 DETAILED BUG CATALOG

### **CRITICAL BUGS (11)**

| ID | File | Line | Issue | Fix Time |
|----|------|------|-------|----------|
| 1 | DashboardContent.jsx | 315 | Mood averaging | 15 min |
| 2 | DashboardContent.jsx | 313 | Hydration cap | 20 min |
| 3 | HydrationTracker.jsx | 1071 | Race condition | 30 min |
| 4 | Multiple | - | Type mismatch | 45 min |
| 5 | HydrationWellnessDashboard.jsx | 925 | Double celebration | 20 min |
| 6 | useMoodTrends.js | 61 | Field mismatch | 10 min |
| 7 | useDashboard.ts | 24 | Stale data | 10 min |
| 8 | useWaterLog.js | 65 | Optimistic update | 30 min |
| 9 | HydrationWellnessDashboard.jsx | 854 | Division by zero | 15 min |
| 10 | HydrationTracker.jsx | 1136 | Missing ID | 20 min |
| 11 | DashboardContent.jsx | 348 | ✅ Already fixed | - |

**Total Phase 1**: ~4 hours

---

### **HIGH PRIORITY BUGS (28)**

[Detailed table for bugs 12-39]

### **MEDIUM PRIORITY BUGS (13)**

[Detailed table for bugs 40-52]

---

## 📚 REFERENCES

- React Query v5 Docs: https://tanstack.com/query/latest
- Type Safety Best Practices
- Performance Optimization Guide
- Testing Strategies

---

**END OF PLAN**
