# ✅ IMMEDIATE ACTION CHECKLIST - Fix 500 Errors

**Current Issue:** HTTP 500 errors when app calls `/profile` endpoint
**Root Cause:** Missing database columns
**Time to Fix:** ~10 minutes
**Status:** 🔴 URGENT - DO THIS FIRST

---

## 🔥 DO THIS RIGHT NOW (5 minutes)

### 1️⃣ Access Your Database
```bash
# Option A: If using psql CLI
psql $DATABASE_URL

# Option B: If using pgAdmin web interface
# Open pgAdmin → Databases → Your DB → SQL Editor
```

### 2️⃣ Copy and Paste Complete Migration
```sql
-- Copy the entire block below and paste into your database client
-- This will add all missing columns and fix all constraints

-- Add missing columns
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_consent_revoked_at" timestamp;

-- Create indices
CREATE INDEX IF NOT EXISTS "profiles_onboarding_completed_idx" ON "profiles"("onboarding_completed_at");
CREATE INDEX IF NOT EXISTS "profiles_openai_consent_revoked_idx" ON "profiles"("openai_consent_revoked_at");

-- Remove unique constraints
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_key;
ALTER TABLE gamification DROP CONSTRAINT IF EXISTS gamification_user_id_key;

-- Add foreign key
ALTER TABLE recommendations_history ADD CONSTRAINT recommendations_history_user_id_fk FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rec_history_user_id ON recommendations_history(user_id);

-- Secure clientEventId
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;
ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;
```

### 3️⃣ Execute the Migration
- Copy entire block above
- Paste into your database client
- Click "Execute" or press Enter
- **Wait for all commands to complete** ✅

### 4️⃣ Verify Success
```sql
-- Run this to verify all columns exist:
SELECT column_name FROM information_schema.columns
WHERE table_name='profiles'
AND column_name IN ('onboarding_completed_at', 'openai_consent_revoked_at');
-- Should return 2 rows
```

### 5️⃣ Restart Your Backend
```bash
# Stop the backend (Ctrl+C or kill process)
# Then restart:
npm run dev  # or your start command
```

### 6️⃣ Test in App
1. Open app
2. Sign in as new user
3. Go through onboarding
4. Should complete WITHOUT 500 error ✅
5. Sign out and sign back in
6. Should go to dashboard (not onboarding) ✅

---

## 📋 WHAT GETS FIXED

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| `/profile` endpoint crashes | 500 error | 200 OK ✅ | FIXED |
| Onboarding completion | Not tracked | Tracked with timestamp | FIXED |
| Returning users loop | Stuck in loop | Redirected to dashboard | FIXED |
| Profile save fails | Unique constraint error | Can update/insert | FIXED |
| Orphaned data | Possible | Prevented with FK | FIXED |
| Duplicate meals | Possible with NULL unique | Prevented with UUID | FIXED |

---

## 🧪 TEST SCENARIOS (After Migration)

### Scenario 1: New User (Fresh Signup)
```
1. Open app (not logged in)
2. Sign up with new account
3. Expected: See onboarding screens ✅
4. Complete all 4 steps
5. Click "Complete Onboarding"
6. Expected: Profile save succeeds ✅
7. Expected: Redirected to dashboard ✅
8. Check: profile.onboardingCompletedAt is set ✅
```

### Scenario 2: Returning User (Reopen App)
```
1. Open app as existing user
2. User already has onboardingCompletedAt set
3. Expected: OnboardingGuard detects it ✅
4. Expected: Skips onboarding ✅
5. Expected: Directly shows dashboard ✅
6. No spinner/loading, smooth redirect ✅
```

### Scenario 3: Offline Test
```
1. Start onboarding (internet on)
2. At step 2, turn off internet
3. Go back to step 1
4. Expected: Can navigate without API ✅
5. Data saved to AsyncStorage ✅
6. Turn internet back on
7. Expected: Can complete onboarding ✅
```

### Scenario 4: API Verification
```bash
# In terminal or Postman:
curl -H "Authorization: Bearer {token}" \
  https://your-api.com/api/profile

# Should return 200 with:
{
  "basics": {...},
  "dietary": {...},
  "goals": {...},
  "gamification": {...},
  "onboardingCompletedAt": null or "2026-01-03T10:00:00Z"
}
```

---

## 🚨 IF SOMETHING GOES WRONG

### Still Getting 500 Error?
**Solution:**
1. Verify migration ran (check verification query above)
2. Restart backend app completely
3. Clear app cache: Delete app and reinstall
4. Check database logs for errors

### Onboarding Still Loops?
**Check:**
1. Are columns in database? (Run verification query)
2. Is OnboardingGuard imported? (app/_layout.jsx line 12)
3. Is OnboardingGuard wrapping Slot? (app/_layout.jsx line 117)
4. Is using /profile endpoint? (OnboardingGuard.jsx line 55)

### Profile Won't Save?
**Check:**
1. Are unique constraints removed? (verification query)
2. Are there constraint violations in logs?
3. Is backend restarted after migration?
4. Are API endpoints returning errors?

### Need More Help?
See: `CRITICAL_MIGRATION_GUIDE.md` - Detailed troubleshooting section

---

## ✅ SUCCESS CHECKLIST

After completing migration, verify:

- [ ] Migration ran without errors
- [ ] Verification queries return expected results
- [ ] Backend restarted
- [ ] New user can complete onboarding
- [ ] Onboarding saves profile successfully
- [ ] Returning user redirects to dashboard
- [ ] No 500 errors in logs
- [ ] App works offline
- [ ] No console errors about missing columns

---

## 📊 BEFORE & AFTER

### BEFORE (Current - Broken)
```
User opens app
  ↓
OnboardingGuard tries GET /profile
  ↓
❌ Database missing onboarding_completed_at column
  ↓
500 Internal Server Error
  ↓
App crashes or shows blank screen
  ↓
User frustrated
```

### AFTER (Fixed)
```
User opens app
  ↓
OnboardingGuard tries GET /profile
  ↓
✅ Database has onboarding_completed_at column
  ↓
200 OK with profile including onboarding_completed_at
  ↓
Check if onboarding_completed_at exists
  ├─ YES → Returning user → Dashboard
  └─ NO → New user → Onboarding
  ↓
User sees correct screen
  ↓
User happy
```

---

## 🎯 FINAL STEPS

1. **Execute Migration** (Copy-paste SQL into database)
2. **Restart Backend** (Stop and start app server)
3. **Test in App** (Go through onboarding as new user)
4. **Verify Success** (Check profile saves and returning user works)

**Total Time:** 10 minutes max

---

## 📞 QUICK REFERENCE

**Problem:** 500 errors on `/profile`
**Solution:** Run migrations
**Commands:** Copy-paste SQL above
**Verification:** Run verification query
**Test:** New user onboarding + returning user redirect

---

**Status:** 🔴 URGENT - RUN IMMEDIATELY
**Created:** January 3, 2026
**Expected Outcome:** ✅ All 500 errors fixed
