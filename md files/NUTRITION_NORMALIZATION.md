# Nutrition Data Normalization - Production Architecture

## Overview

This document explains how MyFoodTracker processes nutrition data from multiple sources (text, voice, photo, barcode) and normalizes it into a consistent format for storage and display.

## Multi-Modal Input Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT METHODS                        │
├─────────────┬──────────────┬─────────────┬─────────────────┤
│    TEXT     │    VOICE     │    PHOTO    │    BARCODE      │
└──────┬──────┴──────┬───────┴──────┬──────┴────────┬─────────┘
       │             │              │               │
       ▼             ▼              ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│                   ANALYSIS LAYER                              │
├──────────────┬──────────────┬─────────────┬──────────────────┤
│   Multi-     │   Whisper +  │   GPT-4o    │  Open Food      │
│   Source     │   GPT-4o     │   Vision    │  Facts API      │
│   Cascade    │   API        │   API       │                 │
└──────┬───────┴──────┬───────┴──────┬──────┴──────┬───────────┘
       │              │               │             │
       └──────────────┴───────────────┴─────────────┘
                          │
                          ▼
             ┌─────────────────────────┐
             │  NORMALIZATION ENGINE   │
             └────────────┬────────────┘
                          │
                          ▼
             ┌─────────────────────────┐
             │   UNIFIED DATA FORMAT   │
             └────────────┬────────────┘
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
           ┌──────────┐      ┌──────────┐
           │  SQLite  │      │ Dashboard│
           │  Storage │      │  Display │
           └──────────┘      └──────────┘
```

## Data Flow by Input Type

### 1. TEXT INPUT

**Sources (Priority Order):**
1. Open Food Facts (2.8M+ products)
2. USDA FoodData Central (400K+ verified)
3. GPT-4o (complex meals)

**Flow:**
```javascript
User Types: "200g grilled chicken, brown rice, broccoli"
    ↓
Detect: Multi-item meal (3 foods)
    ↓
Try Open Food Facts:
  - "grilled chicken" → Match found ✓
  - "brown rice" → Match found ✓
  - "broccoli" → Match found ✓
    ↓
Normalize portions:
  - chicken: 200g → scale nutrition from 100g base
  - rice: "default" → assume 150g (1 cup cooked)
  - broccoli: "default" → assume 100g
    ↓
Return structured array:
[
  {
    itemId: "off-chicken-123",
    name: "Grilled Chicken Breast",
    portion: { amount: 200, unit: "g" },
    macros: { calories_kcal: 330, protein_g: 62, ... },
    sourceEvidence: [{ source: "Open Food Facts", confidence: 0.95 }]
  },
  // ... rice, broccoli
]
```

**Normalization Rules:**
- All values scaled to actual portion size
- Missing values → `null` (not 0, to indicate no data)
- Confidence score based on source quality
- Preserve unit information (g, ml, oz, cup, etc.)

### 2. VOICE INPUT

**Technology:**
- Whisper API: Speech → Text (99.3% accuracy)
- GPT-4o: Text → Nutrition data

**Flow:**
```javascript
User Speaks: "I had a turkey sandwich with lettuce and tomato"
    ↓
Record Audio: 44.1kHz, AAC, mono
    ↓
Validate Quality:
  - Duration: ≥ 500ms
  - File size: 5KB - 5MB
    ↓
Upload to Backend → Whisper API
    ↓
Transcript: "i had a turkey sandwich with lettuce and tomato"
    ↓
GPT-4o Extracts:
  - Food items: ["turkey sandwich", "lettuce", "tomato"]
  - Portions: ["1 sandwich", "default", "default"]
  - Nutrition estimate with confidence
    ↓
Backend Returns:
{
  transcript: "i had a turkey sandwich with lettuce and tomato",
  foodName: "Turkey Sandwich with Lettuce & Tomato",
  servingSize: "1 sandwich (200g)",
  calories: 350,
  protein: 28,
  carbs: 32,
  fat: 12,
  fiber: 4,
  sugar: 5,
  confidence: 0.82,
  model: "gpt-4o"
}
    ↓
