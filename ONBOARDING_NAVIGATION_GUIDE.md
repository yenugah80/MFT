# Onboarding Navigation & Button Functionality Guide

## Overview

All buttons are **fully functional** with complete back navigation. Users can move forward and backward through all screens, customize their answers at any time, and data persists throughout the flow.

---

## Navigation Flow

### Step 1: Welcome & Primary Goal Selection
```
Screen 1
├── NO back button (first screen)
├── CONTINUE button (enabled after goal selected)
└── → Step 2
```

**Data Persisted**: `primaryGoal`

---

### Step 2: Basic Metrics
```
Screen 2
├── BACK button (✓ functional) → returns to Step 1
│   └── Preserves all entered data in Step 2
├── Form inputs (age, weight, height, gender, activity level)
├── Real-time validation with error messages
└── CONTINUE button (enabled when form valid)
    └── → Step 3

Edit Scenario:
  User can go back from Step 3/4 → Step 2 → Edit all fields → Continue
```

**Data Persisted**: All metrics, unit preferences (kg/lbs, cm/ft)

---

### Step 3: Dietary Preferences (Optional)
```
Screen 3
├── BACK button (✓ functional) → returns to Step 2
│   └── Preserves all selected preferences
├── Multi-select chips (3 optional sections)
├── SKIP button (full screen skip available)
└── CONTINUE button
    └── → Step 4

Edit Scenario:
  User can go back from Step 4 → Step 3 → Change preferences → Continue
```

**Data Persisted**: Preferences, allergies, cuisines (or defaults if skipped)

---

### Step 4: Review & Customize Goals
```
Screen 4
├── BACK button (✓ functional) → returns to Step 3
│   └── Preserves calculated goals
├── Goal Presentation Cards (5 total)
│   ├── Calories
│   ├── Protein
│   ├── Carbs
│   ├── Fats
│   └── Water
├── Each card has "Adjust" button
│   └── Opens bottom sheet with slider (-500 to +500)
└── GET STARTED button
    └── Saves all data to backend
    └── → Personalized Dashboard

Edit Scenario:
  User can:
  1. Adjust values on current screen
  2. Go back to Step 3 to change preferences
  3. Go back to Step 2 to change metrics
  4. Changes propagate to recalculated goals
```

**Data Persisted**: All calculated and adjusted goals

---

## Button Functionality Details

### Back Button (Premium Component)
**File**: `mobile/components/onboarding/BackButton.jsx`

**Features**:
- ✅ Spring animation (scale 0.92 → 1.0)
- ✅ Haptic feedback (Light impact on press)
- ✅ Professional Ionicon (chevron-back)
- ✅ Touch target: 44x44 pt (accessibility standard)
- ✅ Visual feedback on press
- ✅ Disabled state when not available (Step 1)

**Behavior**:
```javascript
handlePress() {
  1. Trigger Light haptic
  2. Animate scale
  3. Call goToPreviousStep()
  4. Preserve all data in AsyncStorage
  5. Navigate to previous screen
}
```

---

### Continue Button (Per Screen)
**Steps 1-3**: Validates input → proceeds
**Step 4**: Saves all data to backend → navigates to dashboard

**States**:
- ✅ **Enabled**: All required fields valid
- ❌ **Disabled**: Missing required fields or validation errors
- 🔄 **Loading**: During API calls (Step 4 only)

---

### Skip Button (Step 3 Only)
```javascript
handleSkip() {
  1. Apply default preferences
  2. Save to AsyncStorage
  3. Proceed to Step 4
}
```

**Defaults Applied**:
- Dietary: ["Balanced"]
- Allergies: []
- Cuisines: ["Mediterranean", "American"]

---

### Adjust Buttons (Step 4 Only)
**Appear On**: Each goal card (Calories, Protein, Carbs, Fats, Water)

**Behavior**:
```javascript
handleAdjust(goalType) {
  1. Open bottom sheet modal
  2. Show slider with current value
  3. Allow +/- adjustment (depends on goal type)
  4. Update display in real-time
  5. Validate macro balance
  6. Update AsyncStorage draft
}
```

