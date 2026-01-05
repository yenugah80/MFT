# MyFoodTracker Output UX Specification

## Competitive Advantage: What We Do Differently

### 1. One-Input Multi-Item Analysis
- User says: "5 Indian vadas and chicken curry with rice"
- Competitors: Requires 3+ separate searches/entries
- **Us**: Instant breakdown of ALL items with ONE input

### 2. Ingredient-Level Transparency
- Competitors: "Chicken Curry - 500 cal" (black box)
- **Us**: Shows what's inside:
  ```
  Chicken Curry (500 cal)
  ├─ Chicken breast    200 cal
  ├─ Curry sauce       180 cal
  └─ Cooking oil       120 cal
  ```

### 3. Cooking Method Awareness
- Competitors: Ignore preparation method
- **Us**: "Fried (+50% cal)" vs "Steamed (base cal)"
  - Adjusts nutrition based on cooking method
  - Shows health impact

### 4. Regional Cuisine Native Support
- Competitors: Western-centric, poor Indian/Asian coverage
- **Us**: Built for global foods
  - South Indian: Vada, Dosa, Idli, Sambar
  - North Indian: Curry, Roti, Dal
  - Asian: Pho, Pad Thai, Sushi

### 5. Health Intelligence
- Competitors: Just numbers
- **Us**:
  - Health Score (0-100) with explanation
  - NutriScore (A-E)
  - Smart Tips for healthier swaps

### 6. Confidence Transparency
- Competitors: No indication of data quality
- **Us**: Clear badges
  - "Verified" - from trusted database
  - "AI Estimated" - ML prediction
  - Confidence percentage

---

## Unified Response Structure (All Modes)

```typescript
interface MealAnalysisResult {
  // Meal Summary
  mealId: string;
  inputText: string;           // Original user input
  inputMode: 'voice' | 'text' | 'photo' | 'barcode';
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  // Aggregated Totals (ALWAYS calculated by backend)
  totals: {
    calories: number;
    protein: number;          // grams
    carbs: number;            // grams
    fat: number;              // grams
    fiber: number;            // grams
    sugar: number;            // grams
    sodium: number;           // mg
  };

  // Health Assessment
  healthScore: number;        // 0-100
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
  healthAnalysis: string;     // "Protein-rich, high fiber, moderate sodium"

  // Individual Food Items
  items: FoodItem[];

  // Smart Recommendations
  suggestions: Suggestion[];

  // Data Quality
  dataQuality: {
    overallConfidence: number;  // 0-1
    source: 'verified' | 'ai_estimated' | 'user_added';
    verifiedItemsCount: number;
    estimatedItemsCount: number;
  };
}

interface FoodItem {
  itemId: string;
  name: string;                // "Indian Vada"
  displayName: string;         // "Indian Vada (×5)"
  quantity: number;            // 5
  unit: string;                // "piece" | "serving" | "g" | "cup"

  // Nutrition (for this item's total quantity)
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };

  // Per-unit nutrition (for quantity adjustments)
  perUnitNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };

  // Ingredient breakdown (our differentiator!)
  ingredients?: Ingredient[];

  // Cooking & Origin
  cookingMethod?: 'fried' | 'steamed' | 'grilled' | 'boiled' | 'baked' | 'raw';
  cuisine?: string;            // "South Indian"

  // Item-level health
  healthScore?: number;
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E';

  // Data quality
  confidence: number;          // 0-1
  source: 'usda' | 'openfoodfacts' | 'ai_estimated' | 'user_verified';
  isEstimated: boolean;
}

interface Ingredient {
  name: string;                // "Urad dal"
  amount: string;              // "1/2 cup"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Suggestion {
  type: 'healthier_swap' | 'portion_tip' | 'nutrition_insight';
  title: string;               // "Try steamed instead"
  description: string;         // "Swap fried vada for steamed idli to save 160 cal"
  calorieImpact?: number;      // -160
  healthScoreImpact?: number;  // +15
}
```

---

## UI Component Specification

### Meal Summary Card (Top Section)
```
┌─────────────────────────────────────────────┐
│ 🎤 Voice Input                              │
│ "5 Indian vadas and chicken curry"          │
├─────────────────────────────────────────────┤
│                                             │
│      🔥 1,340        ⚡ AI Analyzed          │
│         calories                            │
│                                             │
│   ┌──────┬──────┬──────┬──────┐            │
│   │  42g │  95g │  68g │  12g │            │
│   │ PRO  │ CARB │ FAT  │ FIB  │            │
│   └──────┴──────┴──────┴──────┘            │
│                                             │
│   Health: 72/100 ●●●●●●●○○○ Good           │
│   "Protein-rich, moderate oil content"      │
│                                             │
└─────────────────────────────────────────────┘
```

