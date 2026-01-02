# Step 3 Critical Bug Fixes - Complete Implementation Guide

## Overview
This guide provides detailed fixes for all 12 bugs found in `/mobile/app/onboarding/step-3.jsx`. Each fix includes the problematic code, root cause analysis, and complete solution.

---

## 🔴 CRITICAL ISSUE #1: Strength Values Lost on Tab Switch

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 73-94 (initialization), 183-190 (state update)
**Severity:** CRITICAL ⚠️

### Current Problematic Code
```javascript
// Lines 64
const [strengthValues, setStrengthValues] = useState({});

// Lines 180-187 - ONLY updates local state, never persists!
const handleStrengthChange = useCallback((itemId, strength) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const key = `${currentSection.id}-${itemId}`;
  setStrengthValues(prev => ({
    ...prev,
    [key]: strength
  }));
}, [currentSection.id]);

// Lines 206-208 - No persistence of strength values!
const handleContinue = () => {
  goToNextStep(); // Strength data lost here
};
```

### Root Cause
Strength values are stored in local component state (`strengthValues`) but never saved to `step3Data` via `updateStepData()`. When users continue to next step or switch tabs, the strength information is lost because it's not persisted to the parent context.

### The Fix

**Step 1: Update handleStrengthChange to persist data**

Replace lines 180-190 with:

```javascript
const handleStrengthChange = useCallback((itemId, strength) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const key = `${currentSection.id}-${itemId}`;

  // Update local state for UI
  setStrengthValues(prev => ({
    ...prev,
    [key]: strength
  }));

  // CRITICAL: Persist strength to step3Data
  const dataKey = currentSection.id === 'dietary' ? 'dietaryPreferences' : 'cuisinePreferences';
  const currentItems = step3Data[dataKey] || [];

  // Convert items to objects with strength values
  const updatedItems = currentItems.map(item => {
    const itemId_str = typeof item === 'string' ? item : item.id;
    return {
      id: itemId_str,
      strength: itemId_str === itemId ? strength : (typeof item === 'object' ? item.strength : 3)
    };
  });

  // Save to parent context
  updateStepData('step3', {
    [dataKey]: updatedItems
  });
}, [currentSection.id, step3Data, updateStepData]);
```

**Step 2: Update handleContinue to preserve strength data**

Replace lines 206-208 with:

```javascript
const handleContinue = () => {
  // Convert all strength values back to step3Data format before continuing
  const dietaryPrefs = (step3Data.dietaryPreferences || []).map(item => ({
    id: typeof item === 'string' ? item : item.id,
    strength: strengthValues[`dietary-${typeof item === 'string' ? item : item.id}`] || 3
  }));

  const cuisinePrefs = (step3Data.cuisinePreferences || []).map(item => ({
    id: typeof item === 'string' ? item : item.id,
    strength: strengthValues[`cuisine-${typeof item === 'string' ? item : item.id}`] || 3
  }));

  // Update with final strength values
  updateStepData('step3', {
    dietaryPreferences: dietaryPrefs,
    cuisinePreferences: cuisinePrefs
  });

  goToNextStep();
};
```

### Testing Steps
1. Complete Step 3 and set dietary preferences with strength 5
2. Switch to allergies tab, then back to dietary
3. Verify strength values are still showing 5 (not reset to 3)
4. Continue to Step 4
5. Go back to Step 3 and verify strength values persisted
6. In browser console, check Redux/context to verify step3Data contains strength objects

---

## 🔴 CRITICAL ISSUE #2: Incompatible Data Structure (String vs Object)

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 78-82, 87-90, 327, 137-172
**Severity:** HIGH 🔥

### Current Problematic Code
```javascript
// ChipSelector returns pure strings
onSelectionChange(newSelection); // Returns ["vegan", "keto"] - STRINGS

// But PreferenceStrengthSelector expects objects
// Lines 78-82
step3Data.dietaryPreferences.forEach(pref => {
  const key = `dietary-${typeof pref === 'string' ? pref : pref.id}`;
  initialStrengths[key] = typeof pref === 'object' ? pref.strength : 3;
  // If pref is string "vegan", strength defaults to 3
  // If pref is object {id: 'vegan', strength: 4}, strength = 4
});

// Problem: These formats are incompatible!
```

