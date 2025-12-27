# USDA Verification Guide

## Current Status: DISABLED ⏸️

**As of 2025-12-27**, USDA verification is **disabled** to validate OpenAI-only accuracy and build user trust.

**Reason:**
- Production logs show 0% USDA usage (all foods resolved via OpenAI + cache)
- OpenAI with temperature=0.0 provides deterministic, reliable estimates
- Simplifies architecture while we validate performance

---

## How It Works Now (OpenAI-Only Mode)

```
User logs food → Check 24hr cache
                 ↓ (cache miss)
              OpenAI estimates nutrition
                 ↓
              ✅ Use OpenAI result (always)
                 ↓
              Cache for 24 hours
```

**All foods** are now resolved with OpenAI, regardless of confidence level.

---

## Re-Enabling USDA Verification

When ready to re-enable USDA as a verification layer (e.g., after validating OpenAI accuracy):

### Step 1: Set Environment Variable

In your `.env` file or hosting platform (Render.com):

```bash
ENABLE_USDA_VERIFICATION=true
```

### Step 2: Ensure USDA API Key is Set

Make sure you have a valid USDA API key (not DEMO_KEY):

```bash
USDA_API_KEY=your-actual-usda-api-key-here
```

**Get your key:** https://fdc.nal.usda.gov/api-key-signup.html

### Step 3: Restart Backend

```bash
npm start
```

That's it! USDA verification is now active.

---

## How It Works (With USDA Enabled)

```
User logs food → Check 24hr cache
                 ↓ (cache miss)
              OpenAI estimates nutrition
                 ↓
         Is ingredient-specific? (spinach, chicken, tofu)
         ├─ YES → Use OpenAI ✅
         └─ NO → Is confidence >= 60%?
                 ├─ YES → Use OpenAI ✅
                 └─ NO → Try USDA verification
                         ├─ Found → Use USDA ✅ (95% confidence)
                         └─ Not found → Use OpenAI anyway ✅
```

**USDA triggers only for:**
- Generic foods (not ingredient-specific)
- Low confidence (<60%) from OpenAI
- Estimated 5-10% of requests

---

## Monitoring OpenAI-Only Performance

### Key Metrics to Track

1. **User Complaints**
   - Target: <5% of users report accuracy issues
   - Source: Support tickets, feedback forms

2. **OpenAI Confidence Distribution**
   ```bash
   # Check confidence levels in logs
   grep "Using OpenAI" backend/logs/*.log | grep -oP 'confidence.*?%'
   ```
   - Target: 80%+ of foods have >70% confidence

3. **API Costs**
   ```bash
   # Check daily costs
   curl -H "Authorization: Bearer $TOKEN" https://myfoodtracker.onrender.com/api/metrics
   ```
   - Target: <$50/month

4. **Cache Hit Rate**
   - Target: >80% (current: ~90%+)
   - Check via `/api/metrics` endpoint

### When to Re-Enable USDA

Consider re-enabling USDA if:
- ❌ User accuracy complaints exceed 5%
- ❌ Many foods have <60% confidence
- ❌ Specific food categories (e.g., obscure brands) consistently fail
- ✅ You want authoritative verification for regulatory compliance

### When to Keep Disabled

Keep USDA disabled if:
- ✅ User feedback is positive
- ✅ Most foods have >70% confidence
- ✅ Cache hit rate remains high (fewer API calls needed)
- ✅ No major accuracy issues reported

---

## Technical Details

### Files Modified

1. **`backend/.env.example`** - Added `ENABLE_USDA_VERIFICATION` flag
2. **`backend/src/services/smartNutritionResolver.js`**
   - Line 21: Feature flag declaration
   - Line 67: Check flag before USDA verification
   - Lines 70-74: Log reason for using OpenAI

### Code Location

**Feature Flag:**
```javascript
// Line 21 of smartNutritionResolver.js
const ENABLE_USDA_VERIFICATION = process.env.ENABLE_USDA_VERIFICATION === 'true';
```

**Decision Logic:**
```javascript
// Line 67 of smartNutritionResolver.js
const shouldTrustOpenAI = !ENABLE_USDA_VERIFICATION || hasSpecificIngredient || openAIResult.confidence >= 60;
```

### Rollback Safety

All USDA code remains intact - this is a **soft disable** via feature flag, not a deletion.

**Rollback time:** <1 minute (just set env variable and restart)

---

## Cost Analysis

### Current (OpenAI-Only)

- **OpenAI:** $0.000334/request (cached = $0)
- **USDA:** $0/request (disabled)
- **Estimated monthly:** <$10 (based on high cache hit rate)

### With USDA Enabled

- **OpenAI:** $0.000334/request (cached = $0)
- **USDA:** $0/request (free tier, but rate limited)
- **Estimated monthly:** <$15 (slight increase due to USDA API overhead)

**Savings:** Minimal cost difference, but lower operational complexity without USDA.

---

## Decision Timeline

- **Now → Week 2:** Monitor OpenAI-only performance
- **Week 2:** Review metrics, user feedback
- **Decision Point:** Keep disabled or re-enable USDA

**Champion:** Team decision based on data

---

## Questions?

**Q: Will this affect accuracy?**
A: Unlikely. OpenAI with temperature=0.0 is deterministic and trained on USDA data. Production logs show it's already handling 100% of requests successfully.

**Q: What if OpenAI goes down?**
A: The app will show errors (same as before). USDA wouldn't help since it only triggers after OpenAI succeeds with low confidence.

**Q: Can we A/B test this?**
A: Yes! Set `ENABLE_USDA_VERIFICATION=true` for 10% of requests via load balancer or feature flag service.

**Q: How do we measure success?**
A: Track user complaints, confidence distribution, and costs. If metrics are good after 2 weeks, keep USDA disabled permanently.

---

**Last Updated:** 2025-12-27
**Status:** OpenAI-only mode active ✅
**Next Review:** 2 weeks from deployment
