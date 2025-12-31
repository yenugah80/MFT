# Integration Testing Guide

## Overview

This guide documents how to test the regional multimodal food analysis system end-to-end. Testing covers all 4 input modes (voice, photo, text, barcode) with regional context.

**Test Scope:**
- ✅ Regional preference storage and retrieval
- ✅ All analysis modes (voice, photo, text, barcode)
- ✅ Multimodal input (photo + voice combination)
- ✅ Ingredients breakdown display
- ✅ Database caching and cost optimization
- ✅ User verification and crowdsourcing

---

## Prerequisites

### Environment Setup

```bash
# 1. Start all services
# PostgreSQL
brew services start postgresql

# MongoDB
brew services start mongodb-community

# 2. Verify connections
# PostgreSQL
psql -U postgres -d myfoodtracker -c "SELECT COUNT(*) FROM profiles;"

# MongoDB
mongosh --eval "db.adminCommand('ping')"

# 3. Run migrations
npm run db:migrate
node backend/src/db/migrations/mongodb-0001-ai-estimated-food.js

# 4. Start backend
npm run dev (from backend directory)

# 5. Start frontend
npm run dev (from mobile directory)
```

---

## Test Suite 1: Regional Preferences

### Test 1.1: Profile Creation with Regional Preferences

**Objective:** Verify user can set regional preferences

**Steps:**
1. Open app → Profile tab
2. Tap "Edit Profile"
3. Fill in preferences:
   - Cuisine: "South Indian"
   - Region: "India"
   - Cooking Style: "home-style"
4. Tap "Save"

**Expected Result:**
- ✅ Profile saved successfully
- ✅ Preferences appear in AsyncStorage
- ✅ Preferences persisted on app restart

**Verification:**
```javascript
// In mobile app console
import AsyncStorage from '@react-native-async-storage/async-storage';
const profile = await AsyncStorage.getItem('@user_profile');
console.log(JSON.parse(profile).cuisinePreference);
// Expected: ['South Indian']
```

### Test 1.2: Regional Preferences Sync with Backend

**Objective:** Verify preferences sent to backend on analysis

**Steps:**
1. Set preferences: "American" cuisine, "USA" region
2. Log food via voice: "Burger and fries"
3. Check network tab in DevTools

**Expected Result:**
- ✅ API request includes `cuisinePreference: "American"`, `region: "USA"`
- ✅ Food analyzed as American-style burger (higher fat, calories)
- ✅ Confidence score reflects American cuisine

**Network Request:**
```json
{
  "text": "Burger and fries",
  "cuisinePreference": "American",
  "region": "USA",
  "mealType": "lunch"
}
```

---

## Test Suite 2: Voice Logging

### Test 2.1: Simple Food Voice Logging

**Objective:** Voice logging works for simple foods from local dictionary

**Steps:**
1. Open Log tab
2. Tap 🎤 microphone
3. Speak: "Two eggs scrambled"
4. Tap STOP
5. Confirm transcription
6. Wait for analysis

**Expected Result:**
- ✅ Transcription shows "Two eggs scrambled" (or similar)
- ✅ Analysis <100ms (from local dictionary)
- ✅ Shows: 2 x eggs, ~155 cal, 13g protein
- ✅ Source: "local_dictionary"

**Verify Timing:**
```
[Voice] Recording: ~2 seconds
[Voice] Transcription: ~50ms (local)
[Voice] Analysis: <50ms (cache hit)
Total: ~2 seconds
```

### Test 2.2: Complex Recipe Voice Logging

**Objective:** Voice logging works for complex dishes via OpenAI

**Steps:**
1. Speak: "Paneer tikka masala with rice and naan"
2. Tap STOP → Confirm
3. Wait for OpenAI analysis

**Expected Result:**
- ✅ Transcription correct
- ✅ Analysis shows 2-4 seconds (OpenAI processing)
- ✅ Breakdown shows 3 items:
  - Paneer tikka masala
  - Basmati rice
  - Naan bread
- ✅ Each item has macros + confidence
- ✅ Source: "ai_estimate" (first time) or "db_cache" (subsequent)

