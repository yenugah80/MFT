# 🛡️ OnboardingGuard - Technical Reference

**Component:** `mobile/components/OnboardingGuard.jsx`
**Integrated in:** `mobile/app/_layout.jsx` (line 117)
**Hook Dependency:** `useAuth()` from Clerk, `useRouter()` from Expo Router
**API Call:** `GET /profile/basics` (checks `onboardingCompletedAt` field)

---

## 📖 HOW IT WORKS

### State Management
```javascript
const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
```
- **true** → Loading state, shows ActivityIndicator
- **false** → Check complete, renders children (routes)

### Effect Hook Trigger
```javascript
useEffect(() => {
  if (!isLoaded || !isSignedIn) {
    setIsCheckingOnboarding(false);
    return; // Not signed in, skip check
  }
  // ... fetch profile and check status
}, [isLoaded, isSignedIn, router]);
```

**Runs when:**
- Component mounts
- User signs in/out
- Auth state changes

### Decision Tree
```
START
├─ Is user signed in?
│  ├─ NO → Stop checking, show children (routes)
│  └─ YES → Continue
├─ Fetch /profile/basics
│  ├─ Error → Check AsyncStorage draft
│  │          ├─ Has draft → Allow (resuming)
│  │          └─ No draft → Allow (assume new)
│  └─ Success → Check onboardingCompletedAt
│               ├─ Exists → Returning user
│               │          ├─ Clear drafts
│               │          └─ Redirect to dashboard
│               └─ Missing → New user
│                           └─ Allow onboarding
└─ Done checking
```

---

## 🔌 INTEGRATION DETAILS

### Location in Component Hierarchy
```javascript
<ClerkProvider>
  <NotificationProvider>
    <ApiInitializer>                    {/* Provides apiClient */}
      <SafeScreen>
        <OnboardingGuard>               {/* Guard here */}
          <Slot />                      {/* Routes here */}
        </OnboardingGuard>
      </SafeScreen>
    </ApiInitializer>
  </NotificationProvider>
</ClerkProvider>
```

### Why This Order Matters?
1. **ClerkProvider first** ✅
   - Provides `useAuth()` hook
   - Initializes auth state
   - OnboardingGuard depends on this

2. **ApiInitializer before OnboardingGuard** ✅
   - Initializes `apiClient`
   - OnboardingGuard needs this to call `/profile/basics`

3. **OnboardingGuard before Slot** ✅
   - Intercepts route navigation
   - Redirects returning users before routes render

4. **SafeScreen around everything** ✅
   - Handles iPhone notch, safe areas
   - Ensures safe spacing for all content

---

## 🔐 SECURITY CONSIDERATIONS

### Authentication Check
```javascript
const { isSignedIn, isLoaded } = useAuth();
if (!isLoaded || !isSignedIn) {
  setIsCheckingOnboarding(false);
  return;
}
```
- Only checks profile if user is authenticated
- Unauthenticated users skip check (safe)

### Token Handling
- Uses existing Clerk auth system
- `apiClient` automatically includes auth headers
- No token manipulation needed

### API Endpoint Safety
- Calls `/profile/basics` which requires authentication
- Backend validates `Authorization` header
- Returns only user's own profile data

---

## 🧭 ROUTING BEHAVIOR

### Redirect Mechanism
```javascript
setTimeout(() => {
  router.replace('/(tabs)/dashboard');
}, 100);
```

**Why 100ms delay?**
- Allows navigation state to settle
- Prevents race conditions with router
- User won't notice (too fast for human perception)

**Why `replace()` not `push()`?**
- `replace()` removes current route from stack
- Prevents user from hitting back button to return to onboarding
- `push()` would add to stack (bad - allows navigation back)

### Routes Protected
Returning users redirected away from:
- `/onboarding/step-1`
- `/onboarding/step-2`
- `/onboarding/step-3`
- `/onboarding/step-4`
- Any other onboarding route

Returning users directed to:
- `/(tabs)/dashboard` (always)

---

## 💾 ASYNCSTORAGE INTEGRATION

### Draft Detection
```javascript
const savedDraft = await AsyncStorage.getItem('@onboarding_draft');
if (savedDraft) {
  console.log('Found onboarding draft - user can resume');
  setIsCheckingOnboarding(false);
}
```

### Draft Cleanup (Returning Users)
```javascript
await AsyncStorage.removeItem('@onboarding_draft');
await AsyncStorage.removeItem('@onboarding_current_step');
```

**Two keys removed:**
1. `@onboarding_draft` - Saved step data
2. `@onboarding_current_step` - Which step they were on

**Why clean up?**
- Returning user shouldn't resume old draft
- Ensures fresh state on return
- Prevents state corruption

---

## 🌐 OFFLINE BEHAVIOR

### Scenario 1: Backend API Available ✅
```
OnboardingGuard calls /profile/basics
  ↓
Success → Check onboardingCompletedAt
  ↓
Route accordingly
```

### Scenario 2: Backend Offline ⚠️
```
OnboardingGuard calls /profile/basics
  ↓
Error (no internet)
  ↓
Check AsyncStorage for '@onboarding_draft'
  ├─ Found → Allow (user can resume draft)
  └─ Not found → Allow (assume new user)
```

**Why allow both offline cases?**
- **With draft** → User was clearly in onboarding, should continue
- **No draft** → Could be new user or returning user (safest to allow)
- Returning users without draft are rare (OnboardingGuard clears them)

