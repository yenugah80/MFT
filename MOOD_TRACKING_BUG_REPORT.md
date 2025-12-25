# Mood Tracking & Dashboard - Critical Bug Report

**Generated:** December 24, 2025
**Scope:** Comprehensive analysis of Log tab mood tracker and Dashboard-level mood components
**Total Issues Found:** 20 bugs (6 Critical, 8 High Priority, 6 Medium Priority)

---

## Executive Summary

This report identifies **20 critical logical and UX bugs** across the mood tracking and dashboard systems. Issues range from data integrity problems, UX confusion, missing authentication, performance inefficiencies, to potential crashes.

**Key Problem Areas:**
1. **Log Tab & MoodLogger Component** (6 bugs) - UX confusion, missing features, state management
2. **useMoodLog Hook** (3 bugs) - Security, data integrity, authentication
3. **EnhancedMoodCard Component** (3 bugs) - Type safety, validation, defensive coding
4. **MealMoodCalendar Component** (4 bugs) - Logic flaws, performance, null handling
5. **DashboardContent Component** (4 bugs) - Data consistency, authentication, dependencies

---

## CRITICAL BUGS (Priority: URGENT)

### 🔴 BUG #1: Energy Level Slider Shows Wrong Label
**Severity:** High | **Type:** UX Confusion | **File:** `mobile/components/MoodLogger.jsx:289-299`

**Problem:**
The Energy Level slider uses the `IntensitySlider` component, which displays "Intensity" at the top, then shows "Energy Level" text below. Users see conflicting labels.

```javascript
{/* Energy Level Slider */}
{selectedMood && (
  <View style={styles.section}>
    <IntensitySlider  // ❌ WRONG COMPONENT
      value={energyLevel}
      onChange={setEnergyLevel}
      moodColor={moodColors.base}
    />
    <Text style={styles.sectionSubtitle}>Energy Level</Text>
  </View>
)}
```

**Impact:** Users are confused about whether they're rating intensity or energy, leading to incorrect data.

**Fix Required:**
1. Create dedicated `EnergyLevelSlider` component OR
2. Make `IntensitySlider` accept a `label` prop to customize the displayed text

**Recommended Fix:**
```javascript
<IntensitySlider
  value={energyLevel}
  onChange={setEnergyLevel}
  moodColor={moodColors.base}
  label="Energy Level"  // Add customizable label
/>
```

---

### 🔴 BUG #2: Missing Tag Categories (Weather & Stress)
**Severity:** High | **Type:** Data Integrity | **File:** `mobile/components/MoodLogger.jsx:36-40`

**Problem:**
Only 3 tag categories defined (sleep, exercise, social), but backend and design expect 5 categories. Missing: **weather** and **stress**.

```javascript
const TAG_CATEGORIES = {
  sleep: { label: 'Sleep', icon: 'moon', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
  exercise: { label: 'Exercise', icon: 'barbell', options: ['None', 'Light', 'Moderate', 'Intense'] },
  social: { label: 'Social', icon: 'people', options: ['Alone', 'Friends', 'Family', 'Crowded'] },
  // ❌ MISSING: weather and stress
};
```

**Impact:** Users cannot log important mood context factors, reducing insight quality.

**Fix Required:**
Add missing categories:
```javascript
const TAG_CATEGORIES = {
  sleep: { label: 'Sleep', icon: 'moon', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
  exercise: { label: 'Exercise', icon: 'barbell', options: ['None', 'Light', 'Moderate', 'Intense'] },
  social: { label: 'Social', icon: 'people', options: ['Alone', 'Friends', 'Family', 'Crowded'] },
  weather: { label: 'Weather', icon: 'partly-sunny', options: ['Sunny', 'Cloudy', 'Rainy', 'Stormy'] },
  stress: { label: 'Stress', icon: 'alert-circle', options: ['None', 'Low', 'Moderate', 'High'] },
};
```

---