**Verify in Database:**
```sql
-- PostgreSQL: Check food_log entry
SELECT voice_transcript, source, ai_model, ai_confidence
FROM food_log
WHERE voice_transcript LIKE '%tikka%'
LIMIT 1;

-- Expected:
-- voice_transcript: "Paneer tikka masala with rice and naan"
-- source: "voice" or "multimodal"
-- ai_model: "gpt-4o" (complex) or "gpt-4o-mini" (simple)
-- ai_confidence: 0.85-0.95
```

---

## Test Suite 3: Photo Logging

### Test 3.1: Photo Logging Without Voice

**Objective:** Photo analysis works independently

**Steps:**
1. Open Log tab
2. Tap 📷 camera
3. Take/select photo of food
4. Tap "Analyze" without voice

**Expected Result:**
- ✅ Photo uploaded successfully
- ✅ Backend detects food items
- ✅ Ingredients breakdown shown
- ✅ Confidence >80%

**Expected Fields:**
```json
{
  "source": "photo",
  "items": [{
    "name": "rice",
    "quantity": 1,
    "unit": "cup",
    "calories": 206,
    "ingredients": [
      { "name": "rice", "amount": "1 cup", "calories": 206, "protein": 4, "carbs": 45 }
    ]
  }]
}
```

### Test 3.2: Multimodal (Photo + Voice)

**Objective:** Voice description improves photo analysis

**Steps:**
1. Take photo of a dish
2. Tap "Add Voice Description"
3. Speak: "This is homemade curry, not restaurant style"
4. Tap STOP → "Analyze Photo"

**Expected Result:**
- ✅ Voice description recorded
- ✅ Photo + voice sent together
- ✅ Analysis reflects voice context
  - Lower oil/butter (homemade vs restaurant)
  - Adjusted portion size
  - Regional context applied
- ✅ `multimodalSource.hasVoice = true`

**Verify in Database:**
```sql
-- Check multimodal_source
SELECT multimodal_source, voice_transcript, ingredients_breakdown
FROM food_log
WHERE multimodal_source IS NOT NULL
LIMIT 1;

-- Expected:
-- multimodal_source: {"hasVoice": true, "voiceTranscript": "..."}
-- voice_transcript: "This is homemade curry, not restaurant style"
-- ingredients_breakdown: [...array of items...]
```

---

## Test Suite 4: Barcode Scanning

### Test 4.1: Live Barcode Scan

**Objective:** Barcode scanning works from camera

**Steps:**
1. Open Log tab
2. Tap 📊 barcode scanner
3. Point at product barcode (e.g., cereal box)
4. Align within frame
5. Wait for scan

**Expected Result:**
- ✅ Barcode detected instantly
- ✅ Product identified
- ✅ Nutrition data loaded
- ✅ Modal closes automatically

### Test 4.2: Barcode Photo Upload Fallback

**Objective:** Can upload photo if camera fails

**Steps:**
1. Tap barcode scanner
2. Tap "Or Upload Photo" button
3. Select photo of product from library
4. Tap "Analyze Photo"

**Expected Result:**
- ✅ Photo preview shown
- ✅ "Analyze Photo" button active
- ✅ Backend attempts barcode extraction
- ✅ Falls back to product image analysis if no barcode
- ✅ Shows nutrition data

---

## Test Suite 5: Ingredients Breakdown

### Test 5.1: Ingredients Display in Voice Logs

**Objective:** Voice logs show ingredient breakdown

**Steps:**
1. Log via voice: "Vegetable biryani"
2. Look at results

**Expected Result:**
- ✅ "Ingredients" section visible
- ✅ Can tap to expand/collapse
- ✅ Shows each ingredient:
  - Name: "Basmati rice"
  - Amount: "1.5 cups"
  - Calories: 310
  - Macros: P 6g, C 67g, F 0.5g
- ✅ Total calories = sum of all ingredients

### Test 5.2: Ingredients Display in Photo Logs

**Objective:** Photo logs show ingredient breakdown

**Steps:**
1. Upload photo of salad
2. Check results

**Expected Result:**
- ✅ Ingredients section shows:
  - Lettuce (25 cal)
  - Tomato (20 cal)
  - Cucumber (15 cal)
  - Olive oil (120 cal)
  - Dressing (80 cal)
- ✅ Total = 260 cal
- ✅ Each item clickable (expand for more details)

---

## Test Suite 6: Regional Variations

### Test 6.1: Regional-Specific Nutrition

**Objective:** Same food has different nutrition for different regions

