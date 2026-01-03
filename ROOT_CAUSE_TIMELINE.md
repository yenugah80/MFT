# 🔍 ROOT CAUSE TIMELINE - Why OnboardingGuard Fails

**What you see**: "Failed to fetch profile"
**What actually happened**: Complete timeline of failure

---

## ⏱️ EXACT SEQUENCE OF EVENTS

### T=0: User opens app
```
[✅] Clerk authentication succeeds
     User is signed in
     Token is valid
     Auth middleware ready
```

### T=1: App tries to load profile
```
Mobile: OnboardingGuard → apiClient.get('/profile')
        └─> Sends: GET /profile with Bearer token
            Headers: Authorization: Bearer {valid_token}
```

### T=2: Backend receives request
```
Backend: requireAuth middleware ✅
         └─> Extracts userId from token ✅
             userId = "user_xyz"

Backend: profileController.getProfile(req, res)
         └─> Queries: SELECT * FROM profiles WHERE user_id = 'user_xyz'
```

### T=3: DATABASE FAILS ❌
```
PostgreSQL executes:
  SELECT * FROM "profiles" WHERE "user_id" = 'user_xyz'

Query includes columns from schema:
  - is_premium ❌ COLUMN DOESN'T EXIST
  - premium_tier ❌ COLUMN DOESN'T EXIST
  - subscription_started_at ❌ COLUMN DOESN'T EXIST
  - subscription_ends_at ❌ COLUMN DOESN'T EXIST
  - openai_data_sharing_consent ❌ COLUMN DOESN'T EXIST
  - openai_consent_given_at ❌ COLUMN DOESN'T EXIST
  - openai_consent_revoked_at ❌ COLUMN DOESN'T EXIST
  - onboarding_completed_at ❌ COLUMN DOESN'T EXIST

Error: "column is_premium does not exist (SQLSTATE 42703)"
```

### T=4: Backend error handling (WRONG)
```
profileController.js line 422-424:
  catch (error) {
    console.error("❌ Error fetching profile:", error);
    sendDevError(res, error);
  }

sendDevError() returns:
  HTTP 500
  Body: { error: "Database error occurred" }

NO ACTUAL ERROR DETAILS SENT TO FRONTEND
```

### T=5: Frontend receives 500
```
Mobile: safeFetchJson catches error

Current buggy implementation:
  catch (error) {
    console.warn('Failed to fetch:', error);
    return {}; // ❌ RETURNS EMPTY OBJECT
  }

Result: OnboardingGuard gets empty {}
```

### T=6: OnboardingGuard checks empty data
```
OnboardingGuard.jsx line 34:
  if (profileResponse && profileResponse.onboardingCompletedAt) {
    // User completed onboarding
  } else {
    // User needs onboarding
    setIsCheckingOnboarding(false);
  }

With profileResponse = {}:
  ✅ Passes the `profileResponse &&` check
  ✅ onboardingCompletedAt is undefined
  ✅ Falls into "else" branch
  ✅ Renders children (Slot)

BUT:
  No error shown to user
  App appears to load
  But shows empty/broken screens
```

### T=7: Root cause: Not at UI, not at app logic

**THE REAL PROBLEM**: Database doesn't have columns that code expects

---

## 🎯 WHY THIS HAPPENED

### Step 1: Code defines schema
```
backend/src/db/schema.js defines:
  isPremium: boolean
  premiumTier: text
  subscriptionStartedAt: timestamp
  etc.
```

### Step 2: Code tries to use schema
```
Drizzle ORM generates SQL:
  SELECT ... is_premium, premium_tier, subscription_started_at ...
  FROM profiles
```

### Step 3: Database doesn't have columns
```
Real Neon database:
  ❌ No is_premium column
  ❌ No premium_tier column
  ❌ No subscription_started_at column
  ❌ (All 8 missing)
```

