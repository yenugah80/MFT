# Dashboard Refactor Plan - Premium Reference Designs

## Design Vision
Implement a dark-themed, premium nutrition dashboard inspired by reference images with:
- Dark background with vibrant gradient accents
- Calorie ring as hero metric
- Macro breakdown with horizontal progress bars
- Weekly progress charts
- Clean card hierarchy with progressive disclosure

## Reference Design Analysis

### Pattern 1: Dark Theme with Vibrant Accents
- **Background**: Dark brown/charcoal (#1A1A1A, #2D2D2D)
- **Cards**: Elevated surfaces with subtle borders
- **Text**: Light text (#FFFFFF) on dark backgrounds
- **Accents**: Orange (nutrition), Blue (hydration), Purple (mood), Green (activity)

### Pattern 2: Hero Metric - Calorie Ring
```
Central circular progress indicator showing:
- Total calories allowed (goal)
- Calories consumed (filled portion)
- Remaining calories (empty portion)
- Large number in center (remaining or consumed)
```

### Pattern 3: Daily Summary Section
```
┌─────────────────────────────────────┐
│ Good Morning, [Name]               │
│ [Calendar selector]   [Notification]│
├─────────────────────────────────────┤
│         ╔════════════════╗         │
│         ║                ║         │
│    380 Cal            [Icon]       │
│         ║     Left        ║         │
│         ║                ║         │
│         ╚════════════════╝         │
│                                     │
│    Target    Burned                │
│    500 Cal   120 Cal               │
└─────────────────────────────────────┘
```

### Pattern 4: Macro Breakdown
```
┌─────────────────────────────────────┐
│  Carb    🍚  50%  [████████░░░░░░]  │
│  Protein 💪  70%  [███████████░░]   │
│  Fat     🌰  60%  [██████████░░░░]  │
└─────────────────────────────────────┘
```

### Pattern 5: Weekly Progress
```
Bar chart showing 7 days with daily calorie intake:
M   T   W   T   F   S   S
|   |   |   |   |   |   |
30% 35% 25% 40% 30% 30% 30%
```

### Pattern 6: Today's Meals
```
Meal type tabs: [Break] [Lunch] [Dinner]
Food items as list with circular calorie indicators
[Food Image] Food Name  [100 Cal]
```

## Implementation Roadmap

### Phase 1: Layout Restructure
1. Update imports to use `designSystem` (not `premiumDesignSystem`)
2. Change container background to dark theme
3. Restructure ScrollView content order

### Phase 2: Hero Section
1. Create `DailyCalorieRing` component showing calorie progress
2. Implement summary stats (Target, Burned, Remaining)
3. Add date selector and greeting

### Phase 3: Macro Breakdown
1. Create `MacroBreakdownSection` with horizontal bars
2. Add emoji icons for each macro type
3. Show percentage and current/target values

### Phase 4: Weekly Chart
1. Create `WeeklyProgressChart` component
2. Implement bar chart visualization
3. Show average and current week comparison

### Phase 5: Meal Tracking
1. Restructure meals into tabs (Breakfast, Lunch, Dinner)
2. Add meal thumbnails with calorie indicators
3. Implement "Add Meal" button

### Phase 6: Polish & Testing
1. Add animations and transitions
2. Test responsiveness
3. Verify all data flows properly

## Color Palette (from designSystem.js)
```javascript
nutrition:  ['#F97316', '#FB923C', '#FDBA74']     // Orange
hydration:  ['#0EA5E9', '#38BDF8', '#7DD3FC']     // Blue
mood:       ['#8B5CF6', '#A78BFA', '#C4B5FD']     // Purple
activity:   ['#10B981', '#34D399', '#6EE7B7']     // Green
progress:   ['#F59E0B', '#FBBF24', '#FCD34D']     // Gold

// Dark theme
dark: {
  background: '#1A1A1A',
  card: '#2D2D2D',
  border: '#3F3F3F',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0'
}
```

## Components to Create/Modify

### New Components
- `DailyCalorieRing.jsx` - Hero metric with circular progress
- `MacroBreakdownSection.jsx` - Macro display with progress bars
- `WeeklyProgressChart.jsx` - 7-day bar chart
- `MealTabsSection.jsx` - Meal type selector and list
- `DarkDashboardHeader.jsx` - Greeting + date selector

### Modified Components
- `DashboardContent.jsx` - Main restructuring (switch theme, layout)

### Unchanged
- All existing hooks (useDashboard, useWaterLog, etc.)
- All existing data flow and calculations
- All existing event tracking

## Success Criteria
✅ Dark theme applied throughout
✅ Calorie ring visible and functional
✅ Macro breakdown displays correctly
✅ Weekly chart shows data
✅ All data flows maintained
✅ No broken imports
✅ Animations smooth at 60fps
✅ Touch targets all ≥44x44pt
