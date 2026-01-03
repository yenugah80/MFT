# 🚨 IMMEDIATE PRODUCTION FIX - OnboardingGuard Failing

**Status**: 🔴 CRITICAL - App completely blocked
**Root Cause**: Database column `is_premium` still missing
**Why It Happened**: Migration SQL ran, but backend doesn't see it
**Fix Time**: 15 minutes

---

## 🔍 VERIFY THE ACTUAL PROBLEM

### Step 1: Check if column REALLY exists in Neon

Go to Neon console and run:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name='profiles'
AND column_name='is_premium';
```

If you get **0 rows**: Column doesn't exist (migration failed)
If you get **1 row**: Column exists (but backend doesn't see it)

---

## 🔧 FIX #1: If Column Doesn't Exist (Migration Failed)

### Step 1: Copy this exact SQL

```sql
-- Ensure profiles table exists first
-- Then add ALL missing columns in one shot

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_tier text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_started_at timestamp;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_data_sharing_consent boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_consent_given_at timestamp;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_consent_revoked_at timestamp;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp;

-- Verify
SELECT COUNT(column_name) as columns_added
FROM information_schema.columns
WHERE table_name='profiles'
AND column_name IN (
  'is_premium',
  'premium_tier',
  'subscription_started_at',
  'subscription_ends_at',
  'openai_data_sharing_consent',
  'openai_consent_given_at',
  'openai_consent_revoked_at',
  'onboarding_completed_at'
);

-- Should return: 8
```

### Step 2: Paste into Neon SQL Editor
1. Go to https://console.neon.tech
2. Select your project
3. Click "SQL Editor"
4. Paste above SQL
5. Click "Execute"
6. Verify you get "8"

### Step 3: Check DATABASE_URL on Render

Your backend on Render might be pointing to WRONG database

1. Go to https://dashboard.render.com
2. Select your backend service
3. Click "Environment"
4. Find `DATABASE_URL`
5. Copy the value
6. Paste into Neon console URL bar - verify it's YOUR database, not someone else's

---

## 🔧 FIX #2: If Column Exists But Backend Doesn't See It

Your backend is using cached schema. Force reload:

### Option A: Redeploy on Render (Easiest)
```
1. Go to Render dashboard
2. Select backend service
3. Click "Reboot" button
4. Wait 2-3 minutes
5. Test app again
```

### Option B: Redeploy from GitHub
```bash
# In your local terminal:
git add -A
git commit -m "force: Redeploy to pick up DB changes"
git push origin main