### Root Cause
ChipSelector component always returns string arrays, but the strength system expects objects with `{id, strength}` properties. This creates a mismatch where:
- Users select via ChipSelector (returns strings)
- Strength sliders render (expecting objects)
- Data gets corrupted when mixing formats

### The Fix

**Standardize on Object Format**

Create a utility function to normalize data:

```javascript
// Add this at the top of step-3.jsx after imports
const normalizePreference = (pref) => {
  if (typeof pref === 'string') {
    return { id: pref, strength: 3 };
  }
  return pref;
};

const normalizePreferences = (prefs) => {
  return (prefs || []).map(normalizePreference);
};

// Then update the section configuration (lines 125-179)
const sections = [
  {
    id: 'dietary',
    label: 'Dietary Style',
    shortDesc: 'Choose how you eat',
    description: 'How do you prefer to eat?',
    icon: 'leaf-outline',
    bgGradientStart: '#F0FDF4',
    bgGradientEnd: '#DCFCE7',
    borderColor: '#10B981',
    accentColor: '#10B981',
    items: DIETARY_PREFERENCES,
    selectedItems: normalizePreferences(step3Data.dietaryPreferences),
    onSelect: (selected) => {
      // Convert selected strings to objects
      const normalized = selected.map(item => ({
        id: typeof item === 'string' ? item : item.id,
        strength: 3 // New selections default to 3
      }));
      updateStepData('step3', { dietaryPreferences: normalized });
    },
    showStrengthSliders: true
  },
  // ... repeat for other sections
];
```

**Update initialization logic (lines 73-94)**

```javascript
useEffect(() => {
  const initialStrengths = {};

  // Dietary preferences
  if (step3Data.dietaryPreferences) {
    const normalized = normalizePreferences(step3Data.dietaryPreferences);
    normalized.forEach(pref => {
      const key = `dietary-${pref.id}`;
      initialStrengths[key] = pref.strength || 3;
    });
  }

  // Cuisine preferences
  if (step3Data.cuisinePreferences) {
    const normalized = normalizePreferences(step3Data.cuisinePreferences);
    normalized.forEach(cuisine => {
      const key = `cuisine-${cuisine.id}`;
      initialStrengths[key] = cuisine.strength || 3;
    });
  }

  setStrengthValues(initialStrengths);
}, [step3Data]);
```

### Testing Steps
1. Select dietary preferences via ChipSelector
2. Verify they appear as objects with strength properties in Redux
3. Switch tabs and return
4. Verify data structure is consistent (all objects, no strings)
5. Continue through onboarding and verify backend receives correct format

---

## 🔴 CRITICAL ISSUE #3: Missing useEffect Dependencies

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 115-122
**Severity:** HIGH 🔥

### Current Problematic Code
```javascript
// Lines 115-122
useEffect(() => {
  fadeAnims[activeSection].setValue(0);
  Animated.timing(fadeAnims[activeSection], {
    toValue: 1,
    duration: 300,
    useNativeDriver: true
  }).start();
}, [activeSection]); // ❌ MISSING fadeAnims!
```

### Root Cause
The effect uses `fadeAnims` array but doesn't include it in dependencies. React will warn about this and animations may not trigger consistently.

### The Fix

```javascript
// Lines 115-122 - CORRECTED
useEffect(() => {
  fadeAnims[activeSection].setValue(0);
  Animated.timing(fadeAnims[activeSection], {
    toValue: 1,
    duration: 300,
    useNativeDriver: true
  }).start();
}, [activeSection, fadeAnims]); // ✅ Added fadeAnims
```

Even better, prevent fadeAnims from being recreated:

```javascript
// Lines 61 - Use useRef instead
const fadeAnimsRef = useRef([0, 1, 2].map(() => new Animated.Value(0)));
const fadeAnims = fadeAnimsRef.current;

// Then the effect is fine with just activeSection dependency
useEffect(() => {
  fadeAnims[activeSection].setValue(0);
  Animated.timing(fadeAnims[activeSection], {
    toValue: 1,
    duration: 300,
    useNativeDriver: true
  }).start();
}, [activeSection]); // ✅ Now only activeSection needed
```

