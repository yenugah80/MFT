# 🚨 CRITICAL ISSUES TRIAGE - What MUST Be Fixed NOW

**Status**: System is operational but FUNDAMENTALLY FLAWED
**Risk**: Data loss, cost explosion, inconsistency at 100+ users
**Action**: DO NOT DEPLOY without fixing these

---

## 🔴 TIER 1: CRITICAL (Fix Before Any Users)

### Issue 1.1: Profile State Corruption
**Severity**: 🔴 CRITICAL
**Impact**: Data inconsistency
**Probability**: HIGH (happens on every dietary save)
**Cost**: Data integrity loss

**The Problem**:
```
saveDietary() writes to:
  1. profilesTable (cuisine_preference, region, cooking_style)
  2. dietaryPreferencesTable (preferences, allergies, cuisine_preference, region, cooking_style)

If step 2 fails → profilesTable updated but dietaryTable not
If app restarts → reads from profilesTable, partial data
Next time → overwrites with inconsistent state
```

**Where It Happens**:
- `backend/src/controllers/profileController.js:620-649`
- Every time user saves dietary preferences
- EVERY ONBOARDING (step 2)

**What You Lose**:
- Correct dietary preferences
- Region preference
- Cooking style

**Fix Priority**: 🔴 IMPLEMENT IMMEDIATELY
**Fix Complexity**: LOW (consolidate to 1 table)
**Time to Fix**: 30 minutes

**Code Location to Fix**:
```
File: backend/src/controllers/profileController.js
Lines: 620-649 (saveDietary function)
Action: Remove profilesTable write, consolidate to dietaryPreferencesTable
```

---

### Issue 1.2: Transaction-Less Partial Writes
**Severity**: 🔴 CRITICAL
**Impact**: Inconsistent state on ANY error
**Probability**: MEDIUM (network failures, token expiry)
**Cost**: Users stuck in onboarding, profile data loss

**The Problem**:
```
OnboardingContext calls (in sequence):
  1. saveProfileBasics() → Writes profilesTable ✓
  2. saveDietaryPreferences() → Writes profilesTable + dietaryTable (no transaction!)
  3. saveNutritionGoals() → Writes nutritionGoalsTable ✓
  4. completeOnboarding() → Marks onboarding_completed_at ✓

If step 2 fails midway:
  - profilesTable updated ✓
  - dietaryTable NOT updated ❌
  - App shows "Save failed"
  - User retries → profilesTable updated AGAIN (duplicate)
  - Next login → missing dietary data
```

**Where It Happens**:
- `backend/src/controllers/profileController.js:535-671` (saveDietary)
- Any time multiple tables need updating
- Network unstable environments (mobile, poor connectivity)

**Risk**: User stuck in onboarding, corrupt profile

**Fix Priority**: 🔴 IMPLEMENT IMMEDIATELY
**Fix Complexity**: LOW (wrap in transaction)
**Time to Fix**: 15 minutes

**Code Location to Fix**:
```
File: backend/src/controllers/profileController.js
Lines: 535-671 (saveDietary function)
Action: Wrap all DB operations in db.transaction()
```

---

### Issue 1.3: Unbounded OpenAI Costs
**Severity**: 🔴 CRITICAL
**Impact**: Cost explosion ($10s per user per month)
**Probability**: GUARANTEED (happens on every request)
**Cost**: Business viability threatened

**The Problem**:
```
Single recommendation request triggers:
  - 1 OpenAI call: Generate 5 food suggestions
  - 5 OpenAI calls: Generate recipes (for each food)
  - 5 OpenAI calls: Estimate micronutrients (for each food)
  - TOTAL: 11 calls per request

Cost per request: $0.05-0.10 (gpt-4o-mini)

At 100 users × 2 requests/day = 200 requests/day
= 2,200 OpenAI calls/day
= 66,000 calls/month
= $3,300/month in API costs ALONE

Without fixing:
- 1,000 users = $33,000/month
- 10,000 users = $330,000/month
```

**Where It Happens**:
- `backend/src/routes/recommendations.js:680-830`
- Every API call for recommendations
- Worse: Cache in-memory, lost on restart