### Food Item Card (Expandable)
```
┌─────────────────────────────────────────────┐
│ 🥘 Indian Vada                     540 cal  │
│    ×5 pieces • Fried • South Indian         │
│    P: 15g  C: 45g  F: 32g                   │
│                                    [▼ More] │
├─────────────────────────────────────────────┤
│ INGREDIENTS:                                │
│  ├─ Urad dal (1 cup)              200 cal  │
│  ├─ Rice flour (1/2 cup)          180 cal  │
│  └─ Cooking oil                   160 cal  │
│                                             │
│ [- Qty +]  [Edit]  [Remove]                │
└─────────────────────────────────────────────┘
```

### Smart Suggestion Card
```
┌─────────────────────────────────────────────┐
│ 💡 Healthier Option                         │
│                                             │
│ Swap fried vadas → steamed idli             │
│ Save 160 cal • Health Score +15             │
│                                             │
│                            [Apply] [Dismiss]│
└─────────────────────────────────────────────┘
```

---

## Field Name Standardization

ALL modes MUST use these exact field names:

| Field | Type | Unit | Notes |
|-------|------|------|-------|
| `calories` | number | kcal | NOT calories_kcal |
| `protein` | number | g | NOT protein_g |
| `carbs` | number | g | NOT carbs_g |
| `fat` | number | g | NOT fat_g or fats |
| `fiber` | number | g | NOT fiber_g |
| `sugar` | number | g | NOT sugar_g |
| `sodium` | number | mg | NOT sodium_mg |

---

## Backend Response Standardization

### Before (Inconsistent)
```javascript
// Voice returned:
{ macros: { calories_kcal: 500, protein_g: 30 } }

// Photo returned:
{ calories: 500, protein: 30 }

// Text returned:
{ macros: { calories_kcal: 500, protein_g: 30 } }
```

### After (Unified)
```javascript
// ALL modes return:
{
  totals: { calories: 500, protein: 30, carbs: 45, fat: 20, fiber: 5, sugar: 8, sodium: 400 },
  items: [{
    name: "Chicken Curry",
    quantity: 1,
    unit: "serving",
    nutrition: { calories: 500, protein: 30, carbs: 45, fat: 20, fiber: 5, sugar: 8, sodium: 400 },
    perUnitNutrition: { calories: 500, protein: 30, ... },
    ingredients: [...],
    cookingMethod: "simmered",
    cuisine: "Indian",
    healthScore: 72,
    confidence: 0.85,
    source: "ai_estimated"
  }],
  healthScore: 72,
  nutriScore: "B",
  healthAnalysis: "Good protein content, moderate fat",
  suggestions: [{
    type: "healthier_swap",
    title: "Reduce oil",
    description: "Ask for less oil to save 80 calories",
    calorieImpact: -80
  }],
  dataQuality: {
    overallConfidence: 0.85,
    source: "ai_estimated",
    verifiedItemsCount: 0,
    estimatedItemsCount: 1
  }
}
```

---

## Implementation Checklist

### Backend Changes
- [ ] Create unified response builder function
- [ ] Update /voice/process to use unified structure
- [ ] Update /food/resolve to use unified structure
- [ ] Update /food/analyze-image to use unified structure
- [ ] Add ingredient breakdown to AI prompts
- [ ] Add smart suggestions generator
- [ ] Calculate totals server-side for ALL modes

### Frontend Changes
- [ ] Create MealSummaryCard component
- [ ] Create FoodItemCard component (with ingredient expansion)
- [ ] Create SuggestionCard component
- [ ] Create unified result handler for all modes
- [ ] Remove field name normalization hacks
- [ ] Add health score visualization

---

---

## Dashboard & Calendar Views (Minimal Design)

### Today's Nutrition Card
```
┌────────────────────────┐
│ 1,840 / 2,200 cal  🟢  │
│ P: 125g  C: 180g  F: 65g│
└────────────────────────┘
```

### Meals List
```
Breakfast  520 cal
Lunch      680 cal
Dinner     ─ cal
```

### Week View (Calendar)
```
M  T  W  T  F  S  S
🟢 🟢 🟡 🟢 🔴 🟢 ──
```

### Day Detail (Tap)
```
Jan 5 • 2,050 cal
P: 142g  C: 195g  F: 58g
```

---

## Sources & Research

Based on research from:
- [Kimola Customer Feedback Analysis](https://kimola.com/blog/understanding-calorie-tracking-and-nutrition-apps-through-customer-feedback-analysis)
- [Best Food Tracking Apps 2025](https://fitia.app/learn/article/best-food-tracking-apps-2025-complete-guide/)
- [Cronometer vs MyFitnessPal](https://www.gemmasampson.com/blog/cronometer-vs-myfitnesspal)
- [Reddit AI Calorie Counter Discussion](https://foodbuddy.my/blog/the-best-ai-calorie-counter-apps-according-to-reddit)
