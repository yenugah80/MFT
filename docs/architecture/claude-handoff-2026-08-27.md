# Claude handoff — wellness redesign and live wiring

Date: 2026-08-27

Workspace: `/Users/harikay/Desktop/MFT`

Primary user requirement: production-grade UI/UX backed by live APIs and the real database. Do not replace real data with fixtures or leave visible controls unwired.

## Start here

1. Read the repository-root `CLAUDE.md` and `agents/design-system.md` before editing UI.
2. Read this entire handoff and `design-qa.md`.
3. Run `git status --short` and inspect diffs before editing. The worktree is intentionally very dirty and contains user/session work across backend and mobile.
4. Do **not** reset, checkout, delete, reformat, or overwrite unrelated changes. In particular, `mobile/components/log/MealSummary/NutriScoreCard.jsx` is currently deleted; treat that deletion as existing work, not cleanup.
5. Backend deployment is manual. Do not assume a push deploys Railway. Follow the deployment notes in `CLAUDE.md` and ask before deploying.

## User intent and product direction

The user has repeatedly requested a complete redesign and live integration of:

- Sleep logging, history, KPIs, patterns, and insights.
- Stress logging, including causes, physical symptoms, coping strategies, notes, history, patterns, and insights.
- Dashboard Sleep/Stress cards, History/Insights buttons, excess bottom whitespace, floating-action behavior, and Lottie mood assets.
- The multi-domain `Your Progress` experience for Wellness, Nutrition, Mood, Activity, and Hydration, including genuinely period-scoped Day/Week/Month data and fully wired actions.
- Activity logging and Activity Insights, including recovery, training progress, recommendations, calendar/day-week-month inspection, milestones, mood associations, and smart insights.
- Hydration logging feedback and Undo.

Design expectations throughout:

- Reduce vertical repetition and overwhelming screen length through progressive disclosure.
- Clearly distinguish records, sessions, active days, streaks, samples, and averages.
- Never label a KPI as period-specific if it is actually fixed to a trailing seven-day calculation.
- Patterns are observed associations/averages, not causes. Show sample sizes and data sufficiency.
- Use existing design tokens and Ionicons/Lottie assets; do not replace supplied Lottie mood files with generic icons.
- Every displayed value must trace to a live API/database field or an explicitly labeled calculated metric.

## Current implementation areas

The following files contain the main in-progress implementation. Inspect diffs rather than assuming every line belongs to one session.

### Sleep and stress

- `mobile/components/SleepLogger.jsx`
- `mobile/components/StressLogger.jsx`
- `mobile/app/history/sleep.jsx`
- `mobile/app/history/stress.jsx`
- `mobile/app/insights/sleep-analytics.jsx`
- `mobile/app/insights/stress-patterns.jsx`
- `mobile/components/dashboard/SleepSummaryCard.jsx`
- `mobile/components/dashboard/StressSummaryCard.jsx`
- `mobile/hooks/useSleepLog.js`
- `mobile/hooks/useStressLog.js`
- `backend/src/routes/sleep.js`
- `backend/src/routes/stress.js`
- `backend/src/utils/wellnessHistory.js`
- `mobile/utils/sleepTrends.js`

Relevant regression tests include:

- `mobile/__tests__/wellnessLoggerWiring.test.js`
- `mobile/__tests__/sleepTrends.test.js`
- `mobile/__tests__/log/subjectiveRatings.test.jsx`
- `backend/__tests__/sleepInput.test.js`
- `backend/__tests__/stressInput.test.js`
- `backend/__tests__/wellnessHistory.test.js`

### Dashboard and mood assets

- `mobile/components/DashboardContent.jsx`
- `mobile/components/FloatingActionButton.jsx`
- `mobile/components/dashboard/EnhancedMoodCard.jsx`
- `mobile/components/MoodTracker/MoodIcon3D.jsx`
- `mobile/assets` contains the supplied animation assets; preserve asset-based rendering.

### Your Progress

