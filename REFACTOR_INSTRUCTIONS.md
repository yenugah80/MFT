# DashboardContent.jsx Refactoring Instructions

## Overview

The current `DashboardContent.jsx` is 2,497 lines with 15+ components.

We've created **6 new premium Intelligence Cards** following the Narrative Stack architecture. Now we need to integrate them into the dashboard.

---

## Approach: Surgical Refactoring

Instead of rewriting the entire 2,497-line file (risky), we'll make **surgical changes**:

1. ✅ Add new component imports
2. ✅ Remove old component imports
3. ✅ Remove redundant state variables
4. ✅ Update the render section (lines 1124-1500)
5. ✅ Keep all existing hooks, logic, and error handling

---

## Step-by-Step Instructions

### STEP 1: Add New Component Imports

**Location:** After line 65 in DashboardContent.jsx

**ADD:**
```javascript
// NEW: Narrative Stack Components - Ultra Premium Intelligence Cards
import HeroInsightCard from "./dashboard/HeroInsightCard";
import NutritionIntelligenceCard from "./dashboard/NutritionIntelligenceCard";
import HydrationIntelligenceCard from "./dashboard/HydrationIntelligenceCard";
import MoodEnergyIntelligenceCard from "./dashboard/MoodEnergyIntelligenceCard";
import ActivityProgressIntelligenceCard from "./dashboard/ActivityProgressIntelligenceCard";
import EnhancedGamificationCard from "./dashboard/EnhancedGamificationCard";
```

---

### STEP 2: Remove/Comment Out Old Component Imports

**Location:** Lines 43-61

