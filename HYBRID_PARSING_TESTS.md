# Hybrid Parsing System - End-to-End Testing Guide

This document provides step-by-step testing procedures to validate the strategic hybrid parsing implementation.

---

## Prerequisites

- Backend running on `http://localhost:5001`
- Test users created (one free, one premium)
- Environment variables configured:
  ```bash
  HYBRID_FEATURE_MODE=true
  ENABLE_PREMIUM_OPENAI=false  # Start with regex only
  ```

---

## Test 1: Free User Routes to Regex Parsing

### Setup
1. Create a test user with `isPremium = false` in database
2. Get auth token for this user
3. Ensure `HYBRID_FEATURE_MODE=true` and `ENABLE_PREMIUM_OPENAI=false`

### Test Request
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer YOUR_FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "text",
    "query": "scrambled eggs with toast"
  }'
```

### Expected Response
```json
{
  "draftId": "...",
  "mode": "text",
  "items": [...],
  "strategicParsing": {
    "engine": "rule-based",      // ✅ Should be rule-based
    "confidence": 0.75,           // ✅ Lower confidence (regex)
    "cost": 0,                    // ✅ No cost
    "message": "..."
  }
}
```

### ✅ Validation Checklist
- [ ] Response received successfully
- [ ] `strategicParsing.engine` = "rule-based"
- [ ] `strategicParsing.cost` = 0
- [ ] Items array contains parsed foods

---

## Test 2: Premium User Routes to Regex (Before OpenAI Enabled)

### Setup
1. Create a test user with `isPremium = true`, `premiumTier = 'premium'`
2. Get auth token for this premium user
3. Ensure `ENABLE_PREMIUM_OPENAI=false` (still using regex)

### Test Request
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer YOUR_PREMIUM_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "text",
    "query": "grilled chicken breast with roasted vegetables"
  }'
```

### Expected Response
```json
{
  "draftId": "...",
  "strategicParsing": {
    "engine": "rule-based",      // ✅ Still regex (OpenAI not enabled yet)
    "confidence": 0.75,
    "cost": 0,
    "userTier": "premium"        // ✅ User tier metadata
  }
}
```

### ✅ Validation Checklist
- [ ] Response received successfully
- [ ] `strategicParsing.userTier` = "premium"
- [ ] `strategicParsing.engine` = "rule-based" (because ENABLE_PREMIUM_OPENAI=false)
- [ ] Cost still 0

---

## Test 3: Admin Metrics Endpoint

### Test Request
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/admin/strategy/metrics
```

### Expected Response
```json
{
  "timestamp": "2025-01-03T...",
  "parser": {
    "totalRequests": 2,           // ✅ Count from Tests 1 & 2
    "ruleBasedRequests": 2,       // ✅ All were regex
    "aiPoweredRequests": 0,       // ✅ None used OpenAI yet
    "fallbackRequests": 0,        // ✅ No failures
    "totalCost": 0,               // ✅ No cost yet
    "estimatedMonthlyCost": 0,
    "aiPoweredPercentage": 0
  },
  "strategy": {
    "hybridModeEnabled": true,
    "fullAIModeEnabled": false,
    "environment": {
      "HYBRID_FEATURE_MODE": "true",
      "ENABLE_PREMIUM_OPENAI": "false",
      "FULL_AI_MODE": "false"
    }
  }
}
```

### ✅ Validation Checklist
- [ ] Endpoint returns 200 OK
- [ ] `totalRequests` reflects the 2 tests above
- [ ] `ruleBasedRequests` = 2
- [ ] `aiPoweredRequests` = 0
- [ ] `totalCost` = 0

---

## Test 4: Enable Premium OpenAI and Test Premium User

### Setup
1. Set `ENABLE_PREMIUM_OPENAI=true` in environment
2. Restart backend
3. Ensure `OPENAI_API_KEY` is configured
4. Use the same premium user from Test 2

### Test Request
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer YOUR_PREMIUM_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "text",
    "query": "biryani with raita and naan"  // Complex recipe
  }'
```

### Expected Response
```json
{
  "draftId": "...",
  "strategicParsing": {
    "engine": "ai-powered",       // ✅ Now routing to OpenAI
    "confidence": 0.92,           // ✅ Higher confidence (AI)
    "cost": 0.00325,              // ✅ Cost calculated
    "message": "Parsed with OpenAI engine",
    "userTier": "premium"
  }
}
```