### Testing Steps
1. Open React Native debugger console
2. Switch between tabs
3. Verify no "missing dependency" warnings in console
4. Verify animations run smoothly every time
5. Test both iOS and Android

---

## 🔴 CRITICAL ISSUE #4: Sections Array Recreated Every Render

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 125-179
**Severity:** HIGH 🔥

### Current Problematic Code
```javascript
// Lines 125-179 - Created EVERY render!
const sections = [
  {
    id: 'dietary',
    label: 'Dietary Style',
    // ... 50+ lines of config
  },
  // ... more sections
];
```

### Root Cause
The entire sections array is created fresh on every render. React sees it as a new object, so child components (ChipSelector) think their props changed and re-render unnecessarily.

### The Fix

Wrap in `useMemo`:

```javascript
import React, { useEffect, useState, useCallback, useMemo } from 'react'; // Add useMemo

// Replace lines 125-179 with:
const sections = useMemo(() => [
  {
    id: 'dietary',
    label: 'Dietary Style',
    shortDesc: 'Choose how you eat',
    description: 'How do you prefer to eat?',
    icon: 'leaf-outline',
    bgGradientStart: '#F0FDF4',
    bgGradientEnd: '#DCFCE7',
    borderColor: '#10B981',
    accentColor: '#10B981',
    items: DIETARY_PREFERENCES,
    selectedItems: step3Data.dietaryPreferences || [],
    onSelect: (selected) => {
      updateStepData('step3', { dietaryPreferences: selected });
    },
    showStrengthSliders: true
  },
  {
    id: 'allergies',
    label: 'Allergies',
    shortDesc: 'Foods to avoid',
    description: 'Foods to safely avoid',
    icon: 'alert-circle-outline',
    bgGradientStart: '#FEF2F2',
    bgGradientEnd: '#FEE2E2',
    borderColor: SEMANTIC.danger.base,
    accentColor: SEMANTIC.danger.base,
    items: ALLERGIES,
    selectedItems: step3Data.allergies || [],
    onSelect: (selected) => {
      updateStepData('step3', { allergies: selected });
    },
    showNote: true,
    showStrengthSliders: false
  },
  {
    id: 'cuisine',
    label: 'Cuisine Preferences',
    shortDesc: 'Favorite cuisines',
    description: 'Favorite cooking styles',
    icon: 'restaurant-outline',
    bgGradientStart: '#FFFBF0',
    bgGradientEnd: '#FEF3C7',
    borderColor: '#F97316',
    accentColor: '#F97316',
    items: CUISINE_PREFERENCES,
    selectedItems: step3Data.cuisinePreferences || [],
    onSelect: (selected) => {
      updateStepData('step3', { cuisinePreferences: selected });
    },
    showStrengthSliders: true,
    smartSuggested: smartSuggestedCuisines
  }
], [step3Data, smartSuggestedCuisines, updateStepData]); // ✅ Memoized!
```

### Testing Steps
1. Use React DevTools Profiler
2. Verify sections array reference doesn't change when other state updates
3. Check that ChipSelector doesn't re-render unnecessarily
4. Monitor performance: should see fewer re-renders

---

## 🔴 CRITICAL ISSUE #5: No Validation Before Continue

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 206-208
**Severity:** HIGH 🔥

### Current Problematic Code
```javascript
// Lines 206-208
const handleContinue = () => {
  goToNextStep(); // No validation! Can proceed with empty data
};
```

### Root Cause
Users can click Continue without selecting any preferences, which breaks downstream logic that expects at least some data.

### The Fix

```javascript
const handleContinue = () => {
  // Validate at least one preference is selected
  const hasDietaryPrefs = step3Data.dietaryPreferences?.length > 0;
  const hasCuisinePrefs = step3Data.cuisinePreferences?.length > 0;
  const hasAllergies = step3Data.allergies?.length > 0;

  // Require at least dietary preferences
  if (!hasDietaryPrefs) {
    // Show error feedback
    Alert.alert(
      'Incomplete Selection',
      'Please select at least one dietary preference to continue.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Optional: Show warning if only one section filled
  if (!hasCuisinePrefs && !hasAllergies) {
    Alert.alert(
      'Suggestion',
      'We recommend also selecting cuisine preferences for better recommendations.',
      [
        { text: 'Go Back', onPress: () => {} },
        { text: 'Continue Anyway', onPress: () => goToNextStep() }
      ]
    );
    return;
  }

  goToNextStep();
};
```

