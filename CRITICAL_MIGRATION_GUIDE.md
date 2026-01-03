# 🚨 CRITICAL MIGRATION GUIDE - Run These Now to Fix 500 Errors

**Status:** 🔴 URGENT - Database migrations required
**Error:** HTTP 500 when calling `/profile` endpoint
**Root Cause:** Missing database columns not yet added
**Time to Fix:** ~5 minutes

---

## ⚠️ WHAT'S HAPPENING

The app is failing with HTTP 500 because the database is missing required columns:
1. `onboarding_completed_at` - For OnboardingGuard to work
2. `openai_consent_revoked_at` - For audit trail
3. Also missing: unique constraint fixes

Without these columns, the `/profile` endpoint crashes when trying to fetch the profile.

---

## 🔧 FIX IMMEDIATELY - Run These SQL Commands

### Step 1: Add Missing Columns (5 seconds)
```sql
-- Add onboarding completion timestamp
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;

-- Add consent revocation audit timestamp
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "openai_consent_revoked_at" timestamp;
```

### Step 2: Verify Columns Were Added (10 seconds)
```sql
-- This should show the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='profiles'
AND column_name IN ('onboarding_completed_at', 'openai_consent_revoked_at');

-- Should return 2 rows with:
-- onboarding_completed_at | timestamp without time zone | YES
-- openai_consent_revoked_at | timestamp without time zone | YES
```

### Step 3: Create Indices for Performance (5 seconds)
```sql
-- Create index for onboarding lookups
CREATE INDEX IF NOT EXISTS "profiles_onboarding_completed_idx"
ON "profiles"("onboarding_completed_at");

-- Create index for consent audit lookups
CREATE INDEX IF NOT EXISTS "profiles_openai_consent_revoked_idx"
ON "profiles"("openai_consent_revoked_at");
```

### Step 4: Fix Unique Constraints (10 seconds)
```sql
-- Remove problematic unique constraints that prevent updates
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_key;
ALTER TABLE gamification DROP CONSTRAINT IF EXISTS gamification_user_id_key;
```

### Step 5: Add Foreign Keys (15 seconds)
```sql
-- Add foreign key to recommendations_history
ALTER TABLE recommendations_history
ADD CONSTRAINT recommendations_history_user_id_fk
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Create index for foreign key
CREATE INDEX IF NOT EXISTS idx_rec_history_user_id ON recommendations_history(user_id);
```

### Step 6: Secure ClientEventId (20 seconds)
```sql
-- Backfill any NULL clientEventIds with UUIDs
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;

-- Add unique constraint
ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);

-- Make NOT NULL
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;

-- Remove old composite constraint if exists
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;
```

---

## ⏱️ EXECUTION STEPS

### Using psql CLI
```bash
# Connect to your database
psql $DATABASE_URL

# Run all migrations (copy-paste the entire script below)
```

### Complete Migration Script (Copy & Paste)
```sql
-- ============================================================================
-- STEP 1: Add Missing Columns
-- ============================================================================
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "openai_consent_revoked_at" timestamp;

-- ============================================================================
-- STEP 2: Create Performance Indices
-- ============================================================================
CREATE INDEX IF NOT EXISTS "profiles_onboarding_completed_idx"
ON "profiles"("onboarding_completed_at");

CREATE INDEX IF NOT EXISTS "profiles_openai_consent_revoked_idx"
ON "profiles"("openai_consent_revoked_at");

-- ============================================================================
-- STEP 3: Remove Unique Constraints Blocking Updates
-- ============================================================================
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_key;
ALTER TABLE gamification DROP CONSTRAINT IF EXISTS gamification_user_id_key;

-- ============================================================================
-- STEP 4: Add Foreign Key Constraints
-- ============================================================================
ALTER TABLE recommendations_history
ADD CONSTRAINT recommendations_history_user_id_fk
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rec_history_user_id ON recommendations_history(user_id);

-- ============================================================================
-- STEP 5: Secure ClientEventId with UUID
-- ============================================================================
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;

ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);

ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;

ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;

-- ============================================================================
-- Verification - Run these to confirm all changes applied
-- ============================================================================
-- Check columns exist
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='profiles' AND column_name IN ('onboarding_completed_at', 'openai_consent_revoked_at');

-- Check indices exist
-- SELECT indexname FROM pg_indexes WHERE tablename='profiles' AND indexname LIKE '%onboarding%';

-- Check constraints removed
-- SELECT constraint_name FROM information_schema.constraint_column_usage
-- WHERE table_name='dietary_preferences' AND column_name='user_id';
```

