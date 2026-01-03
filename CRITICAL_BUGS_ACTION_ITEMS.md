# 🔴 CRITICAL BUGS - ACTION ITEMS
**DO NOT DEPLOY** without fixing these

---

## PRIORITY 1: SECURITY VULNERABILITIES (Fix Today)

### Bug #1: CORS Allows All Origins ⚠️ CRITICAL SECURITY
**File:** `backend/src/server.js:147`
**Issue:** `origin: "*"` allows CSRF attacks and token theft
**Impact:** HIGH - Any website can call your API and steal user data

**Quick Fix:**
```javascript
// CHANGE THIS:
cors({
  origin: "*",  // ❌ INSECURE
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
})

// TO THIS:
cors({
  origin: [
    'https://yourdomain.com',
    'https://yourapp.expo.dev',
    'https://myfoodtracker.onrender.com'
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
})
```

**Test:** `curl -H "Origin: https://evil.com" https://yourapi.com/api/health` → Should get 403

---

### Bug #2: Auth Middleware Mismatch ⚠️ CRITICAL
**File:** `backend/src/routes/consent.js:13`
**Issue:** Uses `authMiddleware` but unclear if it's the same as `requireAuth`
**Impact:** CRITICAL - Potential auth bypass

**Quick Fix:**
```javascript
// VERIFY consent.js uses SAME middleware as server.js
// Option 1: Check they're identical
import { requireAuth } from '../middleware/auth.js';
router.get('/status', requireAuth, async (req, res) => { ... });

// Option 2: If requireAuth doesn't work for this, verify authMiddleware
// imports the same auth check
```

**Test:** Call `/api/consent/status` WITHOUT Authorization header → Should get 401

---

### Bug #3: No User Ownership Validation ⚠️ CRITICAL
**File:** `backend/src/routes/consent.js:50-70`
**Issue:** No verification that user can only modify their own consent
**Impact:** CRITICAL - Users can modify each other's consent

**Quick Fix:**
```javascript
router.post('/give-openai-consent', authMiddleware, async (req, res) => {
  const userId = req.auth.userId;

  // ✅ ADD THIS VALIDATION:
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify user is premium
  const userTier = await premiumFeaturesService.getUserTier(userId);
  // ... rest of code
});
```

**Test:** Make request as User A, try to set consent for User B → Should fail

---

## PRIORITY 2: DATA INTEGRITY (Fix Within 24 Hours)

### Bug #4: Unique Constraint on userId ⚠️ CRITICAL
**File:** `backend/src/db/schema.js:70, 86, 115`
**Issue:** Each table has `.unique()` on userId, means only 1 record per user
**Impact:** CRITICAL - Users can only have ONE dietary preferences record, can't update

**Quick Fix:**
For **dietaryPreferencesTable** (line 70):
```javascript
// CHANGE:
userId: text("user_id").notNull().unique(),

// TO:
userId: text("user_id").notNull(),
```

Then remove the unique constraint from database:
```sql
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_unique;
```

**Do this for:**
- dietaryPreferencesTable (line 70)
- nutritionGoalsTable (line 86)
- gamificationTable (line 115)

**Test:** Try to insert 2 dietary preference records for same user → Should succeed

---

### Bug #5: Missing Foreign Key on Recommendations ⚠️ CRITICAL
**File:** `backend/src/db/schema.js:472`
**Issue:** No foreign key to profiles, orphaned records possible
**Impact:** HIGH - Data pollution

**Quick Fix:**
```javascript
// CHANGE:
userId: text("user_id").notNull(),

// TO:
userId: text("user_id")
  .notNull()
  .references(() => profilesTable.userId, { onDelete: "cascade" }),
```

**Test:** Try to insert recommendation for non-existent user → Should fail

---

### Bug #6: Client Event ID Uniqueness Broken ⚠️ CRITICAL
**File:** `backend/src/db/schema.js:179, 216`
**Issue:** clientEventId is NULL but has unique constraint, breaks idempotency
**Impact:** HIGH - Users can log duplicate meals

**Quick Fix:**
```javascript
// CHANGE:
clientEventId: text("client_event_id"),  // NULL allowed

// TO:
clientEventId: text("client_event_id").unique().default(sql`gen_random_uuid()`),
```

OR migrate existing nulls:
```sql
-- Generate UUIDs for rows without clientEventId
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;
-- Then make it NOT NULL
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;
```

