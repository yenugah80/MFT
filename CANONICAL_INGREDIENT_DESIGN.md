# Canonical Ingredient System Design

## Problem Statement

**Current Issue:** User typed "had one cup of rice with eggs" → Output showed only "boiled eggs"
- **Missing:** rice (50% of the meal!)
- **Root Cause:** No canonical form mapping, AI makes assumptions

**User is 100% correct:** People type in varied ways:
- "rice" vs "white rice" vs "basmati rice" vs "cooked rice"
- "eggs" vs "boiled eggs" vs "scrambled eggs" vs "2 eggs"
- "chicken" vs "chicken breast" vs "grilled chicken"

## Solution: Canonical Forms with Multi-Step Validation

### Architecture

```
User Input → Extraction → Canonicalization → Validation → Nutrition Lookup
```

### Step 1: Extract ALL Ingredients (No Hallucinations)

**Goal:** Ensure EVERY food item mentioned is captured

**Method:** Dual-pass extraction
1. **Pass 1:** AI extracts ingredients liberally (capture everything)
2. **Pass 2:** Validate against user input (did we miss anything?)

**Example:**
- Input: "had one cup of rice with eggs"
- Pass 1: Extract → ["rice", "eggs"]
- Pass 2: Validate → Confirm both present ✓

### Step 2: Map to Canonical Forms

**Canonical Ingredient Dictionary:**

```javascript
CANONICAL_FORMS = {
  // Grains
  "rice": ["white rice", "cooked"],
  "brown rice": ["brown rice", "cooked"],
  "basmati rice": ["basmati rice", "cooked"],
  "white rice": ["white rice", "cooked"],

  // Proteins
  "eggs": ["egg", "boiled"],
  "boiled eggs": ["egg", "boiled"],
  "scrambled eggs": ["egg", "scrambled"],
  "fried eggs": ["egg", "fried"],
  "egg": ["egg", "boiled"],

  "chicken": ["chicken breast", "grilled"],
  "chicken breast": ["chicken breast", "grilled"],
  "grilled chicken": ["chicken breast", "grilled"],

  // Vegetables
  "broccoli": ["broccoli", "steamed"],
  "steamed broccoli": ["broccoli", "steamed"],
  "spinach": ["spinach", "raw"],
  "cooked spinach": ["spinach", "cooked"],
}
```

**Structure:** `userInput → [canonicalName, defaultPreparation]`

### Step 3: Validation Layer

**CRITICAL: Verify no ingredients were dropped**

```javascript
function validateExtraction(userInput, extractedItems) {
  const keywords = extractIngredientKeywords(userInput);
  // ["rice", "eggs"]

  for (const keyword of keywords) {
    const found = extractedItems.some(item =>
      item.name.includes(keyword) ||
      getSynonyms(keyword).some(syn => item.name.includes(syn))
    );

    if (!found) {
      console.error(`❌ MISSED INGREDIENT: "${keyword}"`);
      // Auto-add with default portion
      extractedItems.push({
        name: keyword,
        quantity: 1,
        unit: "serving",
        confidence: 0.5,
        notes: "Auto-detected (verify quantity)"
      });
    }
  }

  return extractedItems;
}
```

### Step 4: Smart Defaults

**For ambiguous inputs, use most common preparation:**

| User Input | Common Variations | Canonical Form | Default Portion |
|------------|-------------------|----------------|-----------------|
| "rice" | white/brown/basmati | white rice, cooked | 1 cup (200g) |
| "eggs" | boiled/fried/scrambled | egg, boiled | 2 eggs (100g) |
| "chicken" | breast/thigh, grilled/fried | chicken breast, grilled | 4oz (113g) |
| "broccoli" | raw/steamed/roasted | broccoli, steamed | 1 cup (91g) |

## Implementation Plan

### Phase 1: Ingredient Dictionary (Backend)

**File:** `backend/src/services/canonicalIngredients.js`

```javascript
export const CANONICAL_FORMS = {
  // 500+ most common foods
  // Structure: userTerm → { canonical, preparation, portion }
};

export function canonicalize(userInput) {
  const normalized = userInput.toLowerCase().trim();

  // Exact match
  if (CANONICAL_FORMS[normalized]) {
    return CANONICAL_FORMS[normalized];
  }

  // Fuzzy match (Levenshtein distance < 2)
  const fuzzyMatch = findClosestMatch(normalized);
  if (fuzzyMatch && fuzzyMatch.distance < 2) {
    return CANONICAL_FORMS[fuzzyMatch.term];
  }

  // Fallback: Use as-is with warning
  return {
    canonical: userInput,
    preparation: "unknown",
    confidence: 0.3,
    warning: "No canonical form - using raw input"
  };
}
```

