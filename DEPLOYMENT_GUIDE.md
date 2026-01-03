# 🚀 DEPLOYMENT GUIDE - Strategic Bug Fixes
**Date:** January 3, 2026
**Status:** Ready for deployment (with migrations)
**Breaking Changes:** None for clients, minimal backend migrations required

---

## OVERVIEW

All critical bugs have been fixed strategically. This guide covers:
1. What was fixed
2. Database migrations required
3. Deployment steps
4. Testing checklist
5. Rollback procedures

---

## WHAT WAS FIXED

### 🔴 CRITICAL SECURITY FIXES

#### 1. CORS Security (server.js)
**Before:** `origin: "*"` - Allowed any domain
**After:** Whitelist-based origin checking with environment variables

**Files Modified:**
- `backend/src/server.js` (lines 144-178)

**Environment Variables Required:**
```bash
CORS_ORIGIN=https://yourdomain.com          # Production frontend
EXPO_APP_URL=https://yourapp.expo.dev       # Your Expo hosted app
```

**No Database Migration:** ✅ Not required

---

#### 2. Input Validation (consent.js)
**Before:** Weak validation `if (!understand)` allowed truthy strings
**After:** Strict validation `if (understand !== true)`

**Files Modified:**
- `backend/src/routes/consent.js` (lines 70-70)

**No Database Migration:** ✅ Not required

---

#### 3. Rate Limiting (consent.js)
**Before:** No rate limiting, users could spam consent requests
**After:** 5 requests per minute per user

**Files Modified:**
- `backend/src/routes/consent.js` (added rate limiter)

**Dependencies:**
```bash
npm install express-rate-limit  # If not already installed
```

**No Database Migration:** ✅ Not required

---

### 🟠 DATA INTEGRITY FIXES

#### 4. Unique Constraint Violations (schema.js)
**Before:**
```javascript
userId: text("user_id").notNull().unique()  // ❌ Only 1 record per user
```

**After:**
```javascript
userId: text("user_id").notNull()  // ✅ Multiple records allowed
  .references(() => profilesTable.userId, { onDelete: "cascade" })
```

**Tables Fixed:**
- `dietary_preferences` (line 70)
- `nutrition_goals` (line 85)
- `gamification` (line 115)

**Database Migration Required:** ✅ YES

**Migration SQL:**
```sql
-- Remove unique constraints
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_key;
ALTER TABLE gamification DROP CONSTRAINT IF EXISTS gamification_user_id_key;

-- Verify no duplicate records (optional check before deployment)
SELECT user_id, COUNT(*) as count
FROM dietary_preferences
GROUP BY user_id
HAVING COUNT(*) > 1;
```

---

#### 5. Foreign Key on Recommendations (schema.js)
**Before:** `userId: text("user_id").notNull()` - No referential integrity
**After:** Added `.references(() => profilesTable.userId, { onDelete: "cascade" })`

**Files Modified:**
- `backend/src/db/schema.js` (line 469-471)

**Database Migration Required:** ✅ YES

**Migration SQL:**
```sql
-- Add foreign key constraint
ALTER TABLE recommendations_history
ADD CONSTRAINT recommendations_history_user_id_fk
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Create index for foreign key
CREATE INDEX idx_rec_history_user_id ON recommendations_history(user_id);
```

---

#### 6. ClientEventId Idempotency (schema.js)
**Before:**
```javascript
clientEventId: text("client_event_id"),  // ❌ NULL allowed, breaks uniqueness
```

**After:**
```javascript
clientEventId: text("client_event_id")
  .notNull()
  .unique()
  .default(sql`gen_random_uuid()`)  // ✅ Auto-generates UUID
```

**Files Modified:**
- `backend/src/db/schema.js` (lines 176-179)

**Database Migration Required:** ✅ YES

**Migration SQL:**
```sql
-- IMPORTANT: Backfill existing NULL values with UUIDs first
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;

-- Add unique constraint on clientEventId
ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);

-- Make NOT NULL
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;

-- Drop the old composite unique constraint (if exists)
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;
```

---

### 🟢 OPERATIONAL IMPROVEMENTS

#### 7. Audit Trail (schema.js)
**Before:** No tracking of when consent was revoked
**After:** Added `openaiConsentRevokedAt` timestamp

**Files Modified:**
- `backend/src/db/schema.js` (line 30)
- `backend/src/services/PremiumFeatures.js` (lines 334-336)

**Database Migration Required:** ✅ YES

**Migration SQL:**
```sql
-- Add audit column
ALTER TABLE profiles
ADD COLUMN openai_consent_revoked_at TIMESTAMP;

-- Set revoked timestamp for any users where consent is false
UPDATE profiles
SET openai_consent_revoked_at = NOW()
WHERE openai_data_sharing_consent = false
AND openai_consent_given_at IS NOT NULL;
```

---