**Test:** Log same meal twice, idempotency key null → Should only create 1 entry

---

## PRIORITY 3: INPUT VALIDATION (Fix Within 48 Hours)

### Bug #7: Weak Input Validation on Consent ⚠️ HIGH
**File:** `backend/src/routes/consent.js:56`
**Issue:** `understand` parameter not validated, can be any truthy value
**Impact:** MEDIUM - Users can bypass consent requirement

**Quick Fix:**
```javascript
// CHANGE:
const { understand } = req.body;
if (!understand) {
  return res.status(400).json({...});
}

// TO:
const { understand } = req.body;
if (understand !== true) {  // ✅ Strict equality
  return res.status(400).json({
    success: false,
    error: 'You must explicitly acknowledge understanding of data sharing (understand must be exactly true)',
  });
}
```

**Test:** Send `{ understand: "false" }` → Should fail (string is truthy)

---

### Bug #8: No Rate Limiting on Consent ⚠️ HIGH
**File:** `backend/src/routes/consent.js`
**Issue:** No rate limiting, users can spam consent changes
**Impact:** MEDIUM - Spam attacks, audit trail pollution

**Quick Fix (Easy):**
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const consentLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,  // 5 requests per minute
  message: 'Too many consent changes, please try again later',
});

router.post('/give-openai-consent', consentLimiter, authMiddleware, async (req, res) => {
  // ... rest of code
});
```

---

## PRIORITY 4: ARCHITECTURE (Fix Within 1 Week)

### Bug #9: In-Memory Metrics Accumulate ⚠️ HIGH
**File:** `backend/src/services/PremiumFeatures.js:77-82`
**Issue:** Metrics never reset, accumulate in memory, lost on restart
**Impact:** MEDIUM - Bad business decisions

**Quick Fix:**
```javascript
// Create database table for metrics
CREATE TABLE feature_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

// Then persist metrics:
async trackPremiumUsage(userId, inputTokens, outputTokens) {
  const cost = this.calculateCost(inputTokens, outputTokens);

  await db.insert(featureMetricsTable).values({
    metric_name: 'premium_ai_cost',
    value: cost,
  });
}
```

---

### Bug #10: Race Condition in Consent Update ⚠️ HIGH
**File:** `backend/src/services/PremiumFeatures.js:323-329`
**Issue:** Updates two fields without transaction, can end up inconsistent
**Impact:** MEDIUM - Audit trail becomes unreliable

**Quick Fix:**
```javascript
// CHANGE:
const result = await db.update(profilesTable)
  .set({
    openaiDataSharingConsent: consent,
    openaiConsentGivenAt: timestamp,
  })
  .where(eq(profilesTable.userId, userId))
  .returning();

// TO (with transaction):
const result = await db.transaction(async (tx) => {
  return await tx.update(profilesTable)
    .set({
      openaiDataSharingConsent: consent,
      openaiConsentGivenAt: timestamp,
    })
    .where(eq(profilesTable.userId, userId))
    .returning();
});
```

---

## QUICK CHECKLIST

### Immediate (Before merging to main)
- [ ] Fix CORS security issue
- [ ] Fix unique constraint violations
- [ ] Add foreign key to recommendations
- [ ] Verify auth middleware

### Before deployment to production
- [ ] Fix idempotency key issue
- [ ] Add input validation
- [ ] Add rate limiting
- [ ] Test all permission flows

### Before first paying customers
- [ ] Migrate metrics to database
- [ ] Add transaction wrapping
- [ ] Full security audit

---

## SEVERITY REFERENCE

| Level | Definition | Action |
|-------|-----------|--------|
| 🔴 CRITICAL | Security/Data loss risk | Fix today, don't deploy |
| 🟠 HIGH | Major bugs, functionality broken | Fix within 24h |
| 🟡 MEDIUM | Issues, workarounds exist | Fix within week |
| 🟢 LOW | Polish, minor issues | Fix when convenient |

---

## RELATED DOCS

- [QA_COMPREHENSIVE_BUG_REPORT.md](QA_COMPREHENSIVE_BUG_REPORT.md) - Full analysis
- [QA_FIXES_SUMMARY.md](QA_FIXES_SUMMARY.md) - Permissions fix summary
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security best practices

---

**Status:** ⚠️ NOT PRODUCTION READY
**Estimated fix time:** 4-6 hours for critical bugs
**Last updated:** January 3, 2026