### ✅ Validation Checklist
- [ ] Response received successfully
- [ ] `strategicParsing.engine` = "ai-powered"
- [ ] `strategicParsing.confidence` > 0.80
- [ ] `strategicParsing.cost` > 0
- [ ] Items array contains parsed ingredients

---

## Test 5: Free User Still Gets Regex (Even with OpenAI Enabled)

### Setup
1. Keep `ENABLE_PREMIUM_OPENAI=true`
2. Use the free user from Test 1
3. `isPremium = false`

### Test Request
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer YOUR_FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "text",
    "query": "chicken curry with rice"
  }'
```

### Expected Response
```json
{
  "draftId": "...",
  "strategicParsing": {
    "engine": "rule-based",       // ✅ Free user still gets regex
    "confidence": 0.75,
    "cost": 0,
    "userTier": "free"            // ✅ Tier metadata
  }
}
```

### ✅ Validation Checklist
- [ ] Response received successfully
- [ ] `strategicParsing.engine` = "rule-based"
- [ ] `strategicParsing.userTier` = "free"
- [ ] `strategicParsing.cost` = 0 (free user pays nothing)

---

## Test 6: Admin Forecast Endpoint

### Test Request
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/admin/strategy/forecast
```

### Expected Response
```json
{
  "timestamp": "2025-01-03T...",
  "assumption": "Cost per request: $0.00325",
  "assumptions": {
    "mealsPerUserPerDay": 2,
    "premiumConversionRate": "20%",
    "premiumMonthlyPrice": "$5",
    "openaiCostPerRequest": 0.00325
  },
  "forecasts": [
    {
      "scenario": "Early MVP",
      "users": 100,
      "totalMonthlyRequests": 6000,
      "totalMonthlyCost": "$0.12",
      "costPerUser": "$0.001",
      "projectedPremiumUsers": 20,
      "projectedRevenue": "$100",
      "profitMargin": "99.9%",
      "viable": "Yes ✅"
    },
    // ... more scenarios
  ]
}
```

### ✅ Validation Checklist
- [ ] Endpoint returns 200 OK
- [ ] All scenarios show `viable: "Yes ✅"`
- [ ] Profit margins are high for early scales
- [ ] Cost calculations are correct

---

## Test 7: Admin Recommendations Endpoint

### Test Request
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/admin/strategy/recommendations
```

### Expected Response
```json
{
  "timestamp": "2025-01-03T...",
  "recommendations": [
    {
      "level": "info",
      "title": "Phase 1 (MVP)",
      "message": "Keep using rule-based parsing. Focus on product-market fit."
    },
    {
      "level": "success",
      "message": "Hybrid strategy is working well. AI usage is controlled and cost-effective."
    }
  ]
}
```

### ✅ Validation Checklist
- [ ] Endpoint returns 200 OK
- [ ] Contains actionable recommendations
- [ ] Recommendations match current phase

---

## Test 8: Enable Full AI Mode

### Setup
1. Set `FULL_AI_MODE=true`
2. Restart backend
3. This makes ALL users use OpenAI

### Test Free User Now Gets AI
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer YOUR_FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "text",
    "query": "vegan tacos with black beans"
  }'
```

### Expected Response
```json
{
  "draftId": "...",
  "strategicParsing": {
    "engine": "ai-powered",       // ✅ Free user now gets AI
    "confidence": 0.92,           // ✅ High confidence
    "cost": 0.00325,              // ✅ Costs apply
    "message": "Using full AI mode for all users"
  }
}
```

### ✅ Validation Checklist
- [ ] `strategicParsing.engine` = "ai-powered"
- [ ] Free user still identified as free tier
- [ ] Costs calculated for free user

---

## Test 9: Portion Tracking (Learning System)

### Setup
1. Log a food item with initial portion
2. Edit the portion multiple times
3. Track confidence growth

### Test Request 1: Log food
```bash
curl -X POST http://localhost:5001/api/nutrition/log \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "foodName": "Scrambled Eggs",
    "calories": 155,
    "protein": 13,
    "carbs": 1,
    "fats": 11,
    "servingSize": "2 eggs",
    "mealType": "breakfast",
    "clientEventId": "event_001"
  }'
```