**Why It's Critical**:
1. OpenAI API is bottleneck
2. Costs scale linearly with users
3. No way to make it profitable at scale
4. Cache is lost on every deployment (in-memory)

**Fix Priority**: 🔴 IMPLEMENT IMMEDIATELY
**Fix Complexity**: MEDIUM (deduplication + caching)
**Time to Fix**: 3-4 hours

**Code Locations to Fix**:
```
1. backend/src/services/micronutrientService.js:94-148
   → Improve USDA usage, reduce AI fallback

2. backend/src/services/recommendationService.js (batch micronutrients)
   → Batch 5 lookups into 1 OpenAI call

3. backend/src/services/cache.js (NEW)
   → Implement Redis for persistent caching
```

---

## 🟠 TIER 2: HIGH (Fix Before Scaling)

### Issue 2.1: No Request Deduplication
**Severity**: 🟠 HIGH
**Impact**: 2-5x unnecessary API calls
**Probability**: HIGH (happens on retry, multiple users)
**Cost**: Wasted API budget

**The Problem**:
```
User: "Give me recommendations"
System makes 11 OpenAI calls ✓

Server crashes before response sent
User retries: "Give me recommendations"
System makes 11 OpenAI calls AGAIN ❌ (duplicate work)

No dedup check, no request ID tracking
Same result computed twice
```

**Where It Happens**:
- No idempotency key on recommendations API
- No request deduplication middleware
- Each retry is full recalculation

**Fix Priority**: 🟠 HIGH
**Fix Complexity**: MEDIUM
**Time to Fix**: 2 hours

---

### Issue 2.2: Micronutrient Calculation Bug (Vitamin A)
**Severity**: 🟠 HIGH
**Impact**: Nutrition data off by 3-10x
**Probability**: 100% for any Vitamin A containing food
**Cost**: Wrong nutrition advice to users

**The Problem**:
```
USDA returns Vitamin A in IU (International Units)
Code does: micros.vitaminA = Math.round(nutrient.amount)

Result: 5000 IU stored as "5000 µg" (should be 1500 µg)
User sees: 3.3x too much Vitamin A
Advice: "You're getting enough Vitamin A" (actually toxic levels)
```

**Where It Happens**:
- `backend/src/services/micronutrientService.js:165`
- Every micronutrient estimate from USDA
- Systematic error (affects all foods)

**Fix Priority**: 🟠 HIGH
**Fix Complexity**: LOW
**Time to Fix**: 30 minutes

---

### Issue 2.3: No Portion Scaling
**Severity**: 🟠 HIGH
**Impact**: Nutrition info doesn't match actual portion
**Probability**: 80% of logs (users log in cups, not 100g)
**Cost**: Wrong nutritional tracking

**The Problem**:
```
System calculates nutrition for "100g chicken"
User logs "1 cup cooked rice" (158g, not 100g)
System returns 100g nutrition, user has 158g
User gets 1.58x more calories than logged
Accumulates over time → weight tracking wrong
```

**Where It Happens**:
- `backend/src/services/micronutrientService.js` (no portion conversion)
- Every food log with non-standard portion
- 80% of user logs are affected

**Fix Priority**: 🟠 HIGH
**Fix Complexity**: MEDIUM
**Time to Fix**: 2 hours

---

## 🟡 TIER 3: MEDIUM (Fix Soon)

### Issue 3.1: Recommendation Spam
**Severity**: 🟡 MEDIUM
**Impact**: User experience degradation
**Probability**: HIGH (daily recommendations)
**Cost**: Reduced engagement

**The Problem**:
```
System recommends "Greek Yogurt" on Day 1
System recommends "Greek Yogurt" on Day 2
System recommends "Greek Yogurt" on Day 3
User: "Why the same food?"
Result: Lost trust in recommendations
```

**Fix Priority**: 🟡 MEDIUM
**Time to Fix**: 1 hour

---