Normalize → Store
```

**Normalization Rules:**
- Transcript preserved for user verification
- User can edit transcript before confirming
- Confidence score displayed prominently
- Low confidence (<0.7) → warning shown

### 3. PHOTO INPUT

**Technology:**
- GPT-4o Vision: Multi-modal image understanding

**Flow:**
```javascript
User Captures Photo: Meal on plate
    ↓
Optimize Image:
  - Resize: max 1024px width
  - Compress: 80% JPEG quality
  - Size reduction: ~70%
    ↓
Validate Quality:
  - Min size: 10KB
  - Max size: 10MB
    ↓
Upload to Backend → GPT-4o Vision
    ↓
Vision Analysis:
  - Identify foods: ["grilled salmon", "quinoa", "asparagus"]
  - Estimate portions: ["150g", "1 cup", "6 spears"]
  - Calculate nutrition
  - Confidence per item
    ↓
Backend Returns:
{
  items: [
    {
      name: "Grilled Salmon",
      portion: { amount: 150, unit: "g" },
      macros: { calories_kcal: 280, protein_g: 35, ... },
      confidence: 0.88
    },
    // ... quinoa, asparagus
  ],
  totals: { calories_kcal: 520, ... },
  confidence: 0.85
}
    ↓
Normalize → Store
```

**Normalization Rules:**
- Vision confidence typically lower than barcode (0.7-0.9)
- User shown preview with edit option
- Portion estimates may be adjusted by user

### 4. BARCODE SCAN

**Technology:**
- Open Food Facts API (highest accuracy)

**Flow:**
```javascript
User Scans: Barcode "0123456789012"
    ↓
Lookup in Open Food Facts:
  - Direct product match
  - Official nutrition label data
    ↓
Product Found:
{
  code: "0123456789012",
  product_name: "Organic Whole Milk",
  serving_size: "240ml",
  nutriments: {
    "energy-kcal_100g": 150,
    "proteins_100g": 8,
    "carbohydrates_100g": 12,
    "fat_100g": 8,
    // ... all micros
  }
}
    ↓
Normalize:
  - Base: per 100g
  - User specifies actual serving (e.g., "1 cup = 240ml")
  - Scale all values proportionally
    ↓
Store with highest confidence (0.95)
```

**Normalization Rules:**
- Barcode = highest confidence (0.95)
- Official nutrition label data
- Comprehensive micronutrients included
- User can adjust serving size

## Unified Data Format

### Core Structure

```javascript
{
  // IDENTIFIERS
  id: Number,                    // Database ID (server-assigned)
  clientEventId: String,         // Client UUID for deduplication
  timestamp: Number,             // Unix timestamp (ms)

  // FOOD INFO
  foodName: String,              // Display name
  servingSize: String,           // "200g" | "1 cup" | "2 slices"
  mealType: String,              // "breakfast" | "lunch" | "dinner" | "snack"

  // MACRONUTRIENTS (required)
  calories: Number | null,       // kcal
  protein: Number | null,        // grams
  carbs: Number | null,          // grams
  fat: Number | null,            // grams
  fiber: Number | null,          // grams
  sugar: Number | null,          // grams
  netCarbs: Number | null,       // calculated: carbs - fiber

  // MICRONUTRIENTS (optional, object format)
  micros: {
    [nutrientName]: {
      value: Number,             // Amount
      unit: String,              // "mg" | "mcg" | "IU"
      dv: Number | null          // Daily Value %
    }
  },

  // METADATA
  source: String,                // "text" | "voice" | "photo" | "barcode"
  confidence: Number,            // 0.0 - 1.0
  model: String,                 // "gpt-4o" | "whisper" | "off" | "usda"

  // SYNC STATUS
  status: String,                // "pending" | "synced" | "failed"
  userId: String,                // Clerk user ID
}
```

### Normalization Rules

#### 1. Missing Values
```javascript
// GOOD ✓
{
  calories: 200,
  protein: 25,
  carbs: null,    // Missing data
  fat: 10
}

// BAD ✗
{
  calories: 200,
  protein: 25,
  carbs: 0,       // Implies zero carbs (wrong!)
  fat: 10
}
```

**Why:** `null` indicates "no data available" vs `0` which means "zero grams". This matters for UI display and calculations.

#### 2. Precision Levels
```javascript
// Calories: No decimals
calories: 250      // ✓
calories: 250.5    // ✗

