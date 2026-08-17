# "Your Progress" analytics screen — handoff note (2026-08-16)

Written by a separate concurrent session that was fixing demo-account data
integrity and stumbled into several UI bugs on this screen while verifying
the fix. That session paused rather than keep editing files this one already
has open (`useAnalytics.js`, `unifiedAnalyticsEngine`/`analyticsRecommendationService.js`,
`ActivityTab.jsx`, `NutritionTab.jsx`, `MoodTab.jsx`, `HydrationTab.jsx`,
`WellnessTab.jsx`) — logging what was found here instead of duplicating work.

## Uncommitted changes already sitting in the working tree from that session

Small, tested, backward-compatible — but on top of your in-progress edits, so
reconcile rather than blindly overwrite:

- **`backend/src/services/analyticsRecommendationService.js`**: `getUserDataStats(userId, lookbackDays, offsetMinutes = 0)` — "today" was computed via `new Date(now.getFullYear(), now.getMonth(), now.getDate())`, i.e. the **server's** local timezone, not the requesting user's. Now uses `getLocalDayRange(offsetMinutes, now).start` from `utils/timezone.js` (the same helper `nutrition.js` already uses correctly). Default `0` preserves exact prior behavior for the 3 callers that don't pass an offset (`mtl/index.js` x3, `intelligenceOrchestratorService.js`).
- **`backend/src/routes/unifiedAnalytics.js`**: `/analytics/recommendations` now parses `X-Timezone-Offset` via `parseTimezoneOffsetMinutes(req)` and passes it through.
- **`mobile/hooks/useAnalytics.js`**: the `nutrition` memo's fallback path read `dashData?.calories`, `dashData?.macros`, `dashData?.recentMeals` — **none of these keys have ever existed** on the `/nutrition/dashboard` response. Real fields are `dashData.today.nutrition.{totalCalories,totalProtein,totalCarbs,totalFats}`, `dashData.goals.{dailyCalories,proteinG,carbsG,fatsG}`, `dashData.today.foodLogs`. Fixed to read the real shape. This fallback only engages when `recommendationsQuery` (the primary source) is unavailable, so it was silently dead before — low risk, but confirm it doesn't collide with whatever `recStats` shape your decision-brain migration ends up using.

Verified: `npx jest` — 489 mobile + 117 backend tests green. **Not deployed** (`railway up` never run). Not committed.

## Bugs found, not yet fixed by that session (left for you)

1. **Day/Week/Month toggle is mostly cosmetic.**
   - Activity tab: `useAnalytics.js`'s `activityQuery` calls `GET /activity/analytics/dashboard` with **no period param**; the route (`activity.js:441`) and `activityAnalyticsService.getDashboardAnalytics`/`getWeekData` always compute a fixed last-7-days window regardless. `ActivityTab.jsx:139` hardcodes the card title `"This Week"` regardless of selected period.
   - Nutrition tab: the "Weekly Macro Averages" card shows the *identical* numbers under Day, Week, and Month (screenshotted live: 108g/166g/68g unchanged across all three). Source is `dashData.trends.weeklyAverages` from `/nutrition/dashboard`, which takes no period param and is always a trailing-7-day figure. Nothing rescales or relabels it per the selected tab.
   - Existing code comment (already in `analyticsRecommendationService.js` before either session touched it) confirms this is at least partly intentional: `weeklyMinutes`/`avgIntensityThisWeek` etc. are "deliberately pinned to a literal 7 days... regardless of this param" for CDC-guideline messaging reasons — but the UI gives the user no signal that a given card is fixed-weekly vs. period-scoped, so it just reads as broken.
2. **Mood tab field mismatch**: live screenshot shows "43 Entries logged" and a real "Mood Distribution: Happy 14%" bar, but "Top Mood: N/A" and "Most common mood: N/A". Same class of bug as the nutrition one above (a field the frontend reads doesn't match what the backend/mood aggregation actually returns) — not diagnosed further, just confirmed real and reproducible.
3. **No cache invalidation between logging and this screen.** `hooks/useActivityLog.js`'s log/delete mutations invalidate `['activityToday']`, `['activityWeek']`, `['activityHistory']`, `['dashboard']` — never `['analytics-unified', period]` / `['analytics-recommendations', period]`, which is what `useAnalytics.js` actually keys its queries on. Combined with 2–5 min `staleTime`, AsyncStorage persistence (`providers/QueryProvider.jsx`), and no refetch-on-focus in `app/analytics/index.jsx`, a user can log a meal/workout and still see a stale/empty "Your Progress" for minutes.
4. **"Done"/"Later" buttons on recommendation cards are no-ops, on all five tabs.** `components/analytics/RecommendationCard.jsx` expects `onComplete`/`onDismiss`/`onAction`/`onTrackShown`/`onRecordSatisfaction` props. None of `ActivityTab.jsx`, `NutritionTab.jsx`, `MoodTab.jsx`, `HydrationTab.jsx`, `WellnessTab.jsx` pass them (verified via grep — zero matches). "Done" plays a haptic then shows a satisfaction `Alert` whose answer is silently swallowed (`trackingId` never set, falls into a `console.warn`-only branch). "Later" does nothing visible. Tapping the card row itself (not the buttons) correctly navigates via `router.push`, so that part works.
5. **Orphaned code, low priority**: `mobile/constants/emptyStateConfig.js` defines a full `ACTIVITY_EMPTY_STATES` config (title, CTAs, quick-add options) with **zero call sites** anywhere in the app. Not the actual source of the Activity tab's empty state (that's `AnalyticsEmptyState` + hardcoded strings in `ActivityTab.jsx`). Worth confirming whether it's meant to replace the current empty-state code or should just be deleted.

## User's redesign asks for this screen (their words, lightly cleaned up from voice input)

- Fix the Activity-tab inconsistent behavior — covers items 1–4 above.
- **A separate, dedicated screen for food/nutrition analysis** — distinct from the combined multi-domain "Your Progress" tab bar (Wellness/Nutrition/Mood/Activity/Hydration). Their exact phrasing was ambiguous ("not in a way of use core history and viewing your progress... with all other as whole") — read as: they don't want it to just be the existing Nutrition tab, they want a standalone screen scoped only to food. **Needs a direct clarifying question before building** — scope, navigation entry point, and relationship to the existing Nutrition tab are all unconfirmed.
- Proper Day/Week/Month categorization throughout, i.e. fix #1 above for real — each period should show genuinely different, period-scoped numbers, not the same figures everywhere.
- A general redesign pass on Activity + "Your Progress" once the underlying data wiring is correct — no specifics given yet.

## Demo account context (not code — so numbers don't look newly broken)

The demo account (`user_3HgUj90Az5gLi0FTw95ADqHijw2`, `support@my-food-tracker.com`)
had its `activity_log`/`food_log`/`water_log`/`mood_log`/`daily_nutrition_summary`/
`gamification.daily_challenge_state` cleaned up today: de-duplicated (two
independent seeding passes had overlapped for ~25 days), timezone-boundary
corrected (this Mac runs America/New_York; several seeded rows landed on the
wrong local calendar day), and topped up so the current week's data honestly
clears the app's own daily-challenge thresholds (Perfect Week, Ocean Mastery,
Calorie Conscious, etc.) rather than needing faked state. If you see clean
36-day history with realistic per-day meal/water/mood/activity counts, that's
expected — it's real seeded data, not a rendering bug.