# Render will auto-redeploy
# Wait 5 minutes for deployment
```

### Option C: Force Database Connection Reset
Add this environment variable on Render:

```
FORCE_DB_REFRESH=true
```

Then reboot service.

---

## ✅ FIX #3: Make Profile Creation Idempotent (Prevents Loops)

**File**: `backend/src/controllers/profileController.js`

**Problem**: If profile create fails, it retries infinitely

**Replace saveBasics() with**:

```javascript
export async function saveBasics(req, res) {
  try {
    const { userId } = req.auth;

    // VALIDATE inputs FIRST
    const { fullName, email, gender, age, weightKg, heightCm, activityLevel } = req.body;

    // Prevent creating profile twice
    const existing = await req.db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Profile exists - UPDATE only
      const updated = await req.db
        .update(profilesTable)
        .set({
          fullName,
          email,
          gender,
          age,
          weightKg,
          heightCm,
          activityLevel,
          updatedAt: new Date(),
        })
        .where(eq(profilesTable.userId, userId))
        .returning();

      console.log(`[saveBasics] ✅ UPDATED profile for user ${userId}`);
      return res.status(200).json({
        success: true,
        basics: updated[0],
      });
    }

    // Profile doesn't exist - CREATE once
    const created = await req.db
      .insert(profilesTable)
      .values({
        userId,
        fullName,
        email,
        gender: gender || null,
        age: age ? parseInt(age, 10) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        heightCm: heightCm ? parseInt(heightCm, 10) : null,
        activityLevel: activityLevel || null,
        isPremium: false,
        premiumTier: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`[saveBasics] ✅ CREATED profile for user ${userId}`);
    res.status(200).json({
      success: true,
      basics: created[0],
    });

  } catch (error) {
    console.error('[saveBasics] ❌ Error:', {
      userId: req.auth?.userId,
      error: error.message,
      column: error.column,
      code: error.code,
    });

    // EXPLICIT error response (not silent)
    res.status(500).json({
      success: false,
      error: 'Failed to save profile basics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Database error',
      hint: 'Check backend logs',
    });
  }
}
```

**Key Changes**:
1. ✅ Check if profile exists first
2. ✅ Only update or create (never both)
3. ✅ Explicit error response with column info
4. ✅ Prevents duplicate rows

---

## ✅ FIX #4: Don't Swallow Profile Fetch Errors

**File**: `mobile/services/apiClient.js` (or wherever safeFetchJson is)

**Problem**: Errors are swallowed, returns empty {}

**Current Code** (WRONG):
```javascript
export const safeFetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data; // Returns {} on error - WRONG!
  } catch (error) {
    console.warn('Failed to fetch:', error);
    return {}; // Silent failure
  }
};
```

**Fixed Code**:
```javascript
export const safeFetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);

    // Check for HTTP errors (4xx, 5xx)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));

      const error = new Error(
        errorData.error || `HTTP ${response.status}`
      );
      error.status = response.status;
      error.response = errorData;

      throw error;
    }

    const data = await response.json();
    return data;

  } catch (error) {
    // LOG the real error
    console.error('[safeFetchJson] ❌ API Error:', {
      url,
      status: error.status,
      message: error.message,
      response: error.response,
    });

    // RE-THROW so caller knows something failed
    throw error;
  }
};
```

**Update OnboardingGuard.jsx** to handle errors properly:

```javascript
const checkOnboardingStatus = async () => {
  try {
    const profileResponse = await apiClient.get('/profile');

    if (!profileResponse) {
      throw new Error('Profile response is empty - backend returned no data');
    }

    if (profileResponse.onboardingCompletedAt) {
      // Returning user
      console.log('[OnboardingGuard] ✅ Returning user detected');
      // ... redirect logic
    } else {
      // New user
      console.log('[OnboardingGuard] 🆕 New user detected');
      setIsCheckingOnboarding(false);
    }
  } catch (error) {
    // EXPLICIT error logging
    console.error('[OnboardingGuard] ❌ Profile fetch failed:', {
      message: error.message,
      status: error.status,
      response: error.response,
    });

    // DON'T SILENTLY CONTINUE
    // Show user what went wrong
    setError(error.message);
    setIsCheckingOnboarding(false);
  }
};
```

---

## 🎯 STEP-BY-STEP EXECUTION (15 minutes)

### 1. Verify DB Column (2 minutes)
```sql
-- In Neon SQL Editor
SELECT column_name
FROM information_schema.columns
WHERE table_name='profiles'
AND column_name='is_premium';
```

### 2. If NOT found → Run migration (5 minutes)
Copy-paste the full SQL migration above

### 3. If found → Restart backend (3 minutes)
Go to Render, click "Reboot"

### 4. Fix profile creation idempotency (5 minutes)
Replace saveBasics() function with code above

### 5. Fix error swallowing (3 minutes)
Update safeFetchJson to throw errors instead of returning {}

### 6. Test (2 minutes)
```
1. Open app
2. Sign in
3. Should see profile fetch either succeed or show REAL error
4. No more silent failures
```

---

## ✅ EXPECTED RESULT AFTER THESE FIXES

```
BEFORE:
  User signs in
  OnboardingGuard tries to fetch profile
  Backend: "is_premium doesn't exist" (500)
  safeFetchJson swallows error
  OnboardingGuard gets empty {}
  "Failed to fetch profile" shown to user
  ❌ User blocked from app

AFTER:
  User signs in
  OnboardingGuard tries to fetch profile
  Backend: Columns exist, returns profile data
  safeFetchJson returns real data
  OnboardingGuard: Detects returning user OR new user
  ✅ User sees correct screen (dashboard or onboarding)
```

---

## 🔴 MUST DO FIRST

**The BLOCKER is the database.**

```
1️⃣ Check if is_premium column exists
2️⃣ If NO → Run the migration SQL
3️⃣ If YES → Restart backend on Render
4️⃣ Test app
5️⃣ If still broken → DM me logs
```

DO NOT fix anything else until this works.

---

**Priority**: 🔴 CRITICAL
**Time**: 15 minutes
**Blocker**: Database schema mismatch
**Next**: Then fix the architectural issues