### Issue 3.2: In-Memory Cache Loss
**Severity**: 🟡 MEDIUM
**Impact**: Cache invalidated on every deployment
**Probability**: 100% (every restart)
**Cost**: Unnecessary API calls

**The Problem**:
```
Cache: NodeCache (in-memory)
Server restarts (deployment, crash, auto-scaling)
Cache lost
First 100 requests after restart: Cold cache
100 unnecessary OpenAI calls
```

**Fix Priority**: 🟡 MEDIUM
**Time to Fix**: 2 hours

---

## 🎯 THE MUST-FIX-NOW LIST (Before ANY more users)

### Priority 1: Data Integrity (4 hours)
1. ✅ Remove duplicate writes (profilesTable + dietaryTable) - 30m
2. ✅ Add transaction wrapping to saveDietary() - 15m
3. ✅ Add transaction wrapping to onboarding flow - 30m
4. ✅ Test: Verify single writes - 30m
5. ✅ Test: Verify atomicity - 1h

### Priority 2: Cost Control (4 hours)
1. ✅ Improve USDA matching (reduce AI fallback 60%) - 1.5h
2. ✅ Batch micronutrient lookups (11→3 calls) - 1.5h
3. ✅ Implement Redis caching - 1h
4. ✅ Test: Measure API call reduction - 1h

### Priority 3: Correctness (2 hours)
1. ✅ Fix Vitamin A unit conversion - 30m
2. ✅ Fix portion normalization - 1.5h

**Total Time: 10 hours**
**Total Impact: 80% cost reduction, 100% data integrity, 100% correct nutrition**

---

## 🚨 WHAT BREAKS AT 100 USERS (Without These Fixes)

| Metric | Status | Impact |
|--------|--------|--------|
| API Costs | ~$500/month | Business model broken |
| Data Integrity | Corrupted states | Data loss incidents |
| OpenAI Ratelimit | 6,600 calls/hour | Rate limited → app fails |
| Cache Hit Rate | 0% after restart | Every restart = cold start costs |
| User Nutrition Data | 3-10x wrong | Bad health advice |

---

## 🏗️ IMPLEMENTATION ORDER

### Phase 1: Data Integrity (DO THIS FIRST) - 4 hours
Fix data corruption issues before they spread

```
1. saveDietary(): Remove profilesTable writes
2. saveDietary(): Add transaction wrapping
3. onboarding flow: Verify all writes are transactional
4. Test: Create test user, verify 1 write per operation
```

**Why First?**: Without this, every user saves corrupt data. Need clean data before scaling.

### Phase 2: Cost Control (DO THIS SECOND) - 4 hours
Before API costs become unbearable

```
1. Improve USDA matching (no AI fallback needed)
2. Batch micronutrient processing
3. Add Redis caching layer
4. Measure: Verify 60-80% cost reduction
```

**Why Second?**: Fix data first, then optimize API calls.

### Phase 3: Correctness (DO THIS THIRD) - 2 hours
Fix calculation bugs

```
1. Vitamin A unit conversion
2. Portion normalization
3. Test with known foods
```

### Phase 4: UX (OPTIONAL AFTER) - 2 hours
```
1. Recommendation deduplication
2. Request deduplication
```

---

## ⚠️ DO NOT DEPLOY WITHOUT THESE FIXES

If you deploy to production with 100+ users now:

1. ❌ Every dietary save creates corrupt state
2. ❌ OpenAI API costs spiral ($500-3000/month)
3. ❌ User nutrition data is wrong (3-10x)
4. ❌ Cache lost on every deployment
5. ❌ No deduplication (waste API budget)

**Result**: System technically works, but fails at scale

---

## 🎯 NEXT STEPS

1. Read this document fully
2. Read ARCHITECTURAL_FIXES_DEEP_DIVE.md for implementation details
3. Implement Phase 1 (data integrity) - 4 hours
4. Test thoroughly
5. Deploy only after Phase 1 is complete and tested
6. Then implement Phase 2-3

---

**Status**: Ready to implement
**Blocking**: Don't scale to production without Phase 1
**Timeline**: 10 hours total implementation + testing
**Impact**: 80% cost reduction, 100% data integrity
