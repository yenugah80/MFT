# PREMIUM DASHBOARD - SPEC & IMPLEMENTATION GUIDE

**Target**: Match reference images exactly
**Approach**: Remove 50% of components, increase visual weight of hero metric
**Result**: Clean, focused, premium experience

---

## VISUAL STRUCTURE (What Users See)

### SECTION 1: HEADER (50px)
```
[Greeting] [Date selector]                      [⚙️ Settings]
"Good Morning, Harika"       Saturday, January 10
```

### SECTION 2: HERO CALORIE RING (380px) ← 50% of initial viewport
```
┌─────────────────────────────────────────┐
│                                         │
│            ╔════════════════╗          │
│            ║                ║          │
│      380   ║     Ring       ║          │
│      Cal   ║   (animated)   ║          │
│     Left   ║                ║          │
│            ║                ║          │
│            ╚════════════════╝          │
│                                         │
│    Target: 2000 Cal | Consumed: 1620   │
│                                         │
└─────────────────────────────────────────┘

Typography:
- "380" = 56pt Bold (HUGE)
- "Cal Left" = 14pt Regular
- Stats = 13pt Regular
- Card height = 380px (dominates)
```

### SECTION 3: MACRO BREAKDOWN (200px)
```
┌─────────────────────────────────────────┐
│ Today's Macros                          │
├─────────────────────────────────────────┤
│ 💪 Protein   68g / 100g   [█████░░░░] │
│ 🍚 Carbs    403g / 93g   [████████░░] │
│ 🌰 Fat       52g / 65g    [██████░░░░] │
└─────────────────────────────────────────┘

Colors:
- Protein bars: Orange (#F97316)
- Carbs bars: Gold (#F59E0B)
- Fat bars: Green (#10B981)
```

### SECTION 4: WEEKLY CHART (220px)
```
┌─────────────────────────────────────────┐
│ Weekly Progress              │Avg: 2031 │
├─────────────────────────────────────────┤
│                                         │
│   2500 ┐                                │
│   2000 ├─ ─ ─ ─ ─ ─ ─ (goal line)      │
│   1500 ├                                │
│   1000 ├                                │
│        │  ║  ║  ║  ║  ║  ║  ║          │
│      0 └──M──T──W──T──F──S──S──        │
│                                         │
└─────────────────────────────────────────┘

- Orange bars for days above goal
- Muted bars for days below goal
- Goal line prominent
- Day labels clear
```

### SECTION 5: TODAY'S MEALS (280px)
```
┌─────────────────────────────────────────┐
│ Today's Meals                           │
├───[Break]──[Lunch]──[Dinner]───────────┤
│                                         │
│ [🍳 Image] Green Sochi    08:10  100Cal│
│ [🍲 Image] Green Sochi    12:30  280Cal│
│ [🍗 Image] Chicken Salad  19:00  380Cal│
│                                         │
│        [+ Add Meal]  [Log More]        │
└─────────────────────────────────────────┘

Features:
- Meal type tabs (active highlighted)
- Food thumbnail + name + time + calories
- Quick add button
```

### SECTION 6: MORE INSIGHTS (Collapsible, Hidden)
```
┌─────────────────────────────────────────┐
│ More Insights                      [∨]  │
├─────────────────────────────────────────┤
│ (When expanded:)                        │
│                                         │
│ 😊 Mood & Energy                       │
│    Current: 7.2/10 (Good)              │
│    7-day trend: ↗ Improving            │
│                                         │
│ ⚡ Energy Stability (Premium)          │
│    Predict dip at 3pm - add snack?     │
│                                         │
│ 💡 Smart Recommendations               │
│    → Increase protein intake           │
│    → Set hydration reminder            │
│                                         │
│ 🏆 Progress & Streaks                  │
│    4 day streak | Next milestone: 7    │
│                                         │
└─────────────────────────────────────────┘
```

---

## COMPONENT INVENTORY

### COMPONENTS TO KEEP/ENHANCE:
1. **DailyCalorieRing** (HERO - make 2-3x larger)
2. **MacroBreakdownSection** (Keep as-is)
3. **WeeklyProgressChart** (Keep as-is)

### COMPONENTS TO CREATE:
4. **PremiumHeader** (Greeting + Date + Settings)
5. **QuickStatsRow** (Target | Consumed | Burned)
6. **MealTabsSection** (Breakfast, Lunch, Dinner tabs + list)
7. **CollapsibleMoreInsights** (Mood, Energy, Recommendations, Progress)

### COMPONENTS TO DELETE/HIDE:
- ❌ UnifiedWellnessScore (replaced by Calorie Ring)
- ❌ EnergyStabilityGauge (move to collapsible)
- ❌ NutriScoreDial (redundant)
- ❌ CompactMacroHydrationRow (replaced by MacroBreakdownSection)
- ❌ MoodEnergySparkline (move to collapsible)
- ❌ PriorityRecommendationCard (move to collapsible)
- ❌ WeeklyNarrativeCard (move to collapsible)
- ❌ ProgressMilestonesCard (move to collapsible)

---

## TYPOGRAPHY SCALING (Premium Feel)

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Calorie number (hero) | 56pt | Bold | #FFFFFF |
| "Cal Left" label | 14pt | Regular | rgba(255,255,255,0.7) |
| Section titles | 18pt | Bold | #FFFFFF |
| Macro labels | 16pt | Semibold | #FFFFFF |
| Macro values | 14pt | Regular | rgba(255,255,255,0.8) |
| Stats | 13pt | Regular | rgba(255,255,255,0.6) |

