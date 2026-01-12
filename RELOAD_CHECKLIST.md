# Dashboard Reload Checklist ✅

**Status:** Metro bundler is running and ready
**Base URL:** http://localhost:8081
**Metro Status:** 🟢 Packager running

---

## What to Do

1. **Reload the Simulator/App**
   - Press `R` in Metro console (if attached)
   - Or shake device → Select "Reload"
   - Or close and reopen the app

2. **Watch for Changes**
   - Should see new Metro logs appear
   - App should reload and show fresh data

---

## Expected Results After Reload ✅

### Dashboard Loads
- [ ] No more skeleton loaders stuck forever
- [ ] Dashboard content visible

### Daily Intelligence Section
- [ ] Shows "Daily health intelligence" heading
- [ ] Decision card visible with:
  - [ ] Headline: "You're consuming high-NOVA foods"
  - [ ] Subtitle: "Ultra-processed foods may be affecting..."
  - [ ] Confidence badge: "High" (82%)
  - [ ] Description and actions

### Pattern Correlations
- [ ] Shows "Other Patterns" section with 2+ cards:
  - [ ] Correlation 1: "High NOVA food intake → Energy dips"
    - Confidence: 78%
    - Occurrences: 12
    - Affected domains: energy, mood
  - [ ] Correlation 2: "Dehydration → Poor focus"
    - Confidence: 71%
    - Occurrences: 8
    - Affected domains: focus, clarity

### Lifecycle Footer
- [ ] Shows stage: "TRACKER"
- [ ] Shows progress: "8 of 23 days"
- [ ] Progress bar visible

### Wellness Section
- [ ] Hydration tracker card visible
- [ ] Water intake progress visible
- [ ] No crashes in wellness section

### No Errors
- [ ] Metro console shows no ERROR messages
- [ ] No "hasLoggedToday" errors
- [ ] No "404" errors with fallback message

---

## What the Metro Console Should Show

**Good Signs:**
```
[useOrchestrator] Endpoint not found (404) - using mock data
```
This is EXPECTED and CORRECT - means fallback to mock is working

**Also OK:**
```
[Orchestrator] Decision: SPEAK
[Orchestrator] Found 2 correlations
```
Once real backend data is available

**Bad Signs (ERRORS):**
```
ERROR: ReferenceError: Property 'hasLoggedToday' doesn't exist
ERROR: Cannot read property 'orchestratorData' of undefined
ERROR: [useOrchestrator] Error fetching orchestrator: [Error other than 404]
```

---

## How to View Metro Console

**In VSCode:**
- Open integrated terminal where Metro is running
- Watch for new logs as app loads

**In Safari (iOS):**
1. Open Safari on Mac
2. Go to Develop → [Device Name] → MyFoodTracker
3. Go to Console tab
4. Search for "orchestrator" or "ERROR"

**Using adb (Android):**
```bash
adb logcat | grep -i "orchestrator\|error"
```

---

## If You See Errors

### Error: "hasLoggedToday" still shows
- Code wasn't reloaded - try hard refresh
- Press `R` twice in Metro
- Or restart: `npm start` again

### Error: Different 404 path shows
- Other endpoints missing - not critical
- Dashboard should still load
- Real data will work once backend deploys

### Error: "Cannot read property 'orchestratorData'"
- Component rendering without data
- Should have been fixed
- Check that DailyIntelligenceBehaviorSection has guard: `if (!orchestratorData) return null`

---

## Success Indicators 🎉

✅ Dashboard loads without skeleton loaders forever
✅ Shows NOVA foods insight card
✅ Shows 2+ pattern correlations
✅ Shows lifecycle stage progression
✅ Wellness section works without crashes
✅ No ERROR messages in console (only info/debug logs)
✅ Can scroll through all sections smoothly

---

## Next Steps If All Works

1. **Test interactions:**
   - Try tapping on a correlation card (should expand)
   - Try dismissing a pattern (tap X button)
   - Check if modal opens

2. **Test other sections:**
   - Scroll down to nutrition section
   - Check wellness/hydration section
   - Verify progress section loads

3. **Monitor for real backend:**
   - Once deployed, real data will replace mock
   - Should see actual user's correlations
   - No code changes needed

---

**Ready?** Reload the app and let me know what you see! 📱