### Why? The migrations didn't actually apply
```
What happened:
  1. You ran migration SQL in Neon console
  2. You saw result: "8 columns_added"
  3. BUT...

Possible reasons:
  a) Backend is pointing to WRONG database
  b) Migration SQL didn't execute (syntax error?)
  c) Neon cached old schema
  d) Backend still has old connection pool
```

---

## ✅ THE FIX (From Logical Root)

### Root Cause #1: Database schema mismatch
**Fix**: Verify and re-apply migrations
```
1. Confirm is_premium column exists
   SELECT column_name FROM information_schema.columns
   WHERE table_name='profiles' AND column_name='is_premium';

2. If NOT found: Run full migration again
3. If found: Restart backend (clear connection pool)
```

### Root Cause #2: Profile creation not idempotent
**Current behavior**:
```
User signs in
→ App calls saveBasics()
→ Creates profile row
→ saveDietary() calls saveBasics() again?
→ Tries to CREATE again
→ Fails (already exists? or partial state?)
```

**Fixed behavior**:
```
User signs in
→ App calls saveBasics()
→ Check: Does profile exist?
  ✅ YES → UPDATE (idempotent)
  ✅ NO → CREATE (only once)
→ Always succeed (never partial state)
```

### Root Cause #3: Errors are swallowed
**Current**:
```
Backend returns 500
Frontend catches error
Frontend returns {} silently
OnboardingGuard has no idea what went wrong
```

**Fixed**:
```
Backend returns 500 with details
Frontend throws error (doesn't swallow)
OnboardingGuard catches and logs real error
User sees "Backend error: is_premium column missing"
```

---

## 📊 FAILURE CHAIN

```
Missing DB columns
    ↓
Backend query fails (500)
    ↓
Frontend silently catches (returns {})
    ↓
OnboardingGuard gets empty data
    ↓
OnboardingGuard blocks UI
    ↓
User sees: "Failed to fetch profile"
```

**NOT a problem at any one layer. It's a chain of failures.**

---

## 🔧 THE THREE-PART FIX

### Part 1: Database (**MUST FIX FIRST**)
```
Verify is_premium column exists
If not: Run migration
If yes: Restart backend
```

### Part 2: Profile Idempotency (**PREVENTS LOOPS**)
```
saveBasics(): Check if exists before create
Result: One profile per user, always
```

### Part 3: Error Propagation (**VISIBILITY**)
```
safeFetchJson: Throw errors instead of swallowing
OnboardingGuard: Show real error to user
Result: Users know what's wrong
```

---

## 🎯 WHAT TO DO NOW

1. **Go to Neon console**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name='profiles' AND column_name='is_premium';
   ```

2. **If result is 0 rows:**
   - Copy the full migration SQL from IMMEDIATE_PRODUCTION_FIX.md
   - Paste into Neon SQL Editor
   - Click Execute
   - Verify: Should see "8"

3. **If result is 1 row:**
   - Go to Render dashboard
   - Click "Reboot" on backend
   - Wait 3 minutes
   - Test app

4. **Once database is fixed:**
   - Update saveBasics() with idempotent version (from guide)
   - Update safeFetchJson to throw errors
   - Test again

---

## ✅ VERIFICATION AFTER FIXES

```
Test flow:
1. Open app
2. Sign in
3. OnboardingGuard calls /profile
4. Backend returns 200 with profile data
5. OnboardingGuard detects onboarding status
6. Either:
   - New user → Shows onboarding
   - Returning user → Shows dashboard
```

---

## 🚨 KEY INSIGHTS

1. **The system is working correctly** - it's blocking because backend is broken
2. **The blocker is database schema mismatch** - not app logic
3. **Errors are being hidden** - making diagnosis hard
4. **The fix is simple** - 15 minutes

You built the architecture right. The database just doesn't match the code yet.

---

**Next Action**: Go to Neon and check if is_premium column exists
**Timeline**: 15 minutes to fix
**Expected Result**: App works, OnboardingGuard succeeds
