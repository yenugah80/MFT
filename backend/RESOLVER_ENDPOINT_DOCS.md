# Nutrition Resolver API Documentation

## Endpoint: POST /api/food/resolve

Unified nutrition resolver for all input modalities (text, barcode, photo, voice).

### Base URL
```
http://localhost:5001/api/food/resolve
```

### Authentication
Requires `Authorization: Bearer <token>` header

---

## Request Format

### Common Parameters
```json
{
  "mode": "text" | "barcode" | "photo" | "voice",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" (optional),
  "userContext": { "goals": {}, "dietaryPrefs": {} } (optional)
}
```

### Mode-Specific Parameters

#### Text Mode
```json
{
  "mode": "text",
  "query": "grilled chicken breast with rice"
}
```

#### Barcode Mode
```json
{
  "mode": "barcode",
  "barcode": "3017620422003"
}
```

#### Photo Mode
```json
{
  "mode": "photo",
  "imageBase64": "base64_encoded_image_string"
}
```

#### Voice Mode
```json
{
  "mode": "voice",
  "query": "transcribed_text_from_audio"
}
```

---

## Response Format

### ResolvedMealDraft Structure

```json
{
  "draftId": "uuid-v4-string",
  "mode": "text" | "barcode" | "photo" | "voice",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "itemId": "uuid-v4-string",
      "name": "Grilled Chicken Breast",
      "portion": {
        "amount": 1,
        "unit": "serving",
        "gramsEquivalent": 180,
        "servingText": "1 breast (180g)",
        "isEstimated": false
      },
      "macros": {
        "calories_kcal": 284,
        "protein_g": 53.4,
        "carbs_g": 0,
        "fat_g": 6.2,
        "fiber_g": 0,
        "sugar_g": 0,
        "sodium_mg": 126
      },
      "micros": {
        "calcium": { "value": 20, "unit": "mg" },
        "iron": { "value": 1.2, "unit": "mg" },
        "potassium": { "value": 450, "unit": "mg" },
        "vitamin_a": { "value": 0, "unit": "µg" },
        "vitamin_c": { "value": 0, "unit": "mg" }
      },
      "ingredients": ["Chicken", "Salt", "Pepper"],
      "allergens": [],
      "scores": {
        "nutriScore": {
          "grade": "A",
          "score": -2,
          "isEstimated": false
        },
        "ecoScore": {
          "grade": "B",
          "isEstimated": false
        },
        "novaGroup": 1
      },
      "sourceEvidence": [
        {
          "source": "USDA",
          "sourceId": "174576",
          "confidence": 0.85,
          "fetchedAt": "2025-12-17T10:30:00Z",
          "fieldsProvided": ["macros", "micros"]
        }
      ],
      "flags": []
    }
  ],
  "totals": {
    "macros": {
      "calories_kcal": 284,
      "protein_g": 53.4,
      "carbs_g": 0,
      "fat_g": 6.2
    },
    "micros": {}
  },
  "dataQuality": {
    "status": "good",
    "confidence": 0.85,
    "reasons": []
  },
  "uiHints": {
    "highlightChips": [
      {
        "text": "High protein (53g)",
        "sentiment": "positive"
      }
    ],
    "gentleWarnings": [],
    "oneLineSummary": "Grilled Chicken Breast, 284 kcal"
  }
}
```

---

## Data Quality Status

### Status Values
- **`good`**: High confidence (≥0.7), complete nutrients, no estimation flags
- **`questionable`**: Medium confidence (0.5-0.7) OR portion estimated
- **`needs_review`**: Low confidence (<0.5) OR nutrients estimated OR parsing failed

### Item Flags
- `portion_estimated` - Portion size was estimated
- `estimated_nutrients` - Nutrition values are estimated (not from database)
- `incomplete_micros` - Micronutrient data incomplete
- `low_confidence` - Detection/matching confidence < 0.7

---

## Pipeline Logic

### Barcode Mode
1. **OpenFoodFacts lookup** (primary) → confidence: 0.9
2. **USDA fallback** (if nutrients incomplete) → confidence: 0.6
3. **Quality assessment** → status determination

### Text Mode
1. **OpenAI parsing** → extract food items with portions
2. **USDA search** (primary for generic foods) → confidence: 0.8
3. **Best match selection** → keyword matching + completeness
4. **Fallback** → empty macros + estimation flags

### Photo Mode
1. **OpenAI Vision** → detect foods + estimate portions
2. **USDA/OFF search** per detected food
3. **Confidence thresholds** → flag if < 0.7

---

## Example Requests

### Test Barcode (Nutella)
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mode": "barcode",
    "barcode": "3017620422003"
  }'
```

### Test Text (Multi-item)
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mode": "text",
    "query": "2 scrambled eggs with avocado toast",
    "mealType": "breakfast"
  }'
```

### Test Photo
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mode": "photo",
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

---

## Error Handling

### Error Response Format
```json
{
  "draftId": "uuid",
  "mode": "barcode",
  "mealType": null,
  "items": [],
  "totals": {
    "macros": { "calories_kcal": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 },
    "micros": {}
  },
  "dataQuality": {
    "status": "needs_review",
    "confidence": 0,
    "reasons": ["Product not found"]
  },
  "uiHints": {
    "highlightChips": [],
    "gentleWarnings": [
      {
        "title": "Resolution failed",
        "message": "Product not found",
        "actionable": false
      }
    ],
    "oneLineSummary": "No food detected"
  }
}
```

---

## Implementation Status

### ✅ Completed
- [x] Barcode mode resolver (OFF → USDA fallback)
- [x] Text mode resolver (OpenAI parse → USDA search)
- [x] Photo mode resolver (Vision → USDA lookup)
- [x] Voice mode support (via text pipeline)
- [x] ResolvedMealDraft canonical format
- [x] Source provenance tracking
- [x] Confidence scoring system
- [x] Data quality assessment
- [x] UI hints generation
- [x] FoodService helper methods (searchUSDAByName, parseTextToFoods)
- [x] Server route wiring
- [x] uuid package dependency

### ⏳ Next Steps (Frontend Integration)
- [ ] Update mobile app to call `/food/resolve` instead of direct analysis
- [ ] Create Review screen component
- [ ] Add source badges UI (USDA/OFF/Estimated)
- [ ] Implement portion editor
- [ ] Add confidence meter display
- [ ] Wire up to existing log flow

### 🔮 Future Enhancements
- [ ] In-memory caching (Redis/LRU cache for OFF/USDA)
- [ ] Batch resolution endpoint
- [ ] Nutrition reconciliation (AI estimate vs DB values)
- [ ] User feedback loop (confirm/reject suggestions)
- [ ] Offline support (cached common foods)

---

## Testing Checklist

- [ ] Test barcode mode with known product (e.g., Nutella: 3017620422003)
- [ ] Test text mode with single food
- [ ] Test text mode with multi-item query
- [ ] Test photo mode with food image
- [ ] Verify confidence scoring accuracy
- [ ] Check source provenance tracking
- [ ] Validate data quality assessment logic
- [ ] Test error handling (invalid barcode, unknown food)
- [ ] Verify UI hints generation
- [ ] Check performance with multiple concurrent requests