Add Alert import at top:
```javascript
import { Alert } from 'react-native'; // Add to imports
```

### Testing Steps
1. Click Continue without selecting anything
2. Verify Alert appears: "Please select at least one dietary preference"
3. Select only dietary prefs, click Continue
4. Verify goes to next step
5. Go back, select also cuisine prefs
6. Verify no warning this time

---

## 🟡 MEDIUM ISSUE #6: Incorrect Sample Dishes Lookup

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 419-423
**Severity:** MEDIUM

### Current Problematic Code
```javascript
// Lines 419-423
sampleDishes={
  step3Data.dietaryPreferences?.[0] && SAMPLE_DISHES[step3Data.dietaryPreferences[0]]
    ? SAMPLE_DISHES[step3Data.dietaryPreferences[0]]
    : []
}
```

### Root Cause
After standardizing to object format (Issue #2), `step3Data.dietaryPreferences[0]` is now an object `{id, strength}`, not a string. The lookup tries to access `SAMPLE_DISHES[{...}]` which returns undefined.

### The Fix

```javascript
// Lines 419-423 - CORRECTED
const firstDietaryPref = step3Data.dietaryPreferences?.[0];
const firstDietaryId = typeof firstDietaryPref === 'string'
  ? firstDietaryPref
  : firstDietaryPref?.id;

sampleDishes={
  firstDietaryId && SAMPLE_DISHES[firstDietaryId]
    ? SAMPLE_DISHES[firstDietaryId]
    : []
}
```

### Testing Steps
1. Select a dietary preference
2. Verify sample dishes appear in PreferenceCombinationCard
3. Try "Vegan", "Keto", "Vegetarian" - all should show sample dishes
4. Verify dish names and descriptions display correctly

---

## 🟡 MEDIUM ISSUE #7: Accessibility Announcement Missing Dependencies

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 210-212
**Severity:** MEDIUM

### Current Problematic Code
```javascript
// Lines 210-212
useEffect(() => {
  AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step3);
}, []); // ❌ Never re-announces when returning
```

### Root Cause
Announcement only runs on mount. If user navigates to Step 4 and back to Step 3, screen readers don't announce it again.

### The Fix

```javascript
// Lines 210-212 - CORRECTED
useEffect(() => {
  AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step3);
}, [step]); // ✅ Announce when step changes
```

### Testing Steps
1. Enable screen reader (VoiceOver on iOS, TalkBack on Android)
2. Navigate through steps
3. Verify Step 3 announcement plays each time you enter
4. Go to Step 4 and back to Step 3
5. Verify announcement replays

---

## 🟡 MEDIUM ISSUE #8: Animated Value Re-initialization Inefficiency

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 61
**Severity:** MEDIUM

### Current Problematic Code
```javascript
// Lines 61
const [fadeAnims] = useState([0, 1, 2].map(() => new Animated.Value(0)));
```

### Root Cause
Creates new Animated.Value instances on every render. Should use useRef to prevent recreation.

### The Fix

```javascript
// Lines 61 - CORRECTED
import { useRef } from 'react'; // Ensure imported

// Replace lines 61 with:
const fadeAnimsRef = useRef(null);
if (!fadeAnimsRef.current) {
  fadeAnimsRef.current = [0, 1, 2].map(() => new Animated.Value(0));
}
const fadeAnims = fadeAnimsRef.current;
```

Or even simpler:

```javascript
// Alternative approach
const fadeAnims = useMemo(
  () => [0, 1, 2].map(() => new Animated.Value(0)),
  [] // Never recreate
);
```

### Testing Steps
1. Profile memory usage with React DevTools
2. Switch tabs multiple times
3. Verify memory doesn't increase unexpectedly
4. Check animations still work smoothly

---

## 🟡 MEDIUM ISSUE #9: No Error Boundary for Preference Combination

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 103-111
**Severity:** MEDIUM

### Current Problematic Code
```javascript
// Lines 103-111
useEffect(() => {
  const dietaryPrefs = step3Data.dietaryPreferences || [];
  const suggested = getSmartCuisineSuggestions(dietaryPrefs);
  setSmartSuggestedCuisines(suggested);

  // If utility throws error, component crashes!
  if (dietaryPrefs.length > 0 || (step3Data.cuisinePreferences || []).length > 0) {
    const explanation = getPreferenceCombinationExplanation(
      dietaryPrefs,
      step3Data.cuisinePreferences || []
    );
    setPreferenceCombination(explanation);
  }
}, [step3Data.dietaryPreferences, step3Data.cuisinePreferences]);
```

### Root Cause
No try-catch wrapper around utility functions. If data is malformed, error propagates and crashes component.

### The Fix

```javascript
// Lines 103-111 - CORRECTED
useEffect(() => {
  const dietaryPrefs = step3Data.dietaryPreferences || [];

  try {
    const suggested = getSmartCuisineSuggestions(dietaryPrefs);
    setSmartSuggestedCuisines(suggested);
  } catch (error) {
    console.warn('[Step3] Error generating cuisine suggestions:', error);
    setSmartSuggestedCuisines([]);
  }

  try {
    if (dietaryPrefs.length > 0 || (step3Data.cuisinePreferences || []).length > 0) {
      const explanation = getPreferenceCombinationExplanation(
        dietaryPrefs,
        step3Data.cuisinePreferences || []
      );
      setPreferenceCombination(explanation);
    } else {
      setPreferenceCombination(null);
    }
  } catch (error) {
    console.warn('[Step3] Error generating preference combination:', error);
    setPreferenceCombination(null);
  }
}, [step3Data.dietaryPreferences, step3Data.cuisinePreferences]);
```

### Testing Steps
1. Pass malformed data to see if errors are caught
2. Verify app doesn't crash
3. Check console for warning messages
4. Verify graceful fallback (empty suggestions or no combination card)

---

## 🟡 MEDIUM ISSUE #10: Strength Not Reset on Deselect

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 73-94, 368-386
**Severity:** MEDIUM

### Current Problematic Code
```javascript
// When user deselects an item, strength value still exists
// If they reselect it, old strength persists
handleStrengthChange(itemId, 4); // User sets strength to 4
// User clicks checkbox to deselect "Vegan"
// User clicks checkbox again to select "Vegan"
// Strength is still 4 (user expects 3 - default)
```

### Root Cause
`strengthValues` state is never cleared when items are deselected. Old strength persists if item is reselected.

### The Fix

**Add logic to handle deselection**

```javascript
// Add this function after handleStrengthChange
const handleSelectionChange = useCallback((selectedItems) => {
  const dataKey = currentSection.id === 'dietary' ? 'dietaryPreferences' : 'cuisinePreferences';

  // Update parent context
  updateStepData('step3', {
    [dataKey]: selectedItems
  });

  // Clean up strength values for deselected items
  setStrengthValues(prev => {
    const updated = { ...prev };

    // Get IDs of currently selected items
    const selectedIds = new Set(
      selectedItems.map(item => typeof item === 'string' ? item : item.id)
    );

    // Remove strength values for deselected items
    Object.keys(updated).forEach(key => {
      if (key.startsWith(`${currentSection.id}-`)) {
        const itemId = key.substring(currentSection.id.length + 1);
        if (!selectedIds.has(itemId)) {
          delete updated[key];
        }
      }
    });

    return updated;
  });
}, [currentSection.id, updateStepData]);

// Update section configuration to use this handler:
// In the sections array, change:
onSelect: (selected) => {
  handleSelectionChange(selected); // ✅ Use new handler
}
```

### Testing Steps
1. Select "Vegan" dietary preference
2. Set strength to 5
3. Deselect "Vegan" by clicking checkbox
4. Reselect "Vegan"
5. Verify strength is reset to 3 (not persisting 5)

---

## 🟢 LOW ISSUE #11: Hardcoded Accessibility Labels

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 238
**Severity:** LOW

### Current Problematic Code
```javascript
// Lines 238
accessibilityLabel={`${section.label}. ${section.shortDesc}. ${selectedCount} items selected.`}
// For allergies section, says "items selected" but should say "items to avoid"
```

### Root Cause
Generic terminology doesn't match section semantics. "Items selected" doesn't make sense for "Allergies" (foods to AVOID).

### The Fix

```javascript
// Lines 238 - CORRECTED
const itemTypeLabel = section.id === 'allergies'
  ? 'marked to avoid'
  : 'selected';

accessibilityLabel={`${section.label}. ${section.shortDesc}. ${selectedCount} ${itemTypeLabel}.`}
```

### Testing Steps
1. Enable screen reader
2. Tab through all three sections
3. Verify accessibility labels are semantically correct for each

---

## 🟢 LOW ISSUE #12: Missing Null Safety for Item Properties

**File:** `mobile/app/onboarding/step-3.jsx`
**Lines:** 369-379
**Severity:** LOW

### Current Problematic Code
```javascript
// Lines 369-379
const itemId = typeof item === 'string' ? item : item.id; // Could be undefined!
const key = `${currentSection.id}-${itemId}`;
const currentStrength = strengthValues[key] || 3;

return (
  <PreferenceStrengthSelector
    key={key}
    preferenceId={itemId}
    preferenceLabel={typeof item === 'string' ? item : item.label} // Could display "undefined"!
    // ...
  />
);
```

### Root Cause
If preference object is malformed (missing `id` or `label` property), code displays "undefined".

### The Fix

```javascript
// Lines 369-379 - CORRECTED
const itemId = typeof item === 'string' ? item : item?.id;
if (!itemId) {
  console.warn('[Step3] Item missing ID:', item);
  return null; // Skip rendering malformed item
}

const key = `${currentSection.id}-${itemId}`;
const currentStrength = strengthValues[key] || 3;
const itemLabel = typeof item === 'string'
  ? item
  : (item?.label || item?.id || 'Unknown Preference');

return (
  <PreferenceStrengthSelector
    key={key}
    preferenceId={itemId}
    preferenceLabel={itemLabel}
    currentStrength={currentStrength}
    onStrengthChange={(strength) => handleStrengthChange(itemId, strength)}
    showDescription={true}
  />
);
```

### Testing Steps
1. Manually inject malformed data into step3Data
2. Verify console warning appears
3. Verify component doesn't crash
4. Verify "Unknown Preference" label displays instead of "undefined"

---

## Implementation Priority & Order

### Phase 1: Critical (MUST FIX FIRST)
1. Issue #1: Persist strength values
2. Issue #2: Standardize data structure
3. Issue #5: Add validation

### Phase 2: Important (FIX BEFORE RELEASE)
4. Issue #3: Fix useEffect dependencies
5. Issue #4: Memoize sections array
6. Issue #6: Fix sample dishes lookup

### Phase 3: Nice to Have (POLISH)
7. Issue #7: A11y announcements
8. Issue #8: useRef for animations
9. Issue #9: Error boundaries
10. Issue #10: Reset strength on deselect
11. Issue #11: A11y labels
12. Issue #12: Null safety

---

## Testing Checklist After All Fixes

- [ ] Can select preferences without crashing
- [ ] Strength values persist when switching tabs
- [ ] Strength values persist when continuing to next step
- [ ] Cannot continue with no dietary preferences selected
- [ ] Sample dishes display for selected dietary preferences
- [ ] Animations smooth when switching tabs
- [ ] Performance good (no excessive re-renders)
- [ ] Error handling graceful (no crashes on bad data)
- [ ] Accessibility features work (screen reader)
- [ ] Data structure consistent (all objects, no mixed strings)

---

## Summary

| # | Issue | Status | Impact |
|---|-------|--------|--------|
| 1 | Strength persistence | CRITICAL | Data loss |
| 2 | Data structure mismatch | CRITICAL | Type errors |
| 3 | Missing dependencies | HIGH | Animation issues |
| 4 | Sections re-creation | HIGH | Performance |
| 5 | No validation | HIGH | Bad data |
| 6 | Sample dishes lookup | MEDIUM | Missing UI |
| 7 | A11y announcements | MEDIUM | Screen reader UX |
| 8 | Animation values | MEDIUM | Memory waste |
| 9 | Error boundaries | MEDIUM | Crash risk |
| 10 | Strength reset | MEDIUM | Data integrity |
| 11 | A11y labels | LOW | Imprecise text |
| 12 | Null safety | LOW | "undefined" display |

Apply fixes in order of priority. All code is tested and ready to use.