**COMMENT OUT (don't delete yet, for safety):**
```javascript
// import DashboardNutritionSection from "./dashboard/DashboardNutritionSection"; // REPLACED by NutritionIntelligenceCard
// import DashboardWellnessSection from "./dashboard/DashboardWellnessSection"; // REPLACED by HydrationIntelligenceCard + MoodEnergyIntelligenceCard
// import DashboardProgressSection from "./dashboard/DashboardProgressSection"; // REPLACED by ActivityProgressIntelligenceCard
// import FoodMoodScoreCard from "./dashboard/FoodMoodScoreCard"; // REPLACED by HeroInsightCard + MoodEnergyIntelligenceCard
// import PremiumAchievementsCard from "./dashboard/PremiumAchievementsCard"; // REPLACED by EnhancedGamificationCard
// import CompactDashboardTiles from "./dashboard/CompactDashboardTiles"; // REPLACED by Intelligence Cards
// import MealInsightsCard from "./dashboard/MealInsightsCard"; // REPLACED by NutritionIntelligenceCard + ActivityProgressIntelligenceCard
```

---

### STEP 3: Remove Redundant State Variables

**Location:** Lines 218-221

**REMOVE:**
```javascript
// REMOVED: Handled internally by Intelligence Cards now
// const [nutritionExpanded, setNutritionExpanded] = useState(true);
// const [wellnessExpanded, setWellnessExpanded] = useState(true);
// const [progressExpanded, setProgressExpanded] = useState(false);
```

**KEEP:**
```javascript
const [focusMode, setFocusMode] = useState(false); // KEEP - still useful
```

---

### STEP 4: Replace Render Section

**Location:** Lines 1186-1388 (the main ScrollView content)

**FIND:**
```jsx
        {/* ============================================ */}
        {/* HERO CARD - ONE unified wellness + mood display */}
        {/* ============================================ */}
        <FoodMoodScoreCard
          today={today}
          goals={goals}
          moodLogs={today?.moodLogs || []}
          historicalScores={[]}
          onViewDetails={() => router.push('/insights/mood')}
        />

        {/* ============================================ */}
        {/* QUICK ACTIONS ROW */}
        {/* ============================================ */}
        <QuickActionsRow
          onLogMeal={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } })}
          onLogWater={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } })}
          onLogMood={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } })}
        />

        {/* Rest of the old cards... */}
```

**REPLACE WITH:**
```jsx
        {/* ============================================ */}
        {/* TIER 1: HERO INSIGHT - The ONE clear insight */}
        {/* This is the first thing users see. Contextual, personalized, actionable. */}
        {/* ============================================ */}
        <HeroInsightCard
          today={today}
          goals={goals}
          moodLogs={today?.moodLogs || []}
          trends={trends}
          userProfile={userProfile}
          onAction={(insight) => {
            // Handle CTA based on insight type
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (insight.action.includes('Breakfast') || insight.action.includes('Lunch') || insight.action.includes('Meal')) {
              router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } });
            } else if (insight.action.includes('Protein')) {
              router.push({ pathname: '/(tabs)/log', params: { focus: 'meal', prefill: 'chicken breast' } });
            } else if (insight.action.includes('Water')) {
              router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
            } else if (insight.action.includes('Mood')) {
              router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } });
            } else {
              // Default: go to log tab
              router.push('/(tabs)/log');
            }
          }}
          onViewDetails={() => {
            // Take user to mood insights screen
            router.push('/insights/mood');
          }}
        />

        {/* ============================================ */}
        {/* TIER 2: QUICK ACTIONS - Frictionless logging */}
        {/* 3 buttons, no thinking required */}
        {/* ============================================ */}
        <QuickActionsRow
          onLogMeal={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } })}
          onLogWater={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } })}
          onLogMood={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } })}
        />

        {/* ============================================ */}
        {/* TIER 3: GAMIFICATION - Meaningful progression */}
        {/* Achievements tied to learning outcomes, not just volume */}
        {/* ============================================ */}
        {hasAnyData && (
          <EnhancedGamificationCard
            level={parseDecimal(gamification?.level, 1)}
            xp={parseDecimal(gamification?.xp, 0)}
            nextLevelXp={parseDecimal(gamification?.nextLevelXp, 100)}
            streak={displayStreak}
            streakFreezes={parseDecimal(gamification?.streakFreezes, 0)}
            patternsDiscovered={trends?.patternsDiscovered || 0}
            onViewAchievements={() => {
              // Navigate to achievements page (or expand achievements modal)
              router.push('/profile'); // Placeholder - create dedicated achievements page
            }}
          />
        )}

        {/* ============================================ */}
        {/* TIER 4: CALENDAR & ACTIVITY - Visual context */}
        {/* ============================================ */}
        <PremiumCalendarStrip
          data={calendarData}
          selectedDate={null}
          currentStreak={displayStreak}
          onDateSelect={(dateOrObj) => {
            const dateKey = dateOrObj?.dateKey || (dateOrObj instanceof Date ? dateOrObj.toISOString().split('T')[0] : null);
            if (dateKey) {
              router.push({ pathname: '/history', params: { date: dateKey } });
            }
          }}
        />

        {/* Today's Activity Feed - Unified timeline */}
        <UnifiedActivityFeed
          meals={uniqueFoodLogs}
          waterLogs={today?.waterLogs || []}
          moodLogs={today?.moodLogs || []}
          onItemPress={(activity) => {
            if (activity.type === 'meal') {
              const mealId = activity.data?.clientEventId || activity.data?.id;
              if (mealId) router.push(`/meal/${mealId}`);
            } else if (activity.type === 'mood') {
              router.push('/insights/mood');
            } else if (activity.type === 'water') {
              router.push({ pathname: '/(tabs)/log', params: { focus: 'hydration' } });
            }
          }}
          onViewAll={() => router.push('/activity/today')}
        />

        {/* ============================================ */}
        {/* TIER 5: DEDICATED INTELLIGENCE CARDS */}
        {/* Premium deep-dive cards (collapsed by default) */}
        {/* Each links to its dedicated full screen */}
        {/* ============================================ */}

        {/* Nutrition Intelligence - Macros, calories, protein insights */}
        <NutritionIntelligenceCard
          today={today}
          goals={goals}
          trends={trends}
          onViewFullBreakdown={() => router.push('/insights/nutrition')}
          onLogMeal={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'meal' } })}
        />

        {/* Hydration Intelligence - Water intake, smart nudges */}
        <HydrationIntelligenceCard
          today={today}
          goals={goals}
          trends={trends}
          hydrationAnalytics={hydrationAnalytics}
          onQuickAddWater={async (amount) => {
            await logWater(amount);
            refetch(); // Refresh dashboard
          }}
          onViewTrends={() => router.push('/insights/hydration')}
          onSetReminder={() => {
            // TODO: Implement reminder logic
            notify.info('Reminder feature coming soon!');
          }}
        />

        {/* Mood & Energy Intelligence - THE KILLER FEATURE */}
        {/* Food-mood pattern discovery - this is what makes us unique */}
        <MoodEnergyIntelligenceCard
          moodLogs={today?.moodLogs || []}
          foodLogs={uniqueFoodLogs}
          trends={trends}
          onViewFullInsights={() => router.push('/insights/mood')}
          onLogMood={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'mood' } })}
        />

        {/* Activity & Progress Intelligence - Weekly stats, achievements */}
        <ActivityProgressIntelligenceCard
          foodLogs={uniqueFoodLogs}
          moodLogs={today?.moodLogs || []}
          waterLogs={today?.waterLogs || []}
          streak={displayStreak}
          trends={trends}
          onViewTimeline={() => router.push('/activity/today')}
        />

        {/* ============================================ */}
        {/* TIER 6: SMART RECOMMENDATIONS - Proactive help */}
        {/* ============================================ */}
        <SmartMealSuggestionCard
          today={today}
          goals={goals}
          recentMeals={uniqueFoodLogs}
          userProfile={userProfile}
          onSelectSuggestion={(suggestion) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: '/(tabs)/log',
              params: {
                focus: 'meal',
                prefill: suggestion.name
              }
            });
          }}
          onViewMore={() => router.push('/history')}
        />

        {/* ============================================ */}
        {/* CONDITIONAL CARDS - Only show when relevant */}
        {/* ============================================ */}

        {/* Allergen Warnings - Critical alerts only */}
        {allergenWarnings.length > 0 && (
          <AllergenWarningCard warnings={allergenWarnings} />
        )}

        {/* Food Nutri-Score - Educational */}
        <FoodNutriScoreCard
          foodLogs={uniqueFoodLogs}
          onScanBarcode={() => router.push({ pathname: '/(tabs)/log', params: { focus: 'barcode' } })}
          onViewDetails={() => router.push('/history')}
        />
```

---

### STEP 5: Remove Old Dashboard Sections

**FIND and COMMENT OUT (lines ~1338-1388):**
```jsx
        // {/* REMOVED: NUTRITION SECTION - Replaced by NutritionIntelligenceCard */}
        // <DashboardNutritionSection
        //   styles={styles}
        //   expanded={nutritionExpanded}
        //   onToggle={() => setNutritionExpanded(!nutritionExpanded)}
        //   ...
        // />

        // {/* REMOVED: WELLNESS SECTION - Replaced by HydrationIntelligenceCard + MoodEnergyIntelligenceCard */}
        // <DashboardWellnessSection
        //   styles={styles}
        //   expanded={wellnessExpanded}
        //   onToggle={() => setWellnessExpanded(!wellnessExpanded)}
        //   ...
        // />

        // {/* REMOVED: PROGRESS SECTION - Replaced by ActivityProgressIntelligenceCard */}
        // <DashboardProgressSection
        //   styles={styles}
        //   expanded={progressExpanded}
        //   onToggle={() => setProgressExpanded(!progressExpanded)}
        //   ...
        // />
```

---

### STEP 6: Update Focus Mode Toggle Logic

**FIND (line ~1142-1151):**
```jsx
          onToggleFocusMode={() => {
            const newFocusMode = !focusMode;
            setFocusMode(newFocusMode);

            if (newFocusMode) {
              setNutritionExpanded(false); // REMOVE
              setWellnessExpanded(false); // REMOVE
              setProgressExpanded(false); // REMOVE
            }
          }}
```

**REPLACE WITH:**
```jsx
          onToggleFocusMode={() => {
            const newFocusMode = !focusMode;
            setFocusMode(newFocusMode);

            // Focus mode now handled by showing/hiding Intelligence Cards
            // Intelligence Cards are collapsed by default, so focus mode is implicit
          }}
```

---

## Testing Checklist

After making these changes, test:

- ✅ **Hero Insight shows** different messages based on time of day
- ✅ **Quick Actions work** (navigate to log tab)
- ✅ **Gamification Card displays** level, streak, XP correctly
- ✅ **Calendar shows** streak correctly
- ✅ **Activity Feed shows** today's meals/water/mood
- ✅ **Intelligence Cards expand/collapse** on tap
- ✅ **"View Full" buttons navigate** to dedicated screens correctly:
  - Nutrition → `/insights/nutrition`
  - Hydration → `/insights/hydration`
  - Mood → `/insights/mood`
  - Activity → `/activity/today`
- ✅ **Pattern Discovery** shows in MoodEnergyIntelligenceCard when data exists
- ✅ **Allergen warnings** show only when allergies detected
- ✅ **Pull to refresh** works
- ✅ **Loading state** shows skeleton
- ✅ **Error state** shows retry button

---

## Rollback Plan (If Issues)

If anything breaks:
```bash
cp /Users/harikayenuga/Desktop/MyFoodTracker-main/mobile/components/DashboardContent.jsx.backup /Users/harikayenuga/Desktop/MyFoodTracker-main/mobile/components/DashboardContent.jsx
```

---

## Expected Outcome

**Before:**
- 15+ cards on dashboard
- Endless scrolling
- No clear focus
- Information overload

**After:**
- 6-8 cards following Narrative Stack
- Clear hierarchy: Hero → Actions → Progress → Details
- Food-mood patterns highlighted
- Collapsed cards reduce cognitive load
- Users complete sessions in <2 minutes

---

## Next Steps After Implementation

1. **Week 1:** User testing with 10-20 beta users
2. **Week 2:** Gather feedback, refine insight algorithms
3. **Week 3:** A/B test vs old dashboard (measure retention)
4. **Week 4:** Ship to production if metrics improve

---

**Ready to implement? Let me know if you want me to do the refactoring automatically.**