#### 8. Transaction Wrapping (PremiumFeatures.js)
**Before:** Updates to consent fields could partially fail
**After:** Atomic transactions ensure all fields update together

**Files Modified:**
- `backend/src/services/PremiumFeatures.js` (lines 330-342)

**No Database Migration:** ✅ Not required

---

#### 9. Premium Subscription Expiry Check (PremiumFeatures.js)
**Before:** Only checked `isPremium` flag, ignored subscription end date
**After:** Validates both flag AND expiration date

**Files Modified:**
- `backend/src/services/PremiumFeatures.js` (lines 103-117)

**No Database Migration:** ✅ Not required (uses existing `subscriptionEndsAt` column)

---

#### 10. Duplicate Health Check Removal (server.js)
**Before:** Two health endpoints (`/health` and `/api/health`)
**After:** Single unified endpoint at `/health`

**Files Modified:**
- `backend/src/server.js` (lines 247)

**No Database Migration:** ✅ Not required

---

## DEPLOYMENT STEPS

### Step 1: Pre-Deployment (Before Code Deployment)

```bash
# 1. Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Test migrations in staging environment
psql $STAGING_DATABASE_URL < migrations/001-critical-fixes.sql

# 3. Verify no errors in staging
```

### Step 2: Code Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install new dependencies
npm install express-rate-limit  # If not already installed

# 3. Run tests (if available)
npm test

# 4. Build
npm run build

# 5. Deploy to production
# (Your deployment process - Render, Heroku, etc.)
```

### Step 3: Database Migrations (In Order)

Run these migrations in this exact order:

**Migration 1: Remove Unique Constraints**
```sql
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_key;
ALTER TABLE gamification DROP CONSTRAINT IF EXISTS gamification_user_id_key;
```

**Migration 2: Backfill ClientEventId**
```sql
-- Backfill existing NULL clientEventIds with UUIDs
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;

-- Create unique constraint
ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);

-- Make NOT NULL
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;

-- Remove old composite constraint
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;
```

**Migration 3: Add Foreign Keys**
```sql
-- Add foreign key to recommendations_history
ALTER TABLE recommendations_history
ADD CONSTRAINT recommendations_history_user_id_fk
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

CREATE INDEX idx_rec_history_user_id ON recommendations_history(user_id);
```

**Migration 4: Add Audit Trail**
```sql
-- Add audit column
ALTER TABLE profiles
ADD COLUMN openai_consent_revoked_at TIMESTAMP;

-- Backfill revoked timestamps
UPDATE profiles
SET openai_consent_revoked_at = NOW()
WHERE openai_data_sharing_consent = false
AND openai_consent_given_at IS NOT NULL;
```

### Step 4: Environment Variables

Add to production environment:
```bash
CORS_ORIGIN=https://yourdomain.com
EXPO_APP_URL=https://yourapp.expo.dev
```

### Step 5: Post-Deployment Testing

```bash
# 1. Health check
curl https://your-api.com/health

# 2. Test CORS
curl -H "Origin: https://unauthorized.com" https://your-api.com/api/consent/status
# Should get CORS error

# 3. Test consent endpoints
curl -X POST https://your-api.com/api/consent/give-openai-consent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"understand": true}'

# 4. Test rate limiting (make 6 requests in quick succession)
for i in {1..6}; do
  curl -X POST https://your-api.com/api/consent/give-openai-consent \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"understand": true}'
done
# Request 6 should fail with rate limit error
```

---

## TESTING CHECKLIST

### ✅ Backend Tests

- [ ] CORS blocks unauthorized origins
- [ ] CORS allows whitelisted origins
- [ ] Rate limiting works (5 req/min)
- [ ] Consent endpoint validates `understand === true`
- [ ] Consent endpoint rejects truthy strings
- [ ] Consent endpoint requires authentication
- [ ] Consent changes are atomic (transaction works)
- [ ] Health check endpoint works
- [ ] Premium subscription expiry is checked
- [ ] Foreign key prevents orphaned recommendations
- [ ] ClientEventId prevents duplicate meals

### ✅ Database Tests

```sql
-- Test 1: Multiple dietary preferences per user
INSERT INTO dietary_preferences (user_id, preferences) VALUES ('user-123', '[]');
INSERT INTO dietary_preferences (user_id, preferences) VALUES ('user-123', '[]');
-- Should succeed (both inserts)

-- Test 2: ClientEventId uniqueness
INSERT INTO food_log (user_id, client_event_id, calories) VALUES ('user-123', 'event-1', 500);
INSERT INTO food_log (user_id, client_event_id, calories) VALUES ('user-123', 'event-1', 500);
-- Should fail (duplicate event-1)