---

## 🐛 DEBUGGING

### Enable Detailed Logging
The component includes console logs with emojis:
```javascript
// In browser/React Native dev tools console:
'[OnboardingGuard] ✅ Returning user detected...'
'[OnboardingGuard] 🆕 New user detected...'
'[OnboardingGuard] ⚠️ Could not verify...'
'[OnboardingGuard] Cleared onboarding draft data'
```

### Debug Steps
1. Open React Native debugger/console
2. Filter for `[OnboardingGuard]` logs
3. Check state transitions:
   - `isCheckingOnboarding` → false = check done
   - Redirect logs = returned user detected

### Common Issues

**Issue: Loading spinner never disappears**
```
Cause: Guard stuck in infinite loop
Fix: Check network connectivity
     Check Clerk auth initialization
     Check apiClient configuration
```

**Issue: Returning user not redirected**
```
Cause: profile.onboardingCompletedAt not set in database
Solution: Verify /profile/onboarding-complete was called
          Check server logs for completion endpoint
          Manual update: UPDATE profiles SET onboarding_completed_at = NOW()
```

**Issue: New user can't start onboarding**
```
Cause: profile.onboardingCompletedAt exists when it shouldn't
Solution: Check why completed onboarding but showed as new
          Verify /profile/onboarding-complete response
```

---

## 🧪 UNIT TESTING (If Needed)

### Test Case Template
```javascript
describe('OnboardingGuard', () => {
  test('redirects returning user to dashboard', async () => {
    // Mock useAuth to return signed in
    // Mock apiClient.get to return profile with onboardingCompletedAt
    // Render OnboardingGuard
    // Assert router.replace called with '/(tabs)/dashboard'
  });

  test('allows new user to see onboarding', async () => {
    // Mock useAuth to return signed in
    // Mock apiClient.get to return profile WITHOUT onboardingCompletedAt
    // Render OnboardingGuard
    // Assert children rendered
  });

  test('handles API errors gracefully', async () => {
    // Mock useAuth to return signed in
    // Mock apiClient.get to throw error
    // Mock AsyncStorage.getItem to return null (no draft)
    // Render OnboardingGuard
    // Assert children rendered (safest default)
  });
});
```

---

## 📊 PERFORMANCE IMPACT

| Aspect | Impact | Notes |
|--------|--------|-------|
| Load Time | +100-200ms | API call to check status |
| Render Performance | Negligible | Guard is lightweight |
| Network Usage | ~1 KB | Single API call to /profile/basics |
| CPU Usage | Minimal | Simple conditionals and async calls |

**Overall:** Negligible performance impact for better UX

---

## 🔄 RELATIONSHIP TO ONBOARDING CONTEXT

### Before OnboardingGuard
```
OnboardingContext.js handles:
- Step navigation
- Data validation
- Profile saving
- ❌ NOT routing to dashboard (no return user check)
```

### After OnboardingGuard
```
OnboardingGuard handles:
- Detecting returning users (✅ NEW)
- Redirecting to dashboard (✅ NEW)

OnboardingContext.js still handles:
- Step navigation (unchanged)
- Data validation (unchanged)
- Profile saving (unchanged)
```

**Result:** Clear separation of concerns
- Guard handles navigation/routing
- Context handles state/data

---

## 📝 MIGRATION NOTES

### For Existing Users
- Users who completed onboarding before OnboardingGuard deployment will have `profile.onboardingCompletedAt` set in database
- After deployment, OnboardingGuard will detect these and redirect correctly
- No action needed for existing users

### For New Users
- New users signing up after deployment
- Will go through normal onboarding flow
- OnboardingGuard will allow them to complete
- Upon return, will be detected and redirected

### Database Field
- Field: `onboarding_completed_at` in `profiles` table
- Type: `TIMESTAMP`
- Set by: `/api/profile/onboarding-complete` endpoint
- Checked by: OnboardingGuard.jsx

---

## 🚀 DEPLOYMENT

1. **Code Deployment**
   - No new dependencies required
   - OnboardingGuard.jsx is pure JavaScript
   - Import already added to app/_layout.jsx

2. **Database Migration**
   - Not needed for OnboardingGuard
   - Database should have `onboarding_completed_at` field already
   - Verify with: `SELECT * FROM profiles LIMIT 1;` (should see the column)

3. **Testing**
   - New user: Signs in → Sees onboarding ✅
   - Returning user: Signs in → Sees dashboard ✅
   - Offline: App works without API ✅

4. **Rollback**
   - Remove OnboardingGuard import from app/_layout.jsx
   - Remove OnboardingGuard wrapper from JSX
   - Redeploy
   - (No database changes to rollback)

---

## 📞 SUPPORT

**If OnboardingGuard stops working:**
1. Check Clerk auth initialization
2. Check apiClient initialization
3. Verify `/profile/basics` API endpoint responds
4. Check `onboarding_completed_at` field exists in database
5. Check console logs for error messages

**If users report issues:**
- Check if `profile.onboardingCompletedAt` is set in database
- Check network connectivity in device
- Check Clerk tokens are valid
- Clear app cache and reinstall if needed

---

**Version:** 1.0
**Created:** January 3, 2026
**Last Updated:** January 3, 2026
**Status:** Production Ready
