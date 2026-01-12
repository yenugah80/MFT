# Dashboard Loading Issue - Diagnostics & Solutions

**Symptom:** Dashboard shows skeleton loaders but never loads data

**Likely Cause:** The `/api/orchestrator/run` endpoint is failing or returning null

---

## Quick Diagnostics

### Step 1: Check Metro Console for Errors

Look at the Metro bundler console (terminal where you ran `npm start`):

```bash
# You should see:
[useOrchestrator] Error fetching orchestrator: ...
```

**If you see this error, record it and proceed to Step 3**

---

### Step 2: Check Browser/Device Console

On iOS Simulator:
- Open Safari Dev Tools → Debug → MyFoodTracker
- Look for `[useOrchestrator]` logs

On Android:
- Use `adb logcat | grep -i "orchestrator\|react-native"`

**Look for any error messages like:**
```
[API] POST /orchestrator/run
[API] ❌ HTTP 500 /orchestrator/run
[useOrchestrator] Error fetching orchestrator: ...
```

---

### Step 3: Test Backend Endpoint Directly

Create a test file to verify the orchestrator endpoint:

```bash
# 1. Save your user's Clerk token (from app)
# 2. Test the endpoint:

curl -X POST \
  https://myfoodtracker.onrender.com/api/orchestrator/run \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# You should get:
# {
#   "success": true,
#   "userId": "...",
#   "decision": { ... },
#   "correlations": [ ... ],
#   ...
# }
```

---

## Common Issues & Fixes

### Issue 1: 401 Unauthorized (Missing Token)

**Error:**
```
HTTP 401 at /api/orchestrator/run
```

**Cause:** Clerk token not being sent

**Fix:**
1. Verify user is logged in:
   ```javascript
   // In DashboardContent or a debug component
   const { userId } = useAuth();
   console.log('[Auth] Current user:', userId);
   ```

2. Check token provider is set:
   ```javascript
   // Check app/_layout.jsx
   // Should have: apiClient.setTokenProvider(() => user?.getIdToken())
   ```

3. If user is not logged in, clear Clerk cache:
   ```bash
   # iOS
   rm -rf ~/Library/Developer/CoreSimulator/Devices/*/data/Library/Application\ Support/com.apple.nsurlsessiond/

   # Android
   adb shell pm clear com.google.android.gms
   ```

---

### Issue 2: 404 Not Found (Endpoint Not Registered)

**Error:**
```
HTTP 404 at /api/orchestrator/run
```

**Cause:** Route not registered in backend

**Fix:**
1. Verify route is registered in `backend/src/server.js`:

```javascript
// Should have on line ~274:
import orchestratorRouter from "./routes/orchestrator.js";
app.use("/api/orchestrator", orchestratorRouter);
```

2. Verify endpoint exists in `backend/src/routes/orchestrator.js`:

```javascript
router.post('/run', requireAuth(), async (req, res) => {
  // Should exist
});
```

3. If not, the orchestrator route wasn't created. Check:
   - [ ] `backend/src/routes/orchestrator.js` exists
   - [ ] `backend/src/server.js` imports and registers it
   - [ ] Backend is running: `npm run dev` in `/backend` directory

---

### Issue 3: 500 Internal Server Error (Backend Crash)

**Error:**
```
HTTP 500 at /api/orchestrator/run
Error: User not found
```

**Common Causes:**

#### 3a: User Profile Doesn't Exist
```
Error: User not found: user_xxxxx
```

**Fix:** Create a user profile first
1. Go to Profile screen in app
2. Fill out and save profile
3. Return to Dashboard

#### 3b: Missing Correlation Engine
```
Error: computeUserCorrelations is not defined
```

**Fix:** Verify correlationEngineService is imported in orchestrator service
```javascript
// backend/src/services/recommendationOrchestratorService.js
// Line 32-35 should have:
import {
  computeUserCorrelations,
  getUserCorrelations,
  saveCorrelation,
} from './correlationEngineService.js';
```

#### 3c: Database Connection Failed
```
Error: Connection timeout / Cannot connect to database
```

**Fix:**
1. Check Neon database is running:
   ```bash
   curl -s https://console.neon.tech  # Verify service status
   ```

2. Verify `DATABASE_URL` environment variable:
   ```bash
   # backend/.env should have:
   DATABASE_URL=postgresql://...@...neon.tech/...
   ```

3. Restart backend:
   ```bash
   cd backend
   npm run dev
   ```

---

### Issue 4: Timeout (Orchestrator Takes Too Long)

**Symptom:** Loading forever, then error

**Cause:** Backend taking >10 seconds to respond

**Reason:** `computeUserCorrelations` is expensive (scans all meals, computes correlations)

**Fix Options:**

**Option A: Add Caching** (Best)
```javascript
// backend/src/services/recommendationOrchestratorService.js
// Cache for 1 hour
const CACHE_KEY = `orchestrator_${userId}`;
const cached = await getCache(CACHE_KEY);
if (cached) return cached;

const result = await orchestrateDailyRecommendations(userId);
await setCache(CACHE_KEY, result, 3600);
return result;
```

**Option B: Increase Timeout** (Quick fix)
```javascript
// mobile/hooks/useOrchestrator.ts
// Line ~30: Add _timeout option
const fetchOrchestrator = async (): Promise<OrchestratorResult> => {
  const response = await apiClient.post('/orchestrator/run', {}, {
    _timeout: 30000  // 30 second timeout instead of 10s
  });
  // ...
};
```