**Current hero size**: ~40pt (estimated from screenshot)
**Required size**: 56pt minimum
**Increase**: +40% larger

---

## COLOR STRATEGY

### Dark Background:
- Base: #1A1A1A
- Elevated: #2D2D2D
- Border: rgba(255,255,255,0.1)

### Vibrant Accents:
- **Primary (Nutrition)**: #F97316 (orange)
- **Secondary (Carbs)**: #F59E0B (gold)
- **Tertiary (Activity)**: #10B981 (green)
- **Premium (Hydration)**: #0EA5E9 (blue)

### Text:
- Primary: #FFFFFF
- Secondary: rgba(255,255,255,0.7)
- Tertiary: rgba(255,255,255,0.5)

---

## SPACING & LAYOUT

### Container:
- Horizontal padding: 16pt (SPACING.lg)
- Vertical padding: 24pt (SPACING.2xl)
- Gap between sections: 24pt

### Cards:
- Border radius: 16pt (RADIUS.lg)
- Padding: 16pt
- Border: 1px rgba(255,255,255,0.1)

### Hero Calorie Ring:
- Height: 380px (DOMINATES)
- Padding: 24pt
- Ring size: 220px (centered)
- Ring width: 16pt

---

## SCROLL BEHAVIOR

**First Load (Before Any Scroll):**
- Header (visible)
- Calorie Ring (HERO - fully visible, 50% of screen)
- Top of Macro Breakdown (visible)

**User Scrolls Down:**
- Macro Breakdown (fully visible)
- Weekly Chart (visible)
- Today's Meals (fully visible)
- More Insights (collapsed, tappable)

**Total Scroll Height:**
- Header: 50px
- Calorie Ring: 380px
- Macro Breakdown: 200px
- Weekly Chart: 220px
- Today's Meals: 280px
- More Insights: 50px (collapsed) → 400px (expanded)
- **Total: ~1180px (vs current ~2800px)**

**Reduction: 58% less scrolling required**

---

## INTERACTION PATTERNS

### Calorie Ring:
- Tap → Expand to full-screen detailed view
- Swipe → Switch between Daily/Weekly/Monthly

### Macro Bars:
- Tap → Show nutritional details modal
- Long-press → Quick edit goals

### Weekly Chart:
- Tap day → Show meals for that day
- Swipe → Navigate to previous/next week

### Meal List:
- Swipe left → Delete meal
- Tap → View full nutrition breakdown
- Tap [+ Add Meal] → Navigate to log

### More Insights:
- Tap expand → Show full section
- Tap each card → Navigate to detailed screen

---

## ANIMATION SEQUENCES

### Page Load:
1. **Header** fades in (0ms)
2. **Calorie Ring** scales in (100ms)
3. **Macro Breakdown** fades in (250ms)
4. **Weekly Chart** fades in (350ms)
5. **Meal List** fades in (450ms)

### Refresh:
1. Calorie Ring updates (500ms spring animation)
2. Macro bars transition (300ms ease-out)
3. Weekly chart slides (400ms ease-out)

### Interactions:
- Tap response: 100ms scale feedback
- Expand: 300ms smooth height animation
- Swipe: Momentum-based physics

---

## RESPONSIVE DESIGN

### iPhone SE (375px):
- Calorie ring: Slightly smaller
- Macro bars: Single line
- Chart: Condensed

### iPhone 12/13 (390px):
- Full design (optimized for this)

### iPhone Pro Max (430px):
- Increased spacing
- Larger typography
- More breathing room

---

## PERFORMANCE TARGETS

- **FCP (First Contentful Paint)**: <1.5s
- **LCP (Largest Contentful Paint)**: <2.5s (hero ring)
- **Animation FPS**: 60fps
- **Memory**: <50MB
- **Bundle**: <800KB

---

## ACCESSIBILITY REQUIREMENTS

- ✅ Contrast: 7:1+ (WCAG AAA)
- ✅ Touch targets: 44x44pt minimum
- ✅ Font size: 14pt minimum (body text)
- ✅ Screen reader: Semantic labels
- ✅ Color alone: Never sole indicator
- ✅ Motion: Reduced motion support

---

## SUCCESS CRITERIA

✅ Initial screen shows calorie ring at 50%+ of viewport
✅ Total components visible without scroll: 3 (header, ring, partial macros)
✅ Hero typography 56pt+ for main number
✅ No component redundancy (show each data point once)
✅ Users understand status in <3 seconds
✅ Premium feel: Bold colors, clear hierarchy
✅ <60% of current scroll height
✅ Matches reference images visually

---

## IMPLEMENTATION PHASES

### Phase 1: Create New Components (2 hours)
- PremiumHeader
- QuickStatsRow
- MealTabsSection
- CollapsibleMoreInsights

### Phase 2: Refactor DashboardContent (1 hour)
- Remove old components from render
- Add new components in proper order
- Adjust sizing/spacing

### Phase 3: Enhance DailyCalorieRing (1 hour)
- Increase typography sizes
- Adjust ring dimensions
- Add animations

### Phase 4: Testing & Polish (1 hour)
- Test on all screen sizes
- Verify animations
- Check accessibility

**Total: 5 hours to production-ready**