// Macros: Max 1 decimal
protein: 25.6      // ✓
protein: 25.67     // ✗

// Micros: Max 1 decimal
micros: {
  calcium: { value: 150.5, unit: "mg" }  // ✓
}
```

**Why:** Tufte principle - don't show false precision. Nutrition data isn't accurate to 0.01g.

#### 3. Net Carbs Calculation
```javascript
function calculateNetCarbs(nutrition) {
  const carbs = nutrition.carbs;
  const fiber = nutrition.fiber;

  // Both must be present
  if (carbs === null || carbs === undefined) return null;
  if (fiber === null || fiber === undefined) return carbs; // No fiber data

  // Formula: Total Carbs - Fiber
  const netCarbs = carbs - fiber;

  // Can't be negative
  return Math.max(0, netCarbs);
}
```

#### 4. Unit Conversions
```javascript
const CONVERSION_TABLE = {
  // Weight
  'g': 1,
  'kg': 1000,
  'oz': 28.35,
  'lb': 453.59,

  // Volume
  'ml': 1,
  'l': 1000,
  'cup': 240,
  'tbsp': 15,
  'tsp': 5,

  // Standard
  'serving': 100,  // FDA default
  'piece': 100,
  'item': 100,
};

function convertToGrams(amount, unit) {
  const multiplier = CONVERSION_TABLE[unit.toLowerCase()];
  if (!multiplier) return null; // Unknown unit

  return amount * multiplier;
}
```

#### 5. Confidence Scoring

```javascript
// Barcode (highest - official label data)
confidence: 0.95

// Open Food Facts (high - verified database)
confidence: 0.90

// USDA (high - government verified)
confidence: 0.88

// Voice/Photo with clear input (good)
confidence: 0.80

// Complex multi-item meals (medium)
confidence: 0.70

// AI estimates with uncertainty (low)
confidence: 0.60
```

**UI Display:**
- ≥ 0.80: Green "High Confidence"
- 0.60-0.79: Yellow "Good Confidence"
- < 0.60: Red "Low Confidence" + allow edit

## Aggregation & Display

### Daily Totals Calculation

```javascript
function calculateDailyTotals(logs) {
  // Deduplicate by clientEventId
  const uniqueLogs = dedupeLogs(logs);

  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    netCarbs: 0,
    micros: {},
  };

  uniqueLogs.forEach(log => {
    // Macros: sum all
    totals.calories += log.calories || 0;
    totals.protein += log.protein || 0;
    totals.carbs += log.carbs || 0;
    totals.fat += log.fat || 0;
    totals.fiber += log.fiber || 0;
    totals.sugar += log.sugar || 0;

    // Micros: sum all with proper units
    if (log.micros) {
      Object.entries(log.micros).forEach(([name, data]) => {
        if (!totals.micros[name]) {
          totals.micros[name] = {
            value: 0,
            unit: data.unit,
            dv: data.dv
          };
        }
        totals.micros[name].value += data.value || 0;
      });
    }
  });

  // Calculate net carbs from totals
  totals.netCarbs = calculateNetCarbs(totals);

  return totals;
}
```

### Dashboard Display Format

```javascript
// Tufte Principles Applied:
// 1. Show the data (no chartjunk)
// 2. Use small multiples for comparison
// 3. Maximize data-ink ratio