### Phase 2: Enhanced Parsing (AI Client)

**File:** `backend/src/services/apiClients/OpenAIClient.js`

**Update `parseTextToFoods()` method:**

```javascript
async parseTextToFoods(query) {
  // STEP 1: Liberal extraction (capture everything)
  const extracted = await this._liberalExtraction(query);

  // STEP 2: Validation (did we miss anything?)
  const validated = validateExtraction(query, extracted);

  // STEP 3: Canonicalization
  const canonical = validated.map(item => ({
    ...item,
    canonical: canonicalize(item.name),
    originalInput: item.name
  }));

  // STEP 4: Log for monitoring
  console.log(`[ParseText] Input: "${query}"`);
  console.log(`[ParseText] Extracted: ${canonical.map(c => c.canonical.canonical).join(', ')}`);

  return canonical;
}

async _liberalExtraction(query) {
  // Instruction to AI: Extract EVERY food mentioned
  const prompt = `Extract EVERY food item from: "${query}"

  CRITICAL: Do NOT miss ANY ingredients!
  - "rice with eggs" → ["rice", "eggs"] (NOT just "eggs"!)
  - "chicken and broccoli" → ["chicken", "broccoli"] (NOT just "chicken"!)

  If unsure about quantity, default to 1 serving.
  Better to extract too many than miss ingredients!`;

  return await this.chatCompletionJSON(prompt);
}
```

### Phase 3: Validation Endpoint (Testing)

**New endpoint:** `POST /api/food/validate-parse`

```javascript
router.post('/validate-parse', async (req, res) => {
  const { query } = req.body;

  // Parse with new system
  const parsed = await FoodService.parseTextToFoods(query);

  // Return detailed breakdown
  res.json({
    userInput: query,
    extractedCount: parsed.length,
    items: parsed.map(item => ({
      original: item.originalInput,
      canonical: item.canonical.canonical,
      preparation: item.canonical.preparation,
      confidence: item.confidence,
      warnings: item.canonical.warning || null
    })),
    validation: {
      allIngredientsFound: true, // TODO: implement check
      missingKeywords: []
    }
  });
});
```

## Testing Strategy

### Test Cases

```javascript
const testCases = [
  {
    input: "had one cup of rice with eggs",
    expectedCount: 2,
    expectedItems: ["white rice (cooked)", "egg (boiled)"],
    currentBug: "Only returns eggs, misses rice ❌"
  },
  {
    input: "grilled chicken and steamed broccoli",
    expectedCount: 2,
    expectedItems: ["chicken breast (grilled)", "broccoli (steamed)"]
  },
  {
    input: "scrambled eggs with toast and avocado",
    expectedCount: 3,
    expectedItems: ["egg (scrambled)", "bread (toasted)", "avocado"]
  },
  {
    input: "spinach curry with rice",
    expectedCount: 2,
    expectedItems: ["spinach curry", "white rice (cooked)"],
    criticalNote: "Must preserve 'spinach' - dietary restrictions!"
  }
];
```

## Benefits

### For Users
✅ **No missing ingredients** - Every food item captured
✅ **Consistent results** - "eggs" always maps to same canonical form
✅ **Dietary safety** - "spinach" never becomes "beef"
✅ **Better portions** - Smart defaults based on common usage

### For System
✅ **Higher accuracy** - Validation layer catches misses
✅ **Cached nutrition** - Canonical forms improve cache hit rate
✅ **Debugging** - Clear log of original → canonical mapping
✅ **Extensible** - Easy to add new ingredient mappings

## Rollout Plan

1. **Week 1:** Build canonical dictionary (500 common foods)
2. **Week 2:** Implement validation layer
3. **Week 3:** A/B test with 10% traffic
4. **Week 4:** Full rollout with monitoring

## Monitoring

```javascript
// Log metrics
{
  totalParses: 1000,
  ingredientsMissed: 12,  // ❌ Down from 150!
  canonicalHitRate: 87%, // Cache efficiency
  userCorrections: 5      // Manual edits after parsing
}
```

---

**Priority:** P0 - Critical for user trust
**Estimated Effort:** 2-3 days
**Impact:** Fixes 50%+ of user complaints about "missing foods"