- `mobile/app/analytics/index.jsx`
- `mobile/components/analytics/ProgressUI.jsx`
- `mobile/components/analytics/WellnessTab.jsx`
- `mobile/components/analytics/NutritionTab.jsx`
- `mobile/components/analytics/MoodTab.jsx`
- `mobile/components/analytics/ActivityTab.jsx`
- `mobile/components/analytics/HydrationTab.jsx`
- `mobile/components/analytics/TimeframeSelector.jsx`
- `mobile/components/analytics/RecommendationCard.jsx`
- `mobile/hooks/useAnalytics.js`
- `backend/src/services/analyticsRecommendationService.js`

Read the older context note `docs/architecture/your-progress-handoff-2026-08-16.md`, but verify it against the current diff because several listed bugs now have changes/tests in the worktree.

Regression tests:

- `mobile/__tests__/analytics/progressDomains.test.jsx`
- `mobile/__tests__/analytics/progressScreenWiring.test.jsx`
- `mobile/__tests__/analytics/moodProgress.test.jsx`
- `mobile/__tests__/analytics/recommendationActions.test.jsx`

### Activity log and Activity Insights

- `mobile/app/(tabs)/activity.jsx`
- `mobile/app/(tabs)/log.js`
- `mobile/app/insights/activity-insights.jsx`
- `mobile/components/ActivityInsightsView.jsx`
- `mobile/components/activity/RecoveryHero.jsx`
- `mobile/components/activity/TrainingCalendar.jsx`
- `mobile/components/activity/TrainingFocusCards.jsx`
- `mobile/components/activity/TrainingPatternCards.jsx`
- `mobile/components/activity/SmartInsightsCard.jsx`
- `mobile/hooks/useActivityLog.js`
- `mobile/utils/activityAnalytics.js`
- `backend/src/routes/activity.js`
- `backend/src/services/activityRecommendationEngine.js`

The latest intended hierarchy is:

1. Today's readiness/recovery.
2. This week's training progress, with active days, sessions, streak, and calendar disclosure grouped together.
3. Today's recommended plan with a prefilled activity-log action.
4. Deeper recovery factors, records, mood associations, and optional AI insights.

Avoid returning to the duplicated layout described in `design-audits/activity-insights-duplication/audit.md`. The authenticated simulator session expired before a final interactive accessibility pass, so that remains required.

Regression tests:

- `mobile/__tests__/analytics/activityInsightsRedesign.test.jsx`
- `mobile/__tests__/log/activityRecommendationPrefill.test.jsx`
- `mobile/__tests__/activityAnalyticsFoundation.test.js`
- `mobile/__tests__/activityCalendar.test.js`
- `backend/src/__tests__/activityRecoveryCoverage.test.js`
- `backend/__tests__/decisionBrainActivityStats.test.js`

## Hydration notification — completed and verified

The oversized blue celebration overlay was replaced with a compact transaction snackbar.

Implementation:

- `mobile/components/HydrationTracker.jsx`
  - 64 pt safe-area-aware snackbar.
  - Deterministic copy: `Hydration updated` plus the exact amount/type.
  - Visible 44 pt Undo target with accessibility label.
  - Polite live-region alert and Reduced Motion support.
  - Confirmation is shown only after the API returns a persisted entry ID.
  - Undo deletes that exact returned ID instead of guessing `beverageHistory[0]`.
- `mobile/app/(tabs)/log.js`
  - Returns the water API response through the component boundary.
  - Rethrows failures after the global error notification.
  - Removes duplicate global success notifications for add/remove.
- `mobile/__tests__/log/hydrationConfirmation.test.jsx`
  - Covers accessible compact UI, deferred success, and exact-ID Undo.

Design evidence:

- `design-audits/hydration-notification/live-confirmation.png`
- `design-qa.md`, section `Hydration transaction notification design QA`.

### Production database precision fix

Live verification exposed a separate P1 data bug: the deployed `water_log.amount_liters` and `hydration_liters` columns were `numeric(3,1)`, so 150 ml (`0.150 L`) silently became 200 ml.

Fix in source:

- `backend/src/db/migrations/0050_water_log_milliliter_precision.sql`
- `backend/src/utils/schemaGuards.js`

Live database state:

