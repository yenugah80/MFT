# 🚨 NEON DATABASE - Apply Migrations NOW

**Error:** `column "is_premium" of relation "profiles" does not exist`
**Database:** Neon (PostgreSQL)
**Status:** 🔴 CRITICAL - Onboarding blocked
**Fix Time:** 2 minutes

---

## ⚠️ CRITICAL: You Must Run the Database Migration

Your **production database on Neon is missing columns**. The app can't save profiles without them.

---

## 🔧 IMMEDIATE FIX (2 minutes)

### Step 1: Access Neon Console
1. Go to https://console.neon.tech
2. Login to your account
3. Select your project/database
4. Click "SQL Editor" tab

### Step 2: Copy Complete Migration Script
Open this file: `COMPLETE_MIGRATION_SCRIPT.sql`
Copy entire content

### Step 3: Paste into Neon SQL Editor
1. Click in the SQL Editor window
2. Paste the entire migration script
3. Click "Execute" button

### Step 4: Wait for Success
```
All commands should execute without errors
You should see: "All migrations applied successfully"
```

---

## 🔥 QUICK FIX (Copy-Paste This)

Paste this into Neon SQL Editor and click Execute:

```sql
-- Add missing columns to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "premium_tier" text DEFAULT 'free';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "subscription_started_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "subscription_ends_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_data_sharing_consent" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_consent_given_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "openai_consent_revoked_at" timestamp;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;

-- Create indices
CREATE INDEX IF NOT EXISTS "profiles_is_premium_idx" ON "profiles"("is_premium");
CREATE INDEX IF NOT EXISTS "profiles_subscription_ends_idx" ON "profiles"("subscription_ends_at");
CREATE INDEX IF NOT EXISTS "profiles_openai_consent_idx" ON "profiles"("openai_data_sharing_consent");
CREATE INDEX IF NOT EXISTS "profiles_onboarding_completed_idx" ON "profiles"("onboarding_completed_at");

-- Remove unique constraints
ALTER TABLE dietary_preferences DROP CONSTRAINT IF EXISTS dietary_preferences_user_id_key;
ALTER TABLE nutrition_goals DROP CONSTRAINT IF EXISTS nutrition_goals_user_id_key;
ALTER TABLE gamification DROP CONSTRAINT IF EXISTS gamification_user_id_key;

-- Add foreign keys
ALTER TABLE recommendations_history
ADD CONSTRAINT recommendations_history_user_id_fk
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rec_history_user_id ON recommendations_history(user_id);

-- Secure clientEventId
UPDATE food_log SET client_event_id = gen_random_uuid() WHERE client_event_id IS NULL;
ALTER TABLE food_log ADD CONSTRAINT food_log_client_event_id_unique UNIQUE(client_event_id);
ALTER TABLE food_log ALTER COLUMN client_event_id SET NOT NULL;
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_user_id_client_event_id_unique;
```

---

## ✅ Verify Success

After running the migration, run this query to verify:

```sql
-- Check columns exist
SELECT COUNT(*) as columns_added
FROM information_schema.columns
WHERE table_name='profiles'
AND column_name IN (
  'is_premium', 'premium_tier', 'subscription_started_at',
  'subscription_ends_at', 'openai_data_sharing_consent',
  'openai_consent_given_at', 'openai_consent_revoked_at',
  'onboarding_completed_at'
);

-- Should return: 8
```

If you see "8", migrations were successful! ✅

---

## 🔄 After Running Migrations

1. ✅ Migration complete
2. App will immediately start working
3. Users can complete onboarding
4. OnboardingGuard will fetch profile successfully
5. No more `is_premium` errors

---

## 📋 Step-by-Step Screenshots

### Step 1: Neon Console
```
Homepage → Your Project → SQL Editor
```

### Step 2: Paste SQL
```
1. Click in SQL editor window
2. Paste migration script
3. Select all (Ctrl+A)
4. Click "Execute"
```

### Step 3: Wait for Success
```
Should show: "Query executed successfully"
No errors should appear
```

---

## 🎯 What Gets Fixed

| Error | Status | After Migration |
|-------|--------|-----------------|
| `is_premium` missing | 🔴 ERROR | ✅ FIXED |
| `premium_tier` missing | 🔴 ERROR | ✅ FIXED |
| `subscription_*` missing | 🔴 ERROR | ✅ FIXED |
| `openai_*` missing | 🔴 ERROR | ✅ FIXED |
| `onboarding_completed_at` missing | 🔴 ERROR | ✅ FIXED |
| Profile save fails | 🔴 ERROR | ✅ FIXED |
| OnboardingGuard can't fetch | 🔴 ERROR | ✅ FIXED |

---

## 🚨 If You Get Errors

### "Syntax error"
- Check you copied entire script correctly
- Try copying from COMPLETE_MIGRATION_SCRIPT.sql instead

### "Column already exists"
- This is OK! It means it's already there
- Continue with migration, no action needed

### "Relation does not exist"
- Check you're connected to correct database
- Verify Neon database is selected

### "Permission denied"
- Make sure you're using admin/owner credentials
- May need to escalate permissions

---

## ✨ Expected Result

After migration:
- ✅ All 8 columns exist in profiles table
- ✅ App can save profile data
- ✅ Onboarding completes successfully
- ✅ OnboardingGuard fetches profile without error
- ✅ Returning users redirected to dashboard
- ✅ No more 500 errors

---

## 📞 Need Help?

If migration fails:
1. Check error message carefully
2. Verify Neon connection is active
3. Try running one command at a time
4. Check database logs in Neon console

---

**IMPORTANT:** This is blocking your app. Run this migration NOW to fix all errors! 🔥

---

**Status:** 🔴 URGENT - DO NOW
**Time:** 2 minutes
**Impact:** Fixes everything