**Option C: Optimize Correlation Computing** (Best long-term)
```javascript
// Only compute if not already computed today
// Skip expensive operations if user has <10 meals
// Use daily cache with Redis
```

---

## Detailed Debugging Steps

### Step A: Add Console Logging

In `mobile/hooks/useOrchestrator.ts`, add logging:

```typescript
const fetchOrchestrator = async (): Promise<OrchestratorResult> => {
  try {
    console.log('[useOrchestrator] Starting fetch...');
    const response = await apiClient.post('/orchestrator/run', {});
    console.log('[useOrchestrator] Response:', response);

    if (response === undefined || response === null) {
      throw new Error('Empty response');
    }

    console.log('[useOrchestrator] Decision:', response.decision);
    console.log('[useOrchestrator] Correlations:', response.correlations?.length);

    return response;
  } catch (error) {
    console.error('[useOrchestrator] Error:', error);
    throw error;
  }
};
```

### Step B: Add Backend Logging

In `backend/src/routes/orchestrator.js`, add detailed logs:

```javascript
router.post('/run', requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  console.log(`[API] POST /orchestrator/run - User: ${userId}`);

  try {
    console.log(`[API] Calling orchestrateDailyRecommendations...`);
    const result = await orchestrateDailyRecommendations(userId);

    console.log(`[API] Result:`, {
      success: result.success,
      decision: result.decision?.type,
      correlations: result.correlations?.length,
      lifecycle: result.lifecycle?.stage,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(`[API] Error in /orchestrator/run:`, error.message);
    console.error(`[API] Stack:`, error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});
```

### Step C: Check Backend Logs

```bash
# If running locally:
cd backend
npm run dev 2>&1 | tee debug.log

# Look for patterns:
grep "orchestrat" debug.log
grep "ERROR\|error" debug.log
```

---

## Verification Checklist

- [ ] User is logged in (check Auth context)
- [ ] User profile exists (check Profile screen)
- [ ] Backend is running (`npm run dev` in `/backend`)
- [ ] Clerk token is being passed in headers
- [ ] Orchestrator route is registered in `server.js`
- [ ] `orchestrateDailyRecommendations` function is fully implemented
- [ ] Database connection is working
- [ ] At least one food has been logged

---

## If Still Not Working

1. **Check Backend Logs**
   ```bash
   cd backend
   npm run dev 2>&1 | head -100
   ```

2. **Check Frontend Logs**
   ```bash
   # Metro console should show:
   [useOrchestrator] Error fetching orchestrator: ...
   ```

3. **Test Endpoint Manually**
   ```bash
   # Get your token from app (copy from console)
   curl -v -X POST \
     https://myfoodtracker.onrender.com/api/orchestrator/run \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{}'
   ```

4. **Check Database**
   ```sql
   -- Run in Neon console
   SELECT COUNT(*) FROM profiles WHERE user_id = 'your_user_id';
   SELECT COUNT(*) FROM food_logs WHERE user_id = 'your_user_id';
   ```

---

## Expected Output

When working correctly, you should see:

**Frontend Console:**
```
[API] POST /orchestrator/run
[API] 200 /orchestrator/run
[useOrchestrator] Response: {success: true, decision: {...}, ...}
```

**Backend Console:**
```
[API] POST /orchestrator/run - User: user_xxxxx
[API] Calling orchestrateDailyRecommendations...
[Orchestrator] Starting daily orchestration for user: user_xxxxx
[Orchestrator] User user_xxxxx stage: TRACKER
[Orchestrator] Found 5 correlations for user user_xxxxx
[Orchestrator] Decision: SPEAK (has_strong_pattern)
[Orchestrator] Daily orchestration complete for user user_xxxxx
```

**Dashboard Display:**
```
- Decision card shows (e.g., "High-NOVA foods detected")
- Lifecycle footer shows stage progress
- Correlations list shows 2-6 patterns
- No error boundary visible
```

---

## Next Steps

1. **Identify which issue applies** - Run the diagnostics above
2. **Apply the fix** - Follow the solution for your issue
3. **Test the endpoint** - Use curl to verify it works
4. **Reload app** - Do a hard refresh or rebuild app
5. **Check logs** - Verify no errors in console

If you're still stuck, check the detailed logs and share:
- Frontend console error (from Metro)
- Backend console logs (from `npm run dev`)
- Curl response from endpoint
- Database query results

---

## Files to Check

**Frontend:**
- [mobile/hooks/useOrchestrator.ts](mobile/hooks/useOrchestrator.ts) - Fetch hook
- [mobile/services/apiClient.js](mobile/services/apiClient.js) - Token handling
- [mobile/app/_layout.jsx](mobile/app/_layout.jsx) - Token provider setup

**Backend:**
- [backend/src/routes/orchestrator.js](backend/src/routes/orchestrator.js) - Route handler
- [backend/src/server.js](backend/src/server.js) - Route registration (line ~274)
- [backend/src/services/recommendationOrchestratorService.js](backend/src/services/recommendationOrchestratorService.js) - Logic
- [backend/src/services/correlationEngineService.js](backend/src/services/correlationEngineService.js) - Correlation computation

---

**Generated:** January 11, 2026
**Status:** Ready to debug
