# Phase 6: Testing & Quality Assurance Guide

## Overview
Complete testing checklist for MyFoodTracker preference-based redesign covering all 5 phases of implementation.

---

## Test Environment Setup

### Prerequisites
- Expo dev server running: `npm start` in `/mobile`
- iOS Simulator or Android Emulator
- Test user account (or create during onboarding)
- Render backend API responding: https://myfoodtracker.onrender.com/api

### Initial Checks
- [ ] Metro bundler started without BRAND color errors
- [ ] No console errors on app startup
- [ ] API configuration shows Render backend in logs: `[API Config] 🚀 Mode: Render Backend`
- [ ] Clerk authentication loads successfully

---

## Phase 1: Step 3 Redesign - Testing

### Test 1.1: Step 3 UI Navigation
**Objective:** Verify tab-based navigation works correctly

- [ ] Launch app and navigate to Step 3 (Dietary preferences)
- [ ] Verify three tabs visible: "Dietary Style", "Allergies", "Cuisine Preferences"
- [ ] Click each tab and confirm:
  - Tab highlights with accent color
  - Content fades in/out smoothly
  - Icon colors match accent colors
  - Description text updates correctly

### Test 1.2: Dietary Preferences Selection
**Objective:** Test dietary preference selection and strength slider

**Steps:**
1. Click "Dietary Style" tab
2. Select "Vegan" chip
   - [ ] Chip background changes to selected color
   - [ ] Haptic feedback triggers on tap
3. Verify "Preference Strength" section appears below
4. Test strength slider:
   - [ ] 5 buttons visible (1=light, 5=strong)
   - [ ] Heart indicators (❤️) show on selected strength
   - [ ] Buttons have correct colors: gray → yellow → orange → red
   - [ ] Selection persists when switching tabs

**Expected Result:** Vegan selected with strength value saved

### Test 1.3: Allergies Selection (No Strength Slider)
**Objective:** Verify allergies don't show strength slider

**Steps:**
1. Click "Allergies" tab
2. Select "Peanuts", "Tree Nuts", "Milk"
   - [ ] Chips select normally
3. Verify NO strength slider appears (allergies are always strict)
4. Check warning note visible: "Selected items will be excluded from all recommendations"
   - [ ] Text color is red/dark red
   - [ ] Warning icon visible

**Expected Result:** Allergies selected, no strength options shown

### Test 1.4: Smart Cuisine Suggestions
**Objective:** Verify smart suggestions based on dietary prefs

**Steps:**
1. Click "Cuisine Preferences" tab
2. Observe "Smart Suggestions" box:
   - [ ] Does NOT appear initially
3. Go back to "Dietary Style" tab, select "Vegan"
4. Return to "Cuisine Preferences" tab
5. Verify "Smart Suggestions" box now shows:
   - [ ] Purple header with lightbulb icon
   - [ ] Text: "Based on your dietary preferences"
   - [ ] Suggested cuisines as light purple chips:
     - Vegan → Mediterranean, Thai, Indian, Asian, Mexican
     - Keto → Mediterranean, Japanese, Italian
     - Vegetarian → Mediterranean, Indian, Mexican

**Expected Result:** Smart suggestions appear with relevant cuisines

### Test 1.5: Preference Combination Card
**Objective:** Verify combination explanation card displays

**Steps:**
1. Select dietary + cuisine preferences (e.g., Vegan + Mediterranean)
2. Scroll down to view "Preference Combination Card"
   - [ ] Card appears with purple gradient background
   - [ ] Title: "Your Preferences"
   - [ ] Subtitle: "Smart Recommendations"
3. Verify card shows:
   - [ ] Dietary preferences as blue tags
   - [ ] Cuisine preferences as yellow/gold tags
   - [ ] Example foods section with bullet points
   - [ ] Animated entry (fade + slide up)

**Expected Result:** Card displays with smooth animation

### Test 1.6: Visual Design & Animations
**Objective:** Verify premium design elements