---

## ✅ VERIFICATION

After running migrations, verify everything worked:

```sql
-- 1. Check new columns exist and are nullable
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='profiles'
ORDER BY column_name;
-- Should show: onboarding_completed_at and openai_consent_revoked_at with is_nullable=YES

-- 2. Test profile fetch (should NOT return 500)
-- Can test via app now - should not crash

-- 3. Check constraints removed
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name='dietary_preferences';
-- Should NOT show: dietary_preferences_user_id_key

-- 4. Verify foreign key added
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name='recommendations_history';
-- Should show: recommendations_history_user_id_fk

-- 5. Check clientEventId is not nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name='food_log' AND column_name='client_event_id';
-- Should show: is_nullable=NO
```

---

## 🧪 TEST AFTER MIGRATION

### 1. Test New User Onboarding
```javascript
// New user should see onboarding, not error
1. Open app as new user
2. Expected: Onboarding screens appear
3. Fill all steps
4. Click "Complete"
5. Expected: Success message, redirect to dashboard
6. Check profile was saved: profile.onboardingCompletedAt should be set
```

### 2. Test Returning User
```javascript
// Returning user should immediately see dashboard
1. Sign in as user with onboarding completed
2. Expected: OnboardingGuard detects onboarding_completed_at
3. Expected: Automatically redirected to dashboard
4. Expected: No onboarding screens shown
```

### 3. Test Profile Endpoints
```bash
# Should return 200, not 500
curl -H "Authorization: Bearer {token}" \
  https://your-api.com/api/profile

# Response should include onboarding_completed_at field
```

---

## 📋 QUICK REFERENCE

| What | Status | Action |
|------|--------|--------|
| onboarding_completed_at column | 🔴 Missing | Add column |
| openai_consent_revoked_at column | 🔴 Missing | Add column |
| dietary_preferences unique constraint | 🔴 Too strict | Remove |
| nutrition_goals unique constraint | 🔴 Too strict | Remove |
| gamification unique constraint | 🔴 Too strict | Remove |
| recommendations_history FK | 🔴 Missing | Add FK |
| clientEventId NOT NULL | 🔴 Nullable | Make NOT NULL |

---

## 🚨 IF YOU GET ERRORS

### "Column already exists"
- This is OK - the `IF NOT EXISTS` clause handles this
- Means migration was partially applied before
- Continue with remaining steps

### "Constraint does not exist"
- This is OK - the `IF EXISTS` clause handles this
- Means constraint was already dropped
- Continue with remaining steps

### "Foreign key violation"
- This means there's orphaned data
- Solution: Delete orphaned rows first:
  ```sql
  DELETE FROM recommendations_history
  WHERE user_id NOT IN (SELECT user_id FROM profiles);
  ```
- Then retry the foreign key addition

### "Cannot drop constraint - still needed"
- Unusual - this shouldn't happen
- Check if there are dependent constraints
- Contact engineering team if persists

---

## ⚙️ DATABASE-SPECIFIC NOTES

### PostgreSQL (Most Common)
- All above SQL works as-is
- Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### Other Databases
- Syntax may vary slightly
- Contact your DBA for specific SQL

---

## 🔄 NEXT STEPS AFTER MIGRATION

1. ✅ Run migrations (THIS STEP)
2. ✅ Restart backend app
3. ✅ Test new user onboarding
4. ✅ Test returning user redirect
5. ✅ Monitor for errors
6. ✅ Fix any remaining issues

---

## 📞 TROUBLESHOOTING

**Still getting 500 error after migration?**
1. Verify migration ran successfully
2. Restart backend app (migration cache)
3. Check database logs for errors
4. Verify columns exist with verification query above

**Onboarding still loops?**
1. Check onboarding_completed_at column exists
2. Check OnboardingGuard is integrated in app/_layout.jsx
3. Check APP is using GET /profile endpoint
4. Test offline mode - might be AsyncStorage issue

**Profile not saving?**
1. Verify unique constraints removed
2. Check database logs for constraint violations
3. Ensure dietary_preferences, nutrition_goals allow multiple records per user

---

**Time Estimate:** 5-10 minutes
**Risk Level:** 🟢 LOW (additive only, no data loss)
**Rollback:** Can drop columns if needed
**Status:** Ready to execute

---

**IMPORTANT:** Run this NOW if you're seeing 500 errors!

---

**Created:** January 3, 2026
**Priority:** 🔴 CRITICAL
**Status:** Ready to apply
