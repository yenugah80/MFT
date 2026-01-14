# Dashboard UX Audit - Current Issues

## Critical Problems Found

### 1. **Nutrition Details Section - EMPTY**
**File:** `mobile/components/dashboard/DashboardNutritionSection.jsx`
**Issue:** Only shows placeholder text "View detailed macro and micronutrient information in the food log"
**Impact:** Users cannot see their actual nutrition data
**Fix Needed:** Replace with comprehensive component showing:
- Progress rings for all macros and water
- Macro balance bars with percentages
- Meal timeline
- Micronutrients breakdown

### 2. **Progress Rings - NOT INTEGRATED**
**Files:** `DashboardStatsGrid.jsx`, `CircularProgress.jsx`
**Issue:** Created but placed standalone on dashboard, not inside Nutrition Details
**Impact:** Cluttered dashboard, poor information hierarchy
**Fix Needed:** Move inside Nutrition Details component

### 3. **Macro Breakdown - NOT INTEGRATED**
**File:** `MacroBreakdownCard.jsx`
**Issue:** Created but placed standalone on dashboard
**Impact:** Duplicate functionality, poor UX
**Fix Needed:** Integrate into Nutrition Details component

### 4. **Insights Section - CONFUSING**
**File:** `DailyIntelligenceBehaviorSection.jsx`
**Issue:**
- NOVA foods card looks generic
- "Other Patterns" section lacks visual appeal
- No graphs or charts showing correlations
- Text-heavy, not scannable
**Impact:** Users don't understand patterns or insights
**Fix Needed:** Create dedicated insights screen with:
- Pattern correlation graphs
- NOVA score visualization
- Food-mood timeline charts
- Hydration impact visualization

### 5. **Dashboard Hierarchy - BROKEN**
**Issue:** Too many scattered components:
- FoodMoodScoreCard (OK)
- DashboardStatsGrid (should be inside Nutrition Details)
- MacroBreakdownCard (should be inside Nutrition Details)
- DailyIntelligenceBehaviorSection (OK but needs visual upgrade)
- DashboardNutritionSection (EMPTY)
**Impact:** Overwhelming, unclear priorities
**Fix Needed:** Simplify to:
- Hero wellness card
- Quick actions
- Expandable Nutrition Details (with everything inside)
- Link to dedicated Insights screen

## Recommended Architecture

```
Dashboard
├── Header (greeting, date, streak)
├── FoodMoodScoreCard (hero wellness score)
├── Calendar Strip (date navigation)
├── Nutrition Details (EXPANDABLE)
│   ├── Progress Rings Grid
│   │   ├── Calories (orange)
│   │   ├── Protein (purple)
│   │   ├── Carbs (green)
│   │   ├── Fat (amber)
│   │   └── Water (cyan)
│   ├── Macro Breakdown (bars with percentages)
│   ├── Meals Timeline
│   └── Micronutrients (if available)
├── Quick Insights Preview
│   ├── Top 1-2 patterns
│   └── "View All Insights" button → dedicated screen
└── Daily Intelligence (behavioral patterns)

Dedicated Insights Screen (/insights)
├── Header with filters
├── NOVA Score Card (visual breakdown)
├── Pattern Correlations (with graphs)
│   ├── High NOVA → Energy dips (line chart)
│   ├── Dehydration → Poor focus (bar chart)
│   └── [Other patterns]
├── Food-Mood Timeline (interactive chart)
├── Hydration Impact (area chart)
└── Recommendations (actionable cards)
```

## Next Steps
1. ✅ Redesign NutritionDetailsSection with all components integrated
2. ✅ Create dedicated Insights screen with proper visualizations
3. ✅ Reorganize dashboard for clean hierarchy
4. ✅ Add pattern correlation charts
5. ✅ Test and polish animations
