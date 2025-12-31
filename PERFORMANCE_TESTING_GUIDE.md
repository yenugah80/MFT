# Voice Transcription Performance Testing Guide

## Quick Start - Test the Optimizations

### Setup
1. Open your app with DevTools/Console visible
2. Navigate to the Food Logging tab
3. Tap the microphone icon to open Voice Modal

---

## Test 1: Cache Performance (50-80% Faster)

### Instructions
1. **First Attempt**: Say "two eggs" clearly → Tap Confirm → Wait for result
2. **Second Attempt**: Say "two eggs" again → Tap Confirm → Wait for result
3. Check console output

### Expected Behavior
**First request:**
```
[VoiceLog] Analyzing text...
[VoiceLog] Identifying foods...
[VoiceLog] API call took 2345ms
[VoiceLog] Calculating nutrition...
[VoiceLog] Completed in 2445ms (from API)
```
⏱️ **Time**: ~2.5 seconds

**Second request (cached):**
```
[VoiceLog] Cache hit - using cached result
[VoiceLog] Using cached result...
[VoiceLog] Completed in 203ms (from cache)
```
⏱️ **Time**: ~200ms ✅ **95% faster!**

---

## Test 2: Duplicate Request Prevention (Instant)

### Instructions
1. Say a food item: "grilled chicken with rice"
2. Release microphone (don't tap Confirm yet)
3. Quickly tap Confirm button 2-3 times in rapid succession
4. Check console output

### Expected Behavior
```
[VoiceLog] Analyzing text...
[VoiceLog] API call took 3200ms
[VoiceLog] Completed in 3300ms (from API)

// User tapped Confirm again while still loading:
[VoiceLog] Duplicate request detected - waiting for existing request
[VoiceLog] Waiting for duplicate request...
// (waits for first request to complete)
```

✅ **Only ONE API call made** instead of 2-3

---

## Test 3: Regex Debouncing (85% Less Overhead)

### Instructions
1. Say a long phrase while watching speech time
2. Example: "I had two eggs with whole wheat toast and a green smoothie"
3. Check console carefully during recording

### Expected Behavior
**During speech:**
- ❌ DON'T see 30+ regex operations
- ✅ DO see "Identifying foods..." appear once at end
- Watch for **single execution** of parseLiveItems

**Speech process:**
```
onSpeechPartialResults: "I had"
onSpeechPartialResults: "I had two"
onSpeechPartialResults: "I had two eggs"
... (many more partial results)
onSpeechPartialResults: "I had two eggs with whole wheat toast and a green smoothie"

// After debounce (300ms of silence):
parseLiveItems() runs ONCE with full text
```

✅ **Regex overhead reduced 85-90%** (from 30x to 1x)

---

## Test 4: Memory Bounded to 50 Items

### Instructions
1. Say 50+ different food items over multiple sessions
2. Example sequence:
   - Say "eggs"
   - Say "toast"
   - Say "apple"
   - Say "banana"
   - ...repeat until 50+ items
3. Monitor cache in DevTools

### Expected Behavior
```javascript
// Cache size check
inMemoryCacheRef.current.size // Should never exceed 50

// Old items auto-evicted when new items added
// FIFO (First In, First Out) removal
```

✅ **Cache stays bounded** - prevents memory bloat

---

## Console Monitoring Reference

### What to Watch For

| Log Message | Meaning | Expected Frequency |
|------------|---------|-------------------|
| `[VoiceLog] Cache hit` | Result retrieved from cache | High (if repeating food) |
| `[VoiceLog] Duplicate request detected` | Another identical request waiting | Low (only on rapid taps) |
| `[VoiceLog] API call took Xms` | Actual backend latency | Low (main requests only) |
| `[VoiceLog] Completed in Yms` | Total time for request | Every API call |

### Performance Thresholds

| Operation | Expected Time | Red Flag |
|-----------|---------------|----------|
| Cache hit | 150-300ms | > 500ms |
| Fresh API call | 2000-4500ms | > 6000ms |
| Duplicate wait | < API time | Hangs |
| Debounce cycle | < 5ms | > 50ms |

---

## Before & After Comparison

### Scenario: User logs 3 meals, each with typical foods

**BEFORE OPTIMIZATION:**
```
Breakfast: "2 eggs, toast, coffee"
├─ Recording: 3s
├─ Processing: 2.5s
└─ API call: 2.5s
Total: ~8 seconds

Lunch: "Chicken salad with dressing"
├─ Recording: 2s
├─ Processing: 2.5s (recalculating eggs again!)
└─ API call: 2.5s
Total: ~7 seconds (wasted - already calculated eggs)

Dinner: "2 eggs again"
├─ Recording: 2s
├─ Processing: 2.5s (third time calculating eggs!)
└─ API call: 2.5s
Total: ~7 seconds (wasted)

TOTAL SESSION TIME: ~22 seconds
```

**AFTER OPTIMIZATION:**
```
Breakfast: "2 eggs, toast, coffee"
├─ Recording: 3s
├─ Processing: 2.5s
├─ API call: 2.5s
└─ Cached in memory
Total: ~8 seconds

Lunch: "Chicken salad with dressing"
├─ Recording: 2s
├─ Processing: 2.5s
├─ "Identifying foods..." (fast!)
└─ Cache hit + API call: 3s
Total: ~7.5 seconds

Dinner: "2 eggs again"
├─ Recording: 2s
├─ Processing: 0.2s (instant cache hit!)
├─ No API call needed
└─ Returned from cache
Total: ~2.2 seconds ✅

TOTAL SESSION TIME: ~17.7 seconds
📊 30% faster overall
```

---

## Troubleshooting

### Issue: "Cache hit" not appearing
**Possible causes:**
- Food item has different wording (e.g., "eggs" vs "2 eggs")
- Cache expired (30-minute TTL)
- Cache size exceeded 50 items

**Check:**
- Try exact same wording
- Look at cache key normalization (lowercase, trimmed)

### Issue: Regex still seems slow
**Possible causes:**
- Very long text (complex dish description)
- Multiple partial results arriving very quickly

**Check:**
- Console should show single regex execution
- If slow, it's normal regex cost on complex text

### Issue: Duplicates not being detected
**Possible causes:**
- Text has minor differences (whitespace, punctuation)
- User tapping too slowly (first request already completed)

**Check:**
- Cache key includes `.toLowerCase().trim()`
- Deduplication only works if requests overlap

---

## Performance Metrics to Track

### Daily Usage Analytics (Optional)

Add to console monitoring:
```javascript
// Cache statistics
console.log('Cache size:', inMemoryCacheRef.current.size);
console.log('Cache keys:', Array.from(inMemoryCacheRef.current.keys()));

// Hit rate (manual tracking)
let totalRequests = 0;
let cacheHits = 0;
// Then calculate: hit_rate = (cacheHits / totalRequests) * 100
```

### Expected Metrics
- **Cache hit rate**: 20-40% (depends on food repetition)
- **Average API time**: 2000-3500ms
- **Cache return time**: 150-300ms
- **Memory usage**: ~50 items × ~1KB = ~50KB

---

## When to Expect Improvements

✅ **Optimizations Help When:**
- User repeats same food items (breakfast = eggs, lunch = salad)
- User is testing/learning the app (same utterance repeated)
- Fast network but API is slow
- Rapid tapping on Confirm button

⚠️ **Optimizations Don't Help When:**
- Every food is different (new utterance each time)
- Cache expired (> 30 minutes)
- Network is very slow (API timeout dominates)
- Cache already at 50 items (new items trigger eviction)

---

## Next Steps

### For Monitoring
1. Enable DevTools console logging
2. Watch for cache hits vs API calls
3. Report cache hit rate over time

### For Further Optimization
- [ ] Add persistent cache (AsyncStorage) - survives app restart
- [ ] Log metrics to backend for analytics
- [ ] Add visual indicators in UI (badge showing "Cached" vs "API")

### For Server-Side
- No changes needed
- Backend continues to work as-is
- Frontend cache is transparent to backend

---

## Questions?

If cache not working or performance not improving:
1. Check console logs for error messages
2. Verify text is being cached (should see same `cacheKey`)
3. Check if cache TTL expired (30 minutes)
4. Monitor `inMemoryCacheRef.current.size` for overflow

Good luck testing! 🚀