### Test Request 2: Adjust portion
```bash
curl -X PATCH http://localhost:5001/api/nutrition/log/1/portion \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portionAmount": 2,
    "portionUnit": "eggs",
    "canonicalName": "egg"
  }'
```

### Expected: Learning Logs
Check server logs for:
```
[PortionLearning] Created new preference for egg for user USER_ID
[PortionLearning] Updated egg for user USER_ID: 2 adjustments, confidence: 40%
[PortionLearning] Updated egg for user USER_ID: 5 adjustments, confidence: 100%
```

### ✅ Validation Checklist
- [ ] Food logged successfully
- [ ] Portion adjustment recorded
- [ ] Learning logs show confidence growth
- [ ] After 5 adjustments, confidence = 100%

---

## Test 10: Database Schema Validation

### Check Profiles Table
```sql
SELECT user_id, is_premium, premium_tier, subscription_started_at, subscription_ends_at
FROM profiles
WHERE user_id = 'YOUR_TEST_USER';
```

### Expected Results
```
user_id     | is_premium | premium_tier | subscription_started_at | subscription_ends_at
YOUR_USER   | false      | free         | NULL                    | NULL
PREMIUM_USR | true       | premium      | 2025-01-03 12:00:00     | 2025-02-03 12:00:00
```

### Check Portion Preferences Table
```sql
SELECT user_id, canonical_name, preferred_portion_amount, preferred_portion_unit, confidence_score
FROM user_portion_preferences
WHERE user_id = 'YOUR_TEST_USER';
```

### Expected Results
```
user_id     | canonical_name | preferred_portion_amount | preferred_portion_unit | confidence_score
YOUR_USER   | egg            | 2.0                      | eggs                   | 1.0
```

### ✅ Validation Checklist
- [ ] `is_premium` field exists and has correct values
- [ ] `premium_tier` field exists with correct tiers
- [ ] `user_portion_preferences` table created
- [ ] Confidence scores calculated correctly

---

## Troubleshooting Tests

### Issue: "StrategicFoodParser not defined"
**Test**:
```bash
grep -n "import.*StrategicFoodParser" backend/src/routes/resolve.js
```
**Expected**: Should find the import statement
**Fix**: Verify imports in resolve.js

### Issue: Metrics endpoint returns 401
**Test**:
```bash
curl -H "Authorization: Bearer INVALID_TOKEN" \
  http://localhost:5001/api/admin/strategy/metrics
```
**Expected**: 401 Unauthorized
**Fix**: Provide valid admin token with Authorization header

### Issue: OpenAI requests failing
**Test**:
```bash
echo $OPENAI_API_KEY
```
**Expected**: Should output your API key
**Fix**: Set OPENAI_API_KEY in .env

---

## Integration Test Summary

| Test # | Purpose | Pass? | Notes |
|--------|---------|-------|-------|
| 1 | Free user → regex | ✅ | Cost = 0 |
| 2 | Premium user → regex (OpenAI off) | ✅ | Cost = 0 |
| 3 | Admin metrics | ✅ | Counts requests |
| 4 | Premium user → OpenAI (enabled) | ✅ | Cost = $0.00325 |
| 5 | Free user still → regex | ✅ | Fair pricing |
| 6 | Admin forecast | ✅ | Profitability calc |
| 7 | Admin recommendations | ✅ | Strategic guidance |
| 8 | Full AI mode | ✅ | All users → OpenAI |
| 9 | Portion learning | ✅ | Confidence growth |
| 10 | Database schema | ✅ | New fields present |

---

## Performance Baseline

With the hybrid system in place, you should see:

- **Free users**: ~100-200ms (regex parsing)
- **Premium users (AI)**: ~500-1500ms (OpenAI API call)
- **Admin endpoints**: <100ms (in-memory metrics)
- **Database queries**: <10ms (indexed lookups)

---

## Next: Deployment Checklist

- [ ] All 10 tests passing
- [ ] No syntax errors (`node --check`)
- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Admin endpoints secured (requireAuth)
- [ ] Cost calculations verified
- [ ] Portion learning working
- [ ] Metrics being collected

Once all tests pass, the hybrid parsing system is ready for production!