{
  // PRIMARY: Calories (largest visual weight)
  calories: {
    value: 1850,
    goal: 2000,
    percentage: 92.5,
    status: "good"  // "under" | "good" | "over"
  },

  // SECONDARY: Macros (progress bars)
  macros: [
    {
      name: "Protein",
      value: 125,
      goal: 150,
      unit: "g",
      color: "#8B5CF6",
      percentage: 83
    },
    // ... carbs, fat, fiber
  ],

  // TERTIARY: Micros (top 6 most important)
  micros: [
    {
      name: "Calcium",
      value: 850,
      unit: "mg",
      dv: 1000,
      percentage: 85
    },
    // ... vitamin D, iron, etc.
  ],

  // CONTEXT: Trends
  trends: {
    weeklyAverage: 1920,
    streak: 7,
    improvement: "+5%"
  }
}
```

## Database Storage

### SQLite Schema

```sql
CREATE TABLE food_logs (
  -- Primary Key
  local_id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Server ID (null until synced)
  id INTEGER,

  -- User & Deduplication
  userId TEXT NOT NULL,
  clientEventId TEXT UNIQUE NOT NULL,

  -- Food Info
  foodName TEXT NOT NULL,
  servingSize TEXT,
  mealType TEXT,
  timestamp INTEGER NOT NULL,

  -- Macros (direct columns for fast queries)
  calories REAL,
  protein REAL,
  carbs REAL,
  fat REAL,
  fiber REAL,
  sugar REAL,
  netCarbs REAL,

  -- Metadata & Micros (JSON)
  data_json TEXT,  -- Full data including micros

  -- Sync
  status TEXT DEFAULT 'pending',

  -- Indices
  INDEX idx_user_timestamp (userId, timestamp DESC),
  INDEX idx_status (status),
  INDEX idx_client_event (clientEventId)
);
```

### Why This Schema?

1. **Direct columns for macros** → Fast aggregation queries
2. **JSON column for micros** → Flexible schema for 20+ nutrients
3. **clientEventId unique constraint** → Automatic deduplication
4. **Composite index (userId, timestamp)** → Fast daily queries
5. **Status index** → Fast sync queue queries

## API Contract

### Backend Expected Format

```javascript
// POST /food/resolve (text/photo)
// POST /nutrition/voice-log (voice)

// REQUEST
{
  mode: "text" | "image" | "voice",
  query: String | base64 | audioFile,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  userId: String
}

// RESPONSE
{
  // Single item (barcode, simple text)
  foodName: String,
  servingSize: String,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  fiber: Number,
  sugar: Number,
  micros: Object,
  confidence: Number,
  model: String,

  // OR multi-item (complex meals)
  items: [
    {
      itemId: String,
      name: String,
      portion: { amount: Number, unit: String },
      macros: { ... },
      micros: { ... },
      confidence: Number
    }
  ],
  totals: { ... }
}
```

## Best Practices

### 1. Always Preserve Original Data
```javascript
// Store both processed and raw data
{
  foodName: "Grilled Chicken Breast",  // Processed
  servingSize: "200g",                   // Normalized
  calories: 330,                         // Scaled

  // Original for reference
  _meta: {
    originalInput: "200g chicken",
    sourceData: { ... },                 // Raw API response
    processingSteps: [ ... ]             // Audit trail
  }
}
```

### 2. Never Aggregate Prematurely
```javascript
// BAD ✗ - Backend returns total for multi-item meal
{
  foodName: "Chicken salad with dressing",  // Combined!
  calories: 450                             // Total!
}

// GOOD ✓ - Backend returns items array
{
  items: [
    { name: "Grilled chicken", calories: 200 },
    { name: "Mixed greens", calories: 50 },
    { name: "Caesar dressing", calories: 200 }
  ]
}
```

### 3. Show Uncertainty
```javascript
// Display confidence prominently
<ConfidenceBadge value={0.75}>
  Good Confidence (75%)
</ConfidenceBadge>

// Allow user to edit when uncertain
{confidence < 0.8 && (
  <EditButton>Adjust Values</EditButton>
)}
```

### 4. Graceful Degradation
```javascript
// Handle missing data gracefully
const protein = meal.protein ?? null;

// UI shows "--" instead of "0"
<MacroValue>
  {protein !== null ? `${protein}g` : '--'}
</MacroValue>
```

## Testing Checklist

- [ ] Text input with single food → correct normalization
- [ ] Text input with multi-item meal → items array returned
- [ ] Voice with clear audio → high confidence (>0.8)
- [ ] Voice with mumbled audio → low confidence (<0.7)
- [ ] Photo of clear meal → portion estimates reasonable
- [ ] Photo of ambiguous food → user can edit
- [ ] Barcode scan → exact nutrition match
- [ ] Missing micros → stored as null, UI shows "--"
- [ ] Duplicate logs → deduplicated by clientEventId
- [ ] Offline mode → queued and synced later
- [ ] Very large values → validated and capped
- [ ] Unicode food names → stored correctly
- [ ] Emoji in transcripts → handled properly

---

**Last Updated:** December 2025
**Version:** 2.0 Production