**Adjustment Ranges**:
- **Calories**: 500-10,000 kcal (±100 step)
- **Protein**: 0-500g (±5 step)
- **Carbs**: 0-1,000g (±5 step)
- **Fats**: 0-300g (±5 step)
- **Water**: 0-20L (±0.5 step)

---

## Data Flow & Persistence

### AsyncStorage Structure
```javascript
@onboarding_draft: {
  step1: {
    primaryGoal: "lose" | "maintain" | "gain"
  },
  step2: {
    age: "28",
    weight: "75",
    weightUnit: "kg" | "lbs",
    height: "180",
    heightUnit: "cm" | "ft",
    heightFeet: "5",
    heightInches: "10",
    gender: "male" | "female" | "other" | "prefer_not_say",
    activityLevel: "sedentary" | "lightly_active" | "moderate" | "very_active" | "extremely_active"
  },
  step3: {
    dietaryPreferences: ["balanced", ...],
    allergies: ["nuts", ...],
    cuisinePreferences: ["mediterranean", ...]
  },
  step4: {
    dailyCalories: 2050,
    proteinG: 150,
    carbsG: 200,
    fatsG: 67,
    waterLiters: 2.0
  }
}

@onboarding_current_step: "3"
```

### Back Navigation Data Flow
```
Step 4 → Back button
    ↓
Check AsyncStorage @onboarding_draft
    ↓
Load step3 data from draft
    ↓
Display Step 3 with previous data intact
    ↓
User edits preferences
    ↓
Save updated data to AsyncStorage
    ↓
User clicks Continue
    ↓
Recalculate goals based on new preferences
    ↓
Display Step 4 with updated values
```

---

## Resume From Draft (Mid-Session Recovery)

### Scenario: User closes app during onboarding

```
User at Step 3 → Closes app
    ↓
[App closed, AsyncStorage persists draft]
    ↓
User reopens app → Signs in
    ↓
Router detects incomplete onboarding
    ↓
useOnboarding hook loads draft from AsyncStorage
    ↓
Shows Step 3 with all previous data
    ↓
User can:
  - Continue from Step 3
  - Go back to Step 2 and edit
  - Proceed to Step 4
```

### Resume Implementation
**File**: `mobile/hooks/useOnboarding.js`

```javascript
useEffect(() => {
  const loadDraft = async () => {
    const savedDraft = await AsyncStorage.getItem('@onboarding_draft');
    const savedStep = await AsyncStorage.getItem('@onboarding_current_step');

    if (savedDraft) {
      dispatch({
        type: ACTIONS.LOAD_DRAFT,
        payload: {
          draft: JSON.parse(savedDraft),
          step: parseInt(savedStep, 10)
        }
      });
    }
  };

  loadDraft();
}, []);
```

---

## Error Handling & Validation

### Step 1 Validation
```
User must select goal before Continue enabled
❌ No goal selected → Button disabled
✅ Goal selected → Button enabled
```

### Step 2 Validation (Real-time on blur)
```
Age: 15-100
  ❌ < 15 or > 100 → Error message
  ✅ Valid → Accept

Weight: 30-300 kg (or 66-660 lbs)
  ❌ Out of range → Error message
  ✅ Valid → Accept

Height: 100-250 cm (or 3'3" to 8'2")
  ❌ Out of range → Error message
  ✅ Valid → Accept

Activity Level: Required
  ❌ Not selected → Error message
  ✅ Selected → Accept

All fields valid → Continue enabled
```

### Step 3 Validation
```
All optional - no validation required
User can skip entire step
```

### Step 4 Validation (Macro balance)
```
Calories + Macros must balance within 20%
Calculated calories = (protein×4) + (carbs×4) + (fats×9)

Example:
  Target: 2000 kcal
  Protein: 150g (600 cal)
  Carbs: 200g (800 cal)
  Fats: 67g (603 cal)
  Total: 2003 cal ✅ (within 20% tolerance)

If user adjusts and goes > 20% off:
  Show error: "Macros do not balance..."
  User must adjust values
```

---

## Haptic Feedback Implementation

**File**: `mobile/components/onboarding/` (all button components)

```javascript
import * as Haptics from 'expo-haptics';

// On button press in
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// On goal/option selection
Haptics.selectionAsync();

// On back button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// On submit (Get Started button)
Haptics.selectionAsync();
```