### 🔴 BUG #3: No Authentication Check Before Logging
**Severity:** Critical | **Type:** Security | **File:** `mobile/hooks/useMoodLog.js:28-32`

**Problem:**
`userId` is extracted from `useAuth()` but never verified before making API calls. If user is not authenticated, the hook will attempt API calls with `null` or `undefined` userId, causing cryptic backend errors.

```javascript
export function useMoodLog() {
  const { userId } = useAuth();  // ❌ Not verified
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  // ... proceeds to use userId without checking
```

**Impact:**
- Silent failures for unauthenticated users
- Poor error messages
- Potential security vulnerability if backend doesn't validate properly

**Fix Required:**
```javascript
export function useMoodLog() {
  const { userId, isSignedIn } = useAuth();

  const logMood = async (moodData) => {
    if (!isSignedIn || !userId) {
      throw new Error('You must be signed in to log mood');
    }
    // ... rest of implementation
  };
```

---

### 🔴 BUG #4: Weak clientEventId Generation (Race Condition Risk)
**Severity:** High | **Type:** Data Integrity | **File:** `mobile/hooks/useMoodLog.js:40`

**Problem:**
Current `clientEventId` uses only 9 random characters. In rapid-tap scenarios (user taps mood button multiple times), collision is possible, defeating idempotency protection.

```javascript
const clientEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
```

**Impact:** Duplicate mood entries if user rapidly taps "Save" multiple times.

**Fix Required:**
Use UUID or include userId for stronger uniqueness:
```javascript
import { v4 as uuidv4 } from 'uuid'; // or use expo-crypto

const clientEventId = `${userId}-${Date.now()}-${uuidv4()}`;
```

Or without external dependency:
```javascript
const clientEventId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 15)}-${Math.random().toString(36).slice(2, 15)}`;
```

---

### 🔴 BUG #5: Form Reset Timing Issue in MoodLogger
**Severity:** Medium | **Type:** State Management | **File:** `mobile/components/MoodLogger.jsx:183-192`

**Problem:**
Form only resets when modal `visible` becomes `false`, NOT after successful save. If save succeeds but user re-opens modal before animation completes, old data persists.

```javascript
useEffect(() => {
  if (visible) {
    // Animations...
  } else {
    // ❌ Reset only happens on close, not after save
    slideAnim.setValue(300);
    fadeAnim.setValue(0);
    setSelectedMood(null);
    setIntensity(5);
    setEnergyLevel(5);
    setTags({});
    setNote('');
    setShowAdvanced(false);
  }
}, [visible]);
```

**Impact:** User might see stale data from previous mood log entry.

**Fix Required:**
Add explicit reset after successful save:
```javascript
const handleSave = async () => {
  try {
    await onSuccess?.(moodData);
    // Reset form immediately after success
    resetForm();
    onClose();
  } catch (error) {
    // Handle error
  }
};