**Setup:**
- Profile 1: "South Indian" cuisine, "India" region
- Profile 2: "American" cuisine, "USA" region

**Steps:**
1. Profile 1 logs: "Chicken curry"
2. Note calories/macros
3. Switch to Profile 2
4. Log: "Chicken curry"
5. Compare results

**Expected Result:**
- ✅ South Indian curry:
  - Higher coconut oil content
  - Less butter/cream
  - Spices-focused
  - Example: 350 cal, 25g protein

- ✅ American curry:
  - More cream/butter
  - Less spices
  - Example: 450 cal, 28g protein

**Verify in MongoDB:**
```javascript
db.ai_estimated_foods.find({
  name: /curry/i,
  $or: [
    { region: "India", cuisine: "South Indian" },
    { region: "USA", cuisine: "American" }
  ]
}).pretty();

// Expected: Different confidence, calories, regional metadata
```

### Test 6.2: Cooking Method Impact

**Objective:** Cooking method affects nutrition estimates

**Steps:**
1. Set region: "USA", style: "restaurant"
2. Log: "Fried chicken"
3. Note: ~400 cal
4. Change to "home-style"
5. Log: "Fried chicken" again
6. Compare

**Expected Result:**
- ✅ Restaurant fried: 400+ cal (deep fried in oil)
- ✅ Home-style fried: 300+ cal (less oil)
- ✅ Both marked with `cookingMethod: "fried"`

---

## Test Suite 7: Caching & Performance

### Test 7.1: First-Time Analysis (Cache Miss)

**Objective:** First unique food hits OpenAI

**Steps:**
1. Clear cache: `AsyncStorage.removeItem('@analysis_cache')`
2. Log: "Masala dosa" (uncommon food)
3. Measure time

**Expected Result:**
- ✅ Time: 2-4 seconds (OpenAI API call)
- ✅ Source: "ai_estimate"
- ✅ Stored in MongoDB

**Check MongoDB:**
```javascript
db.ai_estimated_foods.findOne({
  sourceQuery: /dosa/i,
  cuisine: "South Indian"
});
// Should exist with accessCount: 1
```

### Test 7.2: Subsequent Analysis (Cache Hit)

**Objective:** Same food uses database cache

**Steps:**
1. Immediately log: "Masala dosa" again
2. Measure time

**Expected Result:**
- ✅ Time: <200ms (database query)
- ✅ Source: "db_cache"
- ✅ accessCount increased to 2

**Check MongoDB:**
```javascript
db.ai_estimated_foods.findOne({
  sourceQuery: /dosa/i,
  cuisine: "South Indian"
});
// accessCount should be 2 or more
```

### Test 7.3: Smart Model Routing

**Objective:** Simple foods use cheaper model

**Setup:**
- Monitor OpenAI API requests in backend logs

**Steps:**
1. Log: "Two eggs" (simple)
2. Check logs for model used
3. Log: "Tandoori chicken with mint chutney" (complex)
4. Check logs again

**Expected Result:**
- ✅ "Two eggs" → "gpt-4o-mini" (~$0.00015)
- ✅ Complex dish → "gpt-4o" (~$0.002)
- ✅ Local dictionary → no API call

**Check Backend Logs:**
```
[AI] Query: "Two eggs" → Complexity: simple → Model: gpt-4o-mini
[AI] Query: "Tandoori chicken..." → Complexity: regional → Model: gpt-4o
[Cache] Hit: masala dosa (accessCount: 5)
```

---

## Test Suite 8: User Verification

### Test 8.1: User Confirms Food Accuracy

**Objective:** Users can verify food estimates

**Steps:**
1. Log food via voice: "Paneer butter masala"
2. See results with confidence: 0.85
3. Tap "Verify This" or "Edit & Verify"
4. Confirm: "Yes, this looks accurate"

**Expected Result:**
- ✅ Verification recorded
- ✅ Confidence increases: 0.85 → 0.87
- ✅ isVerified status updates if 3+ confirmations

**Backend Verification:**
```javascript
// POST /api/food/verify-nutrition
{
  foodId: "507f1f77bcf86cd799439011",
  verified: true,
  region: "India",
  cuisine: "South Indian"
}

// Response:
{
  "success": true,
  "newConfidence": 0.87,
  "verificationCount": 3
}
```

### Test 8.2: User Corrects Food Estimate

**Objective:** Users can improve estimates