**User Experience**:
- Light haptic when pressing buttons
- Selection haptic when making choices
- Smooth tactile feedback on modern devices
- No haptic on older devices (graceful degradation)

---

## Screen Transition Timing

**All animations use spring physics**:
- Duration: 300ms
- Speed: 15
- Bounciness: 8
- Frame rate: 60fps

**Scale animations**:
```
Pressed state: scale 0.92-0.98
Released state: scale 1.0
Timing: 150-300ms
```

---

## Accessibility Features

### Keyboard Navigation
- All interactive elements have `hitSlop={12}` (touch target expansion)
- Focus order: logical, top-to-bottom
- Hardware keyboard support (return key submits forms)

### Screen Reader Support
- All buttons have `accessibilityRole="button"`
- All inputs have `accessibilityLabel` and `accessibilityHint`
- Error messages announced to screen readers
- Screen reader label: "Step 2 of 4: Enter your basic measurements"

### Color Contrast
- All text WCAG AA compliant
- Error text: Red (#EF4444) on light backgrounds
- Success indicators: Green (#10B981)

---

## Common User Flows

### Flow 1: Quick Completion
```
Step 1 → Continue
Step 2 → Continue
Step 3 → Skip
Step 4 → Get Started
Total time: ~50 seconds
```

### Flow 2: Customization
```
Step 1 → Continue
Step 2 → Continue
Step 3 → Select preferences → Continue
Step 4 → Adjust calories and protein → Get Started
Total time: ~75 seconds
```

### Flow 3: Mid-Session Edit
```
Step 1 → Continue
Step 2 → Continue
Step 3 → Continue
Step 4 → [Realizes activity level was wrong]
     → Back to Step 3 → Back to Step 2 → Edit activity level
     → Continue → Continue → Goals recalculated → Get Started
Total time: ~120 seconds (but user is in control)
```

### Flow 4: Resume After Close
```
Step 1 → Step 2 → [App closes at Step 2]
[User reopens app]
Step 2 → [All data preserved] → Continue
Step 3 → Continue
Step 4 → Get Started
```

---

## Testing Checklist

### Button Functionality
- [ ] Step 1: Continue button disabled until goal selected
- [ ] Step 1: Continue button navigates to Step 2
- [ ] Step 2-4: Back button visible and functional
- [ ] Step 2-4: Back button preserves data
- [ ] Step 2: Continue disabled until form valid
- [ ] Step 3: Skip button works correctly
- [ ] Step 3: Skip applies defaults
- [ ] Step 4: Each "Adjust" button opens bottom sheet
- [ ] Step 4: Slider adjusts values correctly
- [ ] Step 4: Get Started saves to backend and navigates

### Navigation
- [ ] Forward navigation works all screens
- [ ] Back navigation works all screens
- [ ] Data persists when navigating back
- [ ] Data persists when going forward again
- [ ] Can reach any screen via back+forward combo

### State Management
- [ ] AsyncStorage updates after each step
- [ ] Draft loads on app restart
- [ ] Can resume from any saved step
- [ ] Calculations recalculate on metric changes

### Validation
- [ ] Step 2 errors show in real-time
- [ ] Continue button disabled on errors
- [ ] Can't proceed with invalid data
- [ ] Error messages are clear and actionable

### Haptics
- [ ] Light haptic on button press
- [ ] Selection haptic on choices
- [ ] No crashes on devices without haptics
- [ ] Consistent haptic feedback

---

## Implementation Status

✅ **Backend Ready**: All API hooks prepared
✅ **Frontend Complete**: All screens implemented
✅ **Navigation**: Full back/forward support
✅ **Data Persistence**: AsyncStorage draft system
✅ **Validation**: Real-time on all inputs
✅ **Haptics**: Integrated throughout
✅ **Accessibility**: Screen reader support

---

## Questions?

- **Navigation issues**: Check `useOnboarding.js` `goToPreviousStep()`
- **Button not working**: Verify `onPress` handler in component
- **Data not persisting**: Check AsyncStorage keys in `useOnboarding.js`
- **Validation not working**: Check validation ranges in `onboardingConfig.js`
- **Haptics not firing**: Check `expo-haptics` import and device support