-- Test 3: Foreign key enforcement
INSERT INTO recommendations_history (user_id, recommendation_id, food_name, calories, protein, carbs, fats, recommendation_type)
VALUES ('nonexistent-user-99999', 'rec-1', 'Apple', 100, 1, 25, 0, 'SNACK');
-- Should fail (user doesn't exist)

-- Test 4: Cascade delete
DELETE FROM profiles WHERE user_id = 'user-123';
SELECT COUNT(*) FROM dietary_preferences WHERE user_id = 'user-123';
-- Should return 0 (preferences cascaded deleted)
```

### ✅ API Tests

```bash
# Test CORS
curl -v -H "Origin: https://evil.com" https://your-api.com/api/consent/status

# Test input validation
curl -X POST https://your-api.com/api/consent/give-openai-consent \
  -H "Authorization: Bearer TOKEN" \
  -d '{"understand": "false"}'  # String instead of boolean

# Test rate limiting
for i in {1..10}; do
  curl -X POST https://your-api.com/api/consent/give-openai-consent \
    -H "Authorization: Bearer TOKEN" \
    -d '{"understand": true}' &
done
wait
```

---

## ROLLBACK PROCEDURE

If something goes wrong, rollback in this order:

```bash
# Step 1: Restore database from backup
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql

# Step 2: Revert code to previous version
git revert HEAD
git push origin main

# Step 3: Redeploy previous version
npm install
npm run build
# Deploy

# Step 4: Notify team
# Explain what happened and prepare fix
```

**Rollback SQL (if needed before full restore):**
```sql
-- Re-add unique constraints (if you need to rollback before fixing code)
ALTER TABLE dietary_preferences ADD CONSTRAINT dietary_preferences_user_id_unique UNIQUE(user_id);
ALTER TABLE nutrition_goals ADD CONSTRAINT nutrition_goals_user_id_unique UNIQUE(user_id);
ALTER TABLE gamification ADD CONSTRAINT gamification_user_id_unique UNIQUE(user_id);
```

---

## PERFORMANCE IMPACT

| Change | Performance | Notes |
|--------|-------------|-------|
| Remove unique constraints | ✅ Slight improvement | More efficient inserts possible |
| Add foreign keys | ✅ Negligible | Index created automatically |
| ClientEventId unique | ✅ Minimal impact | Indexed for performance |
| Transaction wrapping | ✅ No impact | Minimal overhead for small updates |
| Rate limiting | ✅ Negligible | Redis optional for distributed systems |
| CORS origin check | ✅ Minimal | Fast string comparison |

---

## MONITORING

After deployment, monitor:

```bash
# API error rates
SELECT COUNT(*) as errors, status_code
FROM api_logs
WHERE created_at > NOW() - interval '1 hour'
GROUP BY status_code
HAVING status_code >= 400;

# Database constraint violations
SELECT error, COUNT(*)
FROM error_logs
WHERE error LIKE '%constraint%'
AND created_at > NOW() - interval '1 hour'
GROUP BY error;

# Rate limit hits
SELECT COUNT(*) FROM api_logs
WHERE status_code = 429
AND created_at > NOW() - interval '1 hour';
```

---

## BREAKING CHANGES

✅ **None for clients**

The fixes are backward compatible. No client code needs to change.

**For backend developers:**
- New dependency: `express-rate-limit` (add to package.json)
- New environment variables: `CORS_ORIGIN`, `EXPO_APP_URL`
- Database schema changes: See migrations above

---

## ESTIMATED TIMELINE

| Phase | Duration | Task |
|-------|----------|------|
| **Pre-Deploy** | 30 min | Backup, test migrations |
| **Code Deploy** | 10 min | Push code, npm install |
| **DB Migrations** | 15-30 min | Run SQL migrations |
| **Testing** | 20-30 min | Verify all fixes work |
| **Monitoring** | Ongoing | Watch error rates |

**Total estimated time: 1.5-2 hours**

---

## SUCCESS CRITERIA

Deployment is successful when:
- ✅ All database migrations completed without errors
- ✅ CORS properly blocks unauthorized origins
- ✅ Rate limiting works (5 requests per minute)
- ✅ No new constraint violation errors
- ✅ Food logs don't have duplicates (clientEventId prevents it)
- ✅ Premium subscription expiry is checked
- ✅ Consent endpoints require strict boolean validation
- ✅ Health check endpoint responds correctly
- ✅ Error rate remains normal (< 1% increase)

---

## SUPPORT

If issues arise:
1. Check [CRITICAL_BUGS_ACTION_ITEMS.md](CRITICAL_BUGS_ACTION_ITEMS.md) for known issues
2. Review QA reports: [QA_COMPREHENSIVE_BUG_REPORT.md](QA_COMPREHENSIVE_BUG_REPORT.md)
3. Check rollback procedure above
4. Contact engineering team

---

## NEXT STEPS

After successful deployment:
1. Monitor for 24 hours
2. Fix remaining HIGH priority bugs (see QA report)
3. Run load testing on new constraints
4. Schedule quarterly security audit

---

**Status:** ✅ Ready for deployment
**Deployment Date:** (To be scheduled)
**Prepared By:** QA & Engineering Team
**Last Updated:** January 3, 2026