**Steps:**
1. See food with confidence: 0.75
2. Tap "Edit & Verify"
3. Adjust: "Actually 450 calories, not 400"
4. Tap "Submit Correction"

**Expected Result:**
- ✅ Correction recorded
- ✅ Food updated if >10% difference
- ✅ Confidence recalculated
- ✅ Regional accuracy tracked

---

## Test Suite 9: UI/UX

### Test 9.1: Loading States

**Objective:** UI shows appropriate feedback

**Steps:**
1. Voice log "Complex dish"
2. Observe modal states:
   - Recording → Transcription → Analyzing → Success

**Expected Result:**
- ✅ "Analyzing Nutrition..." spinner shown
- ✅ Success checkmark appears
- ✅ Modal auto-closes after 800ms

### Test 9.2: Error Handling

**Objective:** Errors handled gracefully

**Steps:**
1. Log food with backend off
2. Observe error message

**Expected Result:**
- ✅ "Failed to analyze food" notification
- ✅ Food remains in list (not deleted)
- ✅ Can retry without re-speaking

### Test 9.3: Regional UI Consistency

**Objective:** UI reflects regional context

**Steps:**
1. Set cuisine: "South Indian"
2. Check log screen

**Expected Result:**
- ✅ Food items show regional context indicators
- ✅ Cooking method shown (if available)
- ✅ Cuisine badge visible

---

## Performance Benchmarks

### Expected Times

| Operation | Time | Max Acceptable |
|-----------|------|-----------------|
| Voice transcription (local) | 50ms | 100ms |
| Simple food analysis (local) | <50ms | 100ms |
| Complex food analysis (OpenAI) | 2-4s | 5s |
| Cached analysis | <200ms | 500ms |
| Photo upload | 1-2s | 3s |
| Barcode scan | <1s | 2s |
| Ingredients display | <100ms | 200ms |

### Expected Costs

| Scenario | Cost | Expected |
|----------|------|----------|
| 100 users, 10 logs/day | Monthly cost | <$100 |
| Simple foods (60%) | gpt-4o-mini | $0.15/1M tokens |
| Complex foods (40%) | gpt-4o | $2.50/1M tokens |
| Cache hit rate | Save 70% | Cost/user ↓ |

---

## Regression Testing

### Critical Paths to Test Before Release

1. **Food Logging**
   - [ ] Voice without app restart
   - [ ] Photo with/without voice
   - [ ] Barcode scan fallback
   - [ ] Text input still works

2. **Regional Context**
   - [ ] Profile preferences saved
   - [ ] Preferences used in analysis
   - [ ] Regional caching works
   - [ ] Fallback works without profile

3. **Display**
   - [ ] Ingredients shown correctly
   - [ ] Totals calculated correctly
   - [ ] Progress bars updated
   - [ ] History persists

4. **Performance**
   - [ ] No memory leaks
   - [ ] Cache working (2nd log faster)
   - [ ] Database queries <200ms
   - [ ] API calls tracked in logs

---

## Test Execution Checklist

### Before Beta Launch

- [ ] All 9 test suites completed
- [ ] No critical bugs found
- [ ] Performance benchmarks met
- [ ] Migrations run successfully
- [ ] Database verification passed
- [ ] Cost calculations verified
- [ ] Error messages user-friendly
- [ ] No console errors/warnings

### Load Testing (Optional)

```bash
# Simulate 10 concurrent users
npm run test:load --users 10 --duration 300

# Expected:
# - <5% error rate
# - P95 latency <2s
# - No memory growth
```

---

## Reporting Issues

**Bug Report Template:**

```markdown
## Issue: [Brief title]

### Reproduce Steps
1. ...
2. ...
3. ...

### Expected
...

### Actual
...

### Environment
- Device: iPhone 14 Pro / Android
- App Version: 1.5.0
- OS Version: iOS 17 / Android 14
- Network: WiFi / 4G

### Logs
[Paste relevant logs]
```

---

## Success Criteria

✅ All tests pass
✅ No critical bugs
✅ Performance meets benchmarks
✅ Regional features work correctly
✅ Multimodal input working
✅ Caching effective (>70% hit rate)
✅ Cost optimization verified
✅ User experience smooth
✅ Ready for 100-user beta

---

**Last Updated:** 2025-12-31
**Test Status:** Ready to execute
