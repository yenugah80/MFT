# FoodNutriScoreCard Integration Guide

## Overview
`FoodNutriScoreCard` displays the actual Nutri-Score (A-E grades) for foods logged by the user. Uses real data from the API, not custom calculations.

## Features
- ✅ Official Nutri-Score A-E grades with correct colors
- ✅ Shows individual food items with their scores
- ✅ Calculates daily average Nutri-Score
- ✅ Highlights foods missing score data
- ✅ Two display modes: Full card & Compact
- ✅ Responsive design, scrollable food list

## Installation

### 1. Component Location
```
mobile/components/dashboard/FoodNutriScoreCard.jsx
```

### 2. Import in DashboardContent
```jsx
import FoodNutriScoreCard from "./dashboard/FoodNutriScoreCard";
```

## Usage Examples

### Full Card (Dashboard)
Show complete card with legend, average score, and detailed list:

```jsx
<FoodNutriScoreCard
  foodLogs={uniqueFoodLogs}
  compact={false}
/>
```

**Location in DashboardContent.jsx**: After `RemainingBudgetCard` (around line 1083)

```jsx
<RemainingBudgetCard
  today={today}
  goals={goals}
/>

{/* ADD HERE */}
<FoodNutriScoreCard
  foodLogs={uniqueFoodLogs}
  compact={false}
/>

<DashboardNutritionSection
  // ... props
/>
```

### Compact Card (Calendar View / Insights)
Small, minimal version for space-constrained layouts:

```jsx
<FoodNutriScoreCard
  foodLogs={uniqueFoodLogs}
  compact={true}
/>
```

**Use cases:**
- Calendar view (daily mini cards)
- Insights modal (weekly summary)
- Inline nutrition section
- History/trends page

## Data Flow

### Input Data
Expects `foodLogs` array from dashboard API:

```typescript
interface FoodLog {
  id: number;
  foodName: string;
  calories: number | null;
  nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;  // ← Key field
}
```

### Getting Data in DashboardContent
Already available from `useDashboard()` hook:

```jsx
const { data } = useDashboard();
const uniqueFoodLogs = useMemo(() => {
  // ... deduplication logic already in DashboardContent
}, [data, localFoodLogs]);

// Pass to card:
<FoodNutriScoreCard foodLogs={uniqueFoodLogs} />
```

## Styling

Uses existing design tokens:
- **premiumTheme**: Colors, spacing, typography
- **GlassCard**: Card wrapper component

Official Nutri-Score colors:
- **A** (80+): #038141 (Dark green) - Best
- **B** (60-79): #85BB2F (Light green) - Good
- **C** (40-59): #FECB02 (Yellow) - Fair
- **D** (20-39): #EE8100 (Orange) - Poor
- **E** (0-19): #E63E11 (Red) - Avoid

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `foodLogs` | `FoodLog[]` | `[]` | Array of logged food items |
| `compact` | `boolean` | `false` | Minimal layout (no legend, smaller header) |

## States

### Empty State
Shows when no foods logged:
```jsx
<FoodNutriScoreCard foodLogs={[]} />
```
Displays: "No foods logged yet"

### No Scores
Shows warning when foods don't have Nutri-Score data:
```
1 item missing score
Scan barcode or search to get Nutri-Score data
```

### Full Card
- Header with title + item count + average grade
- Scrollable list of foods with their grades
- Missing scores section (if applicable)
- Grade legend (A-E explanation)

### Compact Card
- Minimal header
- List only
- No legend

## Example Implementation

### Complete Dashboard Integration

```jsx
export default function DashboardContent() {
  const { data } = useDashboard();

  // ... existing code ...

  const uniqueFoodLogs = useMemo(() => {
    // ... existing deduplication logic ...
  }, [data, localFoodLogs]);

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface.background.primary }]}>
        <ScrollView>
          {/* Existing cards... */}

          <RemainingBudgetCard
            today={today}
            goals={goals}
          />

          {/* NEW: Food Nutri-Score Card */}
          {uniqueFoodLogs.length > 0 && (
            <FoodNutriScoreCard
              foodLogs={uniqueFoodLogs}
              compact={false}
            />
          )}

          <DashboardNutritionSection
            // ... existing props ...
          />
        </ScrollView>
      </View>
    </>
  );
}
```

## Testing

### Test Cases
1. **No foods logged**: Empty state message
2. **All foods have scores**: Show all with grades
3. **Mixed (some with/without scores)**: Show both sections
4. **All E grades**: Dark red theme, "Avoid" label
5. **All A grades**: Green theme, "Best" label
6. **Compact mode**: No legend, minimal header

### Sample Test Data
```jsx
const testFoodLogs = [
  {
    id: 1,
    foodName: "Apple",
    calories: 95,
    nutriscore: "A"
  },
  {
    id: 2,
    foodName: "Coca-Cola",
    calories: 140,
    nutriscore: "E"
  },
  {
    id: 3,
    foodName: "Chicken Breast",
    calories: 165,
    nutriscore: "A"
  },
  {
    id: 4,
    foodName: "Pizza",
    calories: 250,
    nutriscore: null  // No score data
  }
];

<FoodNutriScoreCard foodLogs={testFoodLogs} compact={false} />
```

## Performance

- Memoized calculations (average grade)
- Filtered logs (with vs without scores)
- Scrollable list (not FlatList, to avoid nesting issues)
- No additional API calls

## Real Data Sources

Nutri-Scores come from:
1. **Open Food Facts API** - Most products have scores
2. **USDA Database** - Calculated from nutriments
3. **Manual entry** - User provides if available
4. **No data** - Shows "missing score" warning

## Next Steps

1. **Calendar Integration**: Add compact card to daily summary in calendar
2. **Weekly Trends**: Show average Nutri-Score over time
3. **Food Quality Insight**: "You logged mostly A-B foods this week"
4. **Shopping List**: Highlight low-Nutri-Score foods to avoid

## Questions?

See component JSDoc at top of `FoodNutriScoreCard.jsx` for detailed comments.