- Both columns were safely widened to `numeric(5,3)` on 2026-08-27.
- A temporary 0.150 L verification insert returned exactly `0.150` for both values and was deleted in the same transaction.
- Two earlier verification rows, IDs `457` and `458`, were removed by exact ID after exposing the rounding bug.
- Verification record ID `459` was also deleted. No test hydration records remain from this check.
- Existing historic rows remain at their already-rounded stored values; widening precision cannot reconstruct lost historical milliliters.

The migration still must be committed and applied normally in every other environment even though the currently connected production database has already been widened manually.

## Verified commands and results

Most recent checks:

```bash
cd backend
npm test -- --runInBand
# 21 suites, 233 tests passed

cd mobile
npm run validate
# theme tokens and release config passed

npx jest --config jest.config.js --selectProjects components --runInBand __tests__/log
# 5 suites, 39 tests passed; Jest reports an existing open-handle warning after completion

npx jest --config jest.config.js --selectProjects components --runInBand __tests__/log/hydrationConfirmation.test.jsx
# 1 suite, 2 tests passed cleanly

npx eslint components/HydrationTracker.jsx 'app/(tabs)/log.js' __tests__/log/hydrationConfirmation.test.jsx
# zero errors; 15 pre-existing warnings in Log/HydrationTracker

git diff --check
# passed
```

Do not claim the entire mobile suite is green from the latest turn; only the targeted Log suite and hydration test were rerun after the final hydration change. Run broader suites before release.

## Environment and QA state

- Current date/timezone context: 2026-08-27, America/New_York.
- iPhone simulator: `iPhone 13 Pro Max (ASO)`, UDID `180E60E3-FAC6-4AC3-8EF3-314C197AAA08`.
- Bundle ID: `com.zennxt.myfoodtracker`.
- Metro was running on ports 8081 and 8082 during verification.
- The simulator's authenticated session expired after terminating/relaunching the app and currently shows the Welcome/sign-in screen. Re-authenticate before final live QA; do not seed a fixture as a substitute.
- Demo account used by existing scripts/data checks: `user_3HgUj90Az5gLi0FTw95ADqHijw2` / `support@my-food-tracker.com`. Do not expose or guess its password.
- API base documented by the repo: `https://api.my-food-tracker.com/api`.

## Remaining work before a production release

1. Re-authenticate the simulator and run one complete live add → visible confirmation → Undo flow. Confirm the returned entry disappears and the hydration total returns exactly to its baseline.
2. Re-run visual/accessibility QA for Activity Insights with the real 40-session/39-active-day history. Confirm weekly `4 / 5 active days`, `4 sessions`, and the 90-day `40 sessions across 39 active days` summary are intentionally differentiated.
3. Verify calendar legend, selected-day details, Day/Week/Month aggregation, previous/next month navigation, and empty/loading/error states against live APIs.
4. Re-run live Sleep History, Sleep Patterns, Stress History, Stress Patterns, dashboard History/Insights routes, and all `Your Progress` domain tabs after authentication.
5. Confirm supplied mood Lottie files render on dashboard and mood screens; do not accept generic-icon fallbacks where the assets exist.
6. Run the full mobile test matrix and review the existing Jest open-handle warning. Run backend tests again if backend files change.
7. Review `git diff` by feature and split commits carefully. The worktree combines multiple task streams and should not be committed as one blind bulk change.
8. Apply migration 0050 through the repository migration process in non-production environments. Before any Railway deployment, run `railway status` and obtain user approval for deployment.

## Release blockers / cautions

- No commit was created.
- No Railway backend deployment was performed.
- No mobile production build was produced.
- The currently connected live DB precision change is already applied, but source deployment is still required so future environments and restarts retain the correct schema contract.
- Do not describe the whole redesign as fully production-shipped until the authenticated end-to-end checks above and full mobile suite pass.

## Recommended continuation order

1. Preserve and inventory the dirty tree.
2. Re-authenticate simulator.
3. Complete hydration add/Undo net-zero check.
4. Complete Activity Insights live/calendar/accessibility QA.
5. Recheck Sleep/Stress and Your Progress routes.
6. Run full tests.
7. Present a feature-by-feature release report and ask before commit/deploy.