- [ ] Gradient backgrounds render correctly for each section
- [ ] Glass morphism cards have subtle shadows
- [ ] Color scheme matches premium theme:
  - Dietary: Green accent (#10B981)
  - Allergies: Red accent (#DC2626)
  - Cuisine: Orange accent (#F97316)
- [ ] Chip selection animations smooth (no janky transitions)
- [ ] Strength slider heart indicators animate on select
- [ ] Tab content fades in (not instant switches)

---

## Phase 2: Backend Safety - Testing

### Test 2.1: Allergen Filtering (CRITICAL)
**Objective:** Verify AI recommends NO foods with user's allergens

**Prerequisites:**
- Complete Step 1-2 onboarding
- Set allergies: "Peanuts"
- Complete onboarding and reach Dashboard

**Steps:**
1. Navigate to Smart Recommendations section on Dashboard
2. Review 5-10 recommended foods
   - [ ] NO peanut-containing foods in recommendations
   - [ ] NO "Peanut Butter", "Pad Thai" (has peanuts), "Peanut Oil", etc.
3. Log a meal with a peanut-based food (if possible in UI)
4. Check if system prevents logging or shows warning

**Critical Result:** Zero peanut recommendations - MUST PASS

### Test 2.2: Allergen Detection on Dashboard
**Objective:** Verify allergen warning appears when relevant

**Steps:**
1. Manually add test data (via backend or UI logging):
   - Log meal: "Peanut Butter Toast" (contains peanuts)
2. Check Dashboard top section
   - [ ] Red "Allergen Warning" card appears
   - [ ] Text: "Peanuts detected in logged meals"
   - [ ] Pulse animation visible
   - [ ] Urgent indicator color (red/orange gradient)

**Expected Result:** Allergen warning displays immediately

### Test 2.3: Dietary Preference Flexibility
**Objective:** Verify non-strict preferences show with warnings

**Prerequisites:**
- Set dietary preference: "Vegetarian" with strength = 3
- No allergies set

**Steps:**
1. Check Smart Recommendations
2. Verify recommendations include:
   - [ ] Many vegetarian options (no warnings)
   - [ ] Some non-vegetarian options WITH warning badge
   - [ ] Warning text: "Contains non-vegetarian ingredients"
   - [ ] Yellow/orange badge color

**Expected Result:** Non-matching foods shown with visual warnings

### Test 2.4: Strict vs. Flexible Filtering
**Objective:** Compare allergen (strict) vs. dietary (flexible)

**Scenario A - Allergen (Strict):**
- Set allergy: Dairy
- [ ] NO dairy recommendations ever shown
- [ ] No warning badge option (always excluded)

**Scenario B - Dietary (Flexible):**
- Set dietary: Keto (strength 4)
- [ ] High-carb foods shown WITH warning badge
- [ ] User can still log them (not blocked)

**Expected Result:** Allergies strictly filtered, dietary preferences flexible with warnings

---

## Phase 3: Dashboard Enhancements - Testing

### Test 3.1: Dietary Compliance Score
**Objective:** Verify compliance card displays with correct calculation

**Steps:**
1. Navigate to Dashboard "Insights" section
2. Locate blue "Dietary Compliance" card
   - [ ] Circular progress indicator visible
   - [ ] Score displays (e.g., "87%")
   - [ ] Blue gradient fill on circle
   - [ ] Text: "Your meals match your preferences"

**Calculation Check:**
- If logged 10 meals, 7 match preferences, strength avg = 4/5:
- Expected score: (7/10) × (4/5) × 100 = 56%

**Expected Result:** Score displays and updates with logged meals

### Test 3.2: Allergen Warning Card
**Objective:** Verify urgent warning displays when allergens logged

**Steps:**
1. Log meal with allergy (e.g., peanuts if allergic)
2. Return to Dashboard
   - [ ] Red "Allergen Warning" card at top of insights
   - [ ] Pulse animation on card
   - [ ] Alert icon visible
   - [ ] Text shows allergen name
   - [ ] Tap card → details modal

**Expected Result:** Warning appears immediately and urgently

### Test 3.3: Cuisine Diversity Card
**Objective:** Verify cuisine tracking and visualization

**Steps:**
1. Log meals with varied cuisines: Italian, Thai, Indian, Mediterranean, Mexican
2. Check orange "Cuisine Diversity" card
   - [ ] Shows "5 cuisines" (or actual count)
   - [ ] Breakdown bar shows each cuisine color
   - [ ] Percentage displayed (5/5 = 100%)
   - [ ] Text: "You're exploring diverse cuisines!"

**Expected Result:** Diversity tracked and displayed with breakdown

### Test 3.4: Card Animations
**Objective:** Verify smooth animations on insights

- [ ] Compliance card number animates from 0 to final score
- [ ] Circle fills with gradient smoothly
- [ ] Allergen warning pulses continuously
- [ ] Diversity bar fills left-to-right

---

## Phase 4: Profile Analytics - Testing

### Test 4.1: Cuisine Preferences Section
**Objective:** Verify cuisine preferences display with strength

**Steps:**
1. Navigate to Profile tab
2. Scroll to "Cuisine Preferences" section
   - [ ] Section title visible
   - [ ] Expandable/collapsible (if implemented)
3. View selected cuisines:
   - [ ] Mediterranean with strength hearts: ❤️❤️❤️❤️❤️ (5/5)
   - [ ] Each cuisine has color emoji indicator
   - [ ] Edit button available (if enabled)

**Expected Result:** Cuisines display with strength indicators

### Test 4.2: Compliance History Chart
**Objective:** Verify 30-day compliance line chart

**Steps:**
1. In Profile, find "Compliance History" section
2. Verify chart displays:
   - [ ] X-axis shows dates (last 30 days)
   - [ ] Y-axis shows percentage (0-100%)
   - [ ] Line graph with data points
   - [ ] Gradient fill under line
   - [ ] Legend showing "Daily Compliance"

**Expected Data Pattern:**
- If user followed preferences well: Line stays 70%+
- If inconsistent: Line fluctuates

**Expected Result:** Chart renders with proper formatting

### Test 4.3: Recommendation Acceptance Stats
**Objective:** Verify acceptance analytics display

**Steps:**
1. In Profile, find "Recommendation Stats" section
2. Verify displays:
   - [ ] Circular progress: "87% Acceptance Rate"
   - [ ] Breakdown below:
     - Accepted: 65% (green)
     - Rejected: 20% (yellow)
     - Not Yet Tried: 15% (gray)

**Expected Result:** Stats show acceptance breakdown

---

## Phase 5: Recommendation UI Polish - Testing

### Test 5.1: Warning Badge Display
**Objective:** Verify warning badges on recommendations

**Steps:**
1. Navigate to Smart Recommendations
2. Find recommendation NOT matching preferences
3. Verify warning badge visible:
   - [ ] Badge positioned on recommendation card
   - [ ] Clear text: "Contains Dairy" (if relevant)
   - [ ] Icon visible (alert or info)
   - [ ] Color matches warning type (yellow for dietary, red for allergen)

**Badge Types:**
- [ ] Red "Contains Allergen" (never should appear if filtering works)
- [ ] Yellow "Vegetarian option" (for preference mismatch)
- [ ] Blue "Keto-friendly" (for matching strong preference)

**Expected Result:** Badges display correctly on all recommendations

### Test 5.2: Multiple Warnings
**Objective:** Verify handling of multiple warnings

**Steps:**
1. Find recommendation with multiple issues:
   - Contains dairy (dietary mismatch)
   - High carb (low-carb preference)
2. Verify display:
   - [ ] Multiple badges visible
   - [ ] No overlap or clipping
   - [ ] Readable stacked vertically or inline
   - [ ] Tap to expand details

**Expected Result:** All warnings visible without UI issues

### Test 5.3: Recommendation Detail Modal
**Objective:** Verify detailed warning information

**Steps:**
1. Tap on recommendation with warnings
2. Open detail modal
   - [ ] Full recommendation details show
   - [ ] "Why this recommendation" section visible
   - [ ] All matching and non-matching points listed
   - [ ] User can still log despite warnings

**Expected Result:** Modal provides context for recommendations

---

## Phase 6: Cross-Feature Integration - Testing

### Test 6.1: End-to-End Onboarding Flow
**Objective:** Verify complete onboarding to dashboard

**Steps:**
1. Start fresh app (sign out if needed)
2. Complete onboarding:
   - [ ] Step 1: Goals (Weight loss, Nutrition, Fitness)
   - [ ] Step 2: Activity level (Sedentary, Light, Moderate, Very active)
   - [ ] Step 3: Preferences (Vegan + Mediterranean + allergies)
   - [ ] Step 4: Health info
3. Submit and check:
   - [ ] Success animation plays
   - [ ] Auto-redirect to Dashboard (2-3 seconds)
   - [ ] Profile shows with preferences
   - [ ] Recommendations based on prefs appear

**Expected Time:** 3-5 seconds total (from Step 4 submit to dashboard)

### Test 6.2: Preference Change Impact
**Objective:** Verify recommendations update when preferences change

**Steps:**
1. Dashboard showing vegan recommendations
2. Navigate to Profile
3. Change dietary preference to "Keto"
4. Save changes
5. Return to Dashboard
6. Check recommendations:
   - [ ] Recommendations changed to keto-friendly
   - [ ] Previous vegan options have warnings
   - [ ] Compliance score recalculated

**Expected Result:** System updates recommendations immediately

### Test 6.3: Data Persistence
**Objective:** Verify preferences persist across app restarts

**Steps:**
1. Complete onboarding with: Vegan + Mediterranean + Dairy allergy
2. Force close app
3. Reopen app
4. Check Profile:
   - [ ] Vegan dietary preference still set
   - [ ] Mediterranean cuisine still selected
   - [ ] Dairy allergy still in allergies list
5. Check Dashboard:
   - [ ] Recommendations still follow preferences
   - [ ] Compliance history preserved

**Expected Result:** All preferences persist after restart

---

## Bug Fix Verification - Testing

### Test B.1: BRAND Color References Fixed
**Objective:** Verify no color rendering errors

**Console Checks:**
1. Open Expo console during app startup
2. Search for errors:
   - [ ] NO "Cannot convert undefined value to object"
   - [ ] NO "BRAND.purple[600]" errors
   - [ ] NO "BRAND.blue[500]" errors

**Visual Checks:**
1. Step 3 screen:
   - [ ] Purple suggestions container renders correctly
   - [ ] Blue strength section renders without color issues
   - [ ] All chips display correct colors
   - [ ] No white/blank areas (would indicate color issues)

**Expected Result:** All colors render without errors

### Test B.2: API Configuration Correct
**Objective:** Verify Render backend used in all environments

**Console Checks:**
1. Open Expo console
2. Find logs:
   - [ ] `[API Config] 🚀 Mode: Render Backend`
   - [ ] `[API Config] 📡 Using API URL: https://myfoodtracker.onrender.com/api`
   - [ ] `[API Config] ✅ All requests will use Render backend`

**Network Checks:**
1. Network tab in dev tools
2. Verify API calls go to:
   - [ ] `https://myfoodtracker.onrender.com/api/...`
   - [ ] NOT `http://localhost:5001/api`

**Expected Result:** All requests use Render backend

### Test B.3: Environment Variables
**Objective:** Verify .env configuration correct

1. Check `.env` file:
   - [ ] `EXPO_PUBLIC_API_URL` is commented out
   - [ ] Clerk key set correctly
2. Check `.env.example`:
   - [ ] Documentation mentions Render backend default
   - [ ] Instructions for local development included

**Expected Result:** Configuration files match requirements

---

## Performance Testing

### Test P.1: Dashboard Load Time
**Objective:** Verify dashboard loads in <2 seconds

**Steps:**
1. Close app and clear cache
2. Reopen app
3. Time from app open to dashboard visible
   - [ ] <2 seconds total (including API calls)
4. Check console for slow API calls

**Expected Result:** Dashboard loads quickly

### Test P.2: Profile Load Time
**Objective:** Verify profile screen loads in <1.5 seconds

**Steps:**
1. From dashboard, tap Profile tab
2. Time until all sections visible
   - [ ] <1.5 seconds
   - [ ] Charts render without lag
   - [ ] No freezing when scrolling

**Expected Result:** Smooth profile experience

### Test P.3: Recommendation Load Time
**Objective:** Verify recommendations fetch quickly

**Steps:**
1. Dashboard → Smart Recommendations section
2. Time until 5+ recommendations visible
   - [ ] <1.5 seconds
3. Scroll through recommendations:
   - [ ] No lag or jank
   - [ ] Smooth scrolling

**Expected Result:** Quick recommendation loading

---

## Browser/Device Testing

### iOS Testing Checklist
- [ ] iPhone 14+ simulator
- [ ] Test portrait and landscape
- [ ] Safe area handling (notch/home indicator)
- [ ] Haptic feedback works
- [ ] Colors display accurately on Retina

### Android Testing Checklist
- [ ] Pixel 6+ emulator
- [ ] Test portrait and landscape
- [ ] Safe area handling (system nav)
- [ ] Haptic feedback works
- [ ] Colors display on various DPI screens

---

## Critical Pass/Fail Criteria

### MUST PASS (Blocking Issues)
- [ ] **No allergen recommendations shown** when allergen set (CRITICAL)
- [ ] **No color rendering errors** (BRAND references)
- [ ] **API uses Render backend** (not localhost)
- [ ] **Dashboard loads <2 seconds**
- [ ] **Preferences persist** across app restart

### SHOULD PASS (High Priority)
- [ ] Dietary preferences show warnings for non-matching foods
- [ ] Compliance score calculates and displays
- [ ] Cuisine diversity tracks correctly
- [ ] 30-day chart renders with data
- [ ] All animations smooth (no janky transitions)

### NICE TO HAVE (Polish)
- [ ] Warning badges styled consistently
- [ ] Profile details editable
- [ ] Haptic feedback on all interactions
- [ ] Smooth gradient transitions

---

## Test Results Summary

### Phase 1: Step 3 Redesign
- [ ] Pass
- [ ] Fail (describe issues):

### Phase 2: Backend Safety
- [ ] Pass
- [ ] Fail (describe issues):

### Phase 3: Dashboard Enhancements
- [ ] Pass
- [ ] Fail (describe issues):

### Phase 4: Profile Analytics
- [ ] Pass
- [ ] Fail (describe issues):

### Phase 5: Recommendation UI
- [ ] Pass
- [ ] Fail (describe issues):

### Phase 6: Bug Fixes
- [ ] Pass
- [ ] Fail (describe issues):

### Overall Status
- [ ] **READY FOR PRODUCTION**
- [ ] **NEEDS FIXES** (list above)
- [ ] **BLOCKED** (critical issue)

---

## Notes & Issues Found

```
[Add testing observations, bugs found, and recommendations here]
```

---

**Testing Completed By:** [Name]
**Date:** [Date]
**Platform:** [iOS/Android]
**Device:** [Device Model]
**Render Backend Status:** ✅ Working