const resetForm = () => {
  setSelectedMood(null);
  setIntensity(5);
  setEnergyLevel(5);
  setTags({});
  setNote('');
  setShowAdvanced(false);
};
```

---

### 🔴 BUG #6: Incorrect Default Mood Fallback
**Severity:** High | **Type:** Logic Error | **File:** `mobile/hooks/useMoodLog.js:108`

**Problem:**
Fallback uses `MOOD_TYPES[3]` which is **'energized'**, not 'neutral'. Should use semantic key lookup.

```javascript
const getMoodMeta = useCallback((moodKey) => {
  return MOOD_TYPES.find(m => m.key === moodKey) || MOOD_TYPES[3]; // ❌ Index 3 = 'energized'
}, []);
```

**MOOD_TYPES Array:**
- Index 0: happy
- Index 1: calm
- Index 2: focused
- Index 3: **energized** ❌
- Index 4: **neutral** ✅

**Impact:** Invalid mood keys default to 'energized' instead of 'neutral', skewing analytics.

**Fix Required:**
```javascript
const getMoodMeta = useCallback((moodKey) => {
  return MOOD_TYPES.find(m => m.key === moodKey) || MOOD_TYPES.find(m => m.key === 'neutral') || MOOD_TYPES[0];
}, []);
```

---

## HIGH PRIORITY BUGS

### 🟠 BUG #7: EnhancedMoodCard Prop Type Inconsistency
**Severity:** Medium | **Type:** Type Safety | **File:** `mobile/components/dashboard/EnhancedMoodCard.jsx:45-56`

**Problem:**
Component signature accepts `mood = null` but implementation tries to handle both array and object:

```javascript
const EnhancedMoodCard = ({
  mood = null,  // Type unclear: null | object | array?
  // ...
}) => {
  const latestMood = Array.isArray(mood) && mood.length > 0 ? mood[0] : mood;
```

DashboardContent passes an array (`mood={today.moodLogs}`), but the defensive code suggests the component doesn't have a clear contract.

**Impact:** Future developers might pass wrong type, causing subtle bugs.

**Fix Required:**
Clarify prop type and add PropTypes or TypeScript:
```javascript
const EnhancedMoodCard = ({
  moodLogs = [],  // Clear: always expect array
  trendData = [],
  // ...
}) => {
  const latestMood = moodLogs[0] || null;
```

---

### 🟠 BUG #8: MiniSparkline Missing Intensity Validation
**Severity:** Medium | **Type:** Potential Crash | **File:** `mobile/components/dashboard/EnhancedMoodCard.jsx:256-264`

**Problem:**
Assumes `point.intensity` exists without fallback, producing `NaN` coordinates if missing:

```javascript
return data
  .map((point, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((point.intensity - minIntensity) / (maxIntensity - minIntensity)) * height;
    // ❌ If point.intensity is undefined → NaN
    return `${x},${y}`;
  })
  .join(' ');
```

**Impact:** Broken sparkline rendering if any trend data point lacks `intensity`.

**Fix Required:**
```javascript
.map((point, i) => {
  const intensity = point.intensity ?? 5; // Fallback to neutral
  const x = (i / Math.max(data.length - 1, 1)) * width;
  const y = height - ((intensity - minIntensity) / (maxIntensity - minIntensity)) * height;
  return `${x},${y}`;
})
```

---

### 🟠 BUG #9: TrendData Type Not Validated
**Severity:** Low | **Type:** Defensive Coding | **File:** `mobile/components/dashboard/EnhancedMoodCard.jsx:170`

**Problem:**
Checks `trendData.length` without verifying it's an array first:

```javascript
{trendData && trendData.length > 0 && (
  <View style={styles.trendSection}>
```

**Impact:** If `trendData` is an object instead of array, will crash.

**Fix Required:**
```javascript
{Array.isArray(trendData) && trendData.length > 0 && (
```

---

### 🟠 BUG #10: Calendar Hydration Percent Null vs 0 Confusion
**Severity:** High | **Type:** Logic Flaw | **File:** `mobile/components/MealMoodCalendar.jsx:43`

**Problem:**
Treats `hydrationPercent: 0` (zero logged) as falsy, incorrectly showing "Partial" status:

```javascript
if (!day.moodAvg || !day.hydrationPercent) {
  return `${SEMANTIC.warning.base}20`; // ❌ 0 is falsy
}
```

**Impact:** Days with 0% hydration (legitimately logged) show as "Partial data" instead of "Off track".

**Fix Required:**
```javascript
if (day.moodAvg == null || day.hydrationPercent == null) {
  return `${SEMANTIC.warning.base}20`;
}
```

---

### 🟠 BUG #11: Calendar Story Generation Performance Issue
**Severity:** Medium | **Type:** Performance | **File:** `mobile/components/MealMoodCalendar.jsx:241`

**Problem:**
`generateStoryLine()` called on every render inside the modal:

```javascript
<Text style={styles.storyText}>
  {selectedDay.storyLine || generateStoryLine(selectedDay)}
</Text>
```

**Impact:** Unnecessary recalculations every time modal re-renders.

**Fix Required:**
Pre-calculate story in `calendarData` or use `useMemo`:
```javascript
const storyText = useMemo(() => {
  return selectedDay?.storyLine || generateStoryLine(selectedDay);
}, [selectedDay]);

// Then use:
<Text style={styles.storyText}>{storyText}</Text>
```

---

### 🟠 BUG #12: Missing Null Check for selectedDay.key
**Severity:** Medium | **Type:** Potential Crash | **File:** `mobile/components/MealMoodCalendar.jsx:223`

**Problem:**
If `selectedDay.key` is undefined, `new Date(undefined)` creates Invalid Date:

```javascript
<Text style={styles.sheetDate}>
  {new Date(selectedDay.key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
</Text>
```

**Impact:** Shows "Invalid Date" text in modal.

**Fix Required:**
```javascript
{selectedDay?.key ? new Date(selectedDay.key).toLocaleDateString(...) : 'Unknown Date'}
```

---

### 🟠 BUG #13: Dashboard Mood Average is Actually Latest Intensity
**Severity:** High | **Type:** Misleading Data | **File:** `mobile/components/DashboardContent.jsx:261, 278`

**Problem:**
Variable named `moodAvg` but actually holds latest mood's intensity, not an average:

```javascript
const currentMood = data.today.moodLogs?.[0]?.intensity; // Latest, not average

// Later:
moodAvg: currentMood, // ❌ Misleading name
```

**Impact:** Analytics and calendar show misleading "average" mood that's actually just the most recent entry.

**Fix Required:**
Either:
1. Calculate actual average:
```javascript
const moodAvg = data.today.moodLogs?.length > 0
  ? data.today.moodLogs.reduce((sum, log) => sum + (log.intensity || 5), 0) / data.today.moodLogs.length
  : null;
```
OR
2. Rename to `latestMood` for clarity.

---

### 🟠 BUG #14: Trend Data Overwrites Instead of Averaging
**Severity:** Medium | **Type:** Data Accuracy | **File:** `mobile/components/DashboardContent.jsx:288-304`

**Problem:**
If multiple mood logs exist for the same day, only the last one is kept:

```javascript
if (trendData?.data) {
  trendData.data.forEach(log => {
    const key = date.toISOString().split('T')[0];

    if (!calData[key]) {
      calData[key] = {...};
    }

    calData[key].moodAvg = log.intensity || 5; // ❌ Overwrites previous
  });
}
```

**Impact:** Days with multiple mood logs only show the last logged mood, not the average.

**Fix Required:**
```javascript
// Collect all moods per day first
const moodsByDay = {};
trendData.data.forEach(log => {
  const key = new Date(log.loggedDate).toISOString().split('T')[0];
  if (!moodsByDay[key]) moodsByDay[key] = [];
  moodsByDay[key].push(log.intensity || 5);
});

// Then calculate averages
Object.entries(moodsByDay).forEach(([key, moods]) => {
  const avg = moods.reduce((sum, m) => sum + m, 0) / moods.length;
  if (!calData[key]) calData[key] = {...};
  calData[key].moodAvg = avg;
});
```

---

## MEDIUM PRIORITY BUGS

### 🟡 BUG #15: Missing Authentication in Streak Reward API Call
**Severity:** High | **Type:** Security | **File:** `mobile/components/DashboardContent.jsx:184-192`

**Problem:**
API call to check streak rewards has a TODO comment for auth, but it's not implemented:

```javascript
const response = await fetch('https://myfoodtracker.onrender.com/api/gamification/check-streak', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Note: Add auth token from your auth context/provider when available ❌
  },
  credentials: 'include',
  body: JSON.stringify({ currentStreak })
});
```

**Impact:** API call will fail with 401 Unauthorized.

**Fix Required:**
```javascript
const { getToken } = useAuth();

const checkStreakReward = async (currentStreak) => {
  const token = await getToken();
  const response = await fetch('https://myfoodtracker.onrender.com/api/gamification/check-streak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ currentStreak })
  });
  // ...
};
```

---

### 🟡 BUG #16: Missing useEffect Dependencies
**Severity:** Low | **Type:** React Warning | **File:** `mobile/components/DashboardContent.jsx:209-216`

**Problem:**
`checkStreakReward` called in `useEffect` but not listed in dependency array:

```javascript
useEffect(() => {
  if (data?.gamification?.streak && prevStreakRef.current !== undefined) {
    if (data.gamification.streak > prevStreakRef.current) {
      checkStreakReward(data.gamification.streak); // ❌ Missing from deps
    }
  }
  prevStreakRef.current = data?.gamification?.streak;
}, [data?.gamification?.streak]); // Should include checkStreakReward
```

**Impact:** React ESLint warning, potential stale closure bugs.

**Fix Required:**
```javascript
const checkStreakReward = useCallback(async (currentStreak) => {
  // ... implementation
}, [notify, refetch]);

useEffect(() => {
  // ... same logic
}, [data?.gamification?.streak, checkStreakReward]);
```

---

### 🟡 BUG #17: Insights Use Recalculated Calories Instead of Existing Value
**Severity:** Low | **Type:** Inconsistency | **File:** `mobile/components/DashboardContent.jsx:359-371`

**Problem:**
Recalculates total calories from food logs instead of using `data.today.nutrition.totalCalories`:

```javascript
const totalCals = uniqueFoodLogs.reduce((sum, l) => sum + (l.calories || 0), 0);

return generateInsights({
  currentCalories: totalCals, // ❌ Recalculated
  // vs data.today.nutrition.totalCalories (already exists)
```

**Impact:** Potential inconsistency if backend calculates calories differently.

**Fix Required:**
```javascript
return generateInsights({
  currentCalories: data.today.nutrition.totalCalories,
  // ...
});
```

---

### 🟡 BUG #18: Calendar Grid Empty Slot Keys Not Unique
**Severity:** Low | **Type:** React Warning | **File:** `mobile/components/MealMoodCalendar.jsx:69-72`

**Problem:**
Empty slots use `empty-${i}` as keys, but if grid regenerates with different month, same keys might be reused incorrectly:

```javascript
for (let i = 0; i < firstDayIndex; i++) {
  grid.push({ empty: true, key: `empty-${i}` }); // ❌ Could collide
}
```

**Impact:** React might reuse wrong components if calendar switches months.

**Fix Required:**
```javascript
const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
for (let i = 0; i < firstDayIndex; i++) {
  grid.push({ empty: true, key: `${monthKey}-empty-${i}` });
}
```

---

### 🟡 BUG #19: getDayStatusColor Red Logic Edge Case
**Severity:** Low | **Type:** Logic Clarity | **File:** `mobile/components/MealMoodCalendar.jsx:38-39`

**Problem:**
Condition checks `goalReached === false && calories > 0`, but this could be confusing:

```javascript
if ((day.goalReached === false && day.calories > 0) || (day.moodAvg && day.moodAvg < 3)) {
  return `${SEMANTIC.danger.base}20`;
}
```

**Analysis:**
- `goalReached === false` explicitly checks for boolean false (good)
- `calories > 0` prevents showing red for unlogged days (good)
- BUT: if `goalReached` is undefined, the first part is skipped

**Impact:** Minor - works correctly but could be clearer.

**Recommended Improvement:**
```javascript
const hasCaloricData = day.calories > 0;
const missedGoal = day.goalReached === false && hasCaloricData;
const lowMood = day.moodAvg != null && day.moodAvg < 3;

if (missedGoal || lowMood) {
  return `${SEMANTIC.danger.base}20`;
}
```

---

### 🟡 BUG #20: CalendarData Doesn't Pre-Calculate Story Lines
**Severity:** Low | **Type:** Performance | **File:** `mobile/components/DashboardContent.jsx:283`

**Problem:**
Story lines are set to `null` in `calendarData`, then calculated on-demand in MealMoodCalendar:

```javascript
calData[todayKey] = {
  // ...
  storyLine: null, // Will be generated in MealMoodCalendar
};
```

**Impact:** Related to Bug #11 - causes repeated calculations.

**Fix Required:**
Pre-calculate story lines in DashboardContent:
```javascript
calData[todayKey] = {
  // ... other fields
  storyLine: generateStoryLine({
    calories: totalCals,
    calorieGoal: goal,
    meals: uniqueFoodLogs.length,
    goalReached: totalCals >= (goal * 0.9) && totalCals <= (goal * 1.1),
    moodAvg: currentMood,
    hydrationPercent,
    protein: data.today.nutrition.totalProtein,
    proteinGoal: data.goals?.proteinG || 150,
  }),
};
```

---

## Bug Summary by Severity

### Critical Priority (6 bugs):
- BUG #1: Energy Level slider wrong label
- BUG #2: Missing tag categories
- BUG #3: No authentication check
- BUG #4: Weak clientEventId
- BUG #5: Form reset timing
- BUG #6: Incorrect mood fallback

### High Priority (8 bugs):
- BUG #7: Prop type inconsistency
- BUG #8: Missing intensity validation
- BUG #9: TrendData type not validated
- BUG #10: Hydration null vs 0 confusion
- BUG #11: Story generation performance
- BUG #12: Missing null check
- BUG #13: Mood average misleading
- BUG #14: Trend data overwrites

### Medium Priority (6 bugs):
- BUG #15: Missing API authentication
- BUG #16: useEffect dependencies
- BUG #17: Calories inconsistency
- BUG #18: Calendar key uniqueness
- BUG #19: getDayStatusColor clarity
- BUG #20: Story line pre-calculation

---

## Recommended Fix Priority Order

### Phase 1: Critical Fixes (Must fix immediately)
1. **BUG #3**: Add authentication check (Security risk)
2. **BUG #2**: Add missing tag categories (Data integrity)
3. **BUG #6**: Fix incorrect mood fallback (Data accuracy)
4. **BUG #10**: Fix hydration null vs 0 (Logic flaw)
5. **BUG #13**: Fix mood average calculation (Misleading data)

### Phase 2: High Priority (Fix within 1-2 days)
6. **BUG #1**: Fix Energy Level slider label (UX confusion)
7. **BUG #4**: Strengthen clientEventId (Prevent duplicates)
8. **BUG #5**: Fix form reset timing (State management)
9. **BUG #14**: Fix trend data averaging (Data accuracy)
10. **BUG #15**: Add API authentication (Security)

### Phase 3: Medium Priority (Fix within 1 week)
11. **BUG #8**: Add intensity validation (Crash prevention)
12. **BUG #11**: Optimize story generation (Performance)
13. **BUG #7**: Clarify prop types (Code quality)
14. **BUG #9, #12, #16-20**: Defensive coding improvements

---

## Testing Checklist

After fixes, verify:

- [ ] Log mood with all 8 mood types
- [ ] Test all 5 tag categories (sleep, exercise, social, weather, stress)
- [ ] Verify Energy Level slider shows correct label
- [ ] Rapid-tap Save button (test idempotency)
- [ ] Log mood while signed out (should show auth error)
- [ ] View calendar with days that have 0% hydration
- [ ] Check modal with multiple moods logged same day
- [ ] Verify dashboard shows correct mood average, not just latest
- [ ] Test story generation performance (open/close calendar modal repeatedly)
- [ ] Verify no React warnings in console

---

## Files Requiring Changes

1. `mobile/components/MoodLogger.jsx` (Bugs #1, #2, #5)
2. `mobile/hooks/useMoodLog.js` (Bugs #3, #4, #6)
3. `mobile/components/dashboard/EnhancedMoodCard.jsx` (Bugs #7, #8, #9)
4. `mobile/components/MealMoodCalendar.jsx` (Bugs #10, #11, #12, #18, #19)
5. `mobile/components/DashboardContent.jsx` (Bugs #13, #14, #15, #16, #17, #20)

---

**End of Report**
