# Recommendation & Insight Engine

Written 2026-08-16 after auditing both engines end-to-end while investigating
why the Dashboard and "Your Progress" screens could show different-looking
insights for the same user. This document exists because the codebase
currently contains **two independently-built recommendation/insight engines**
that were never reconciled — this is the map of what each one actually owns,
so a third doesn't get built by accident, and so nobody spends a day
rediscovering this the way the auth doc's author spent a day on sign-in.

---

## The split, stated once

| | **Insight Engine** | **Food Engine** |
|---|---|---|
| Answers | "What pattern should this user know about, and how urgently?" | "What food should I suggest next?" |
| Core service | `backend/src/services/decisionBrainService.js` | `backend/src/services/analyticsRecommendationService.js` |
| Routes | `backend/src/routes/decisionBrain.js` (`/api/decision-brain/*`) | `backend/src/routes/recommendations.js` (`/api/recommendations`), `unifiedAnalytics.js` (`/api/analytics/recommendations`) |
| Consumed today by | `mobile/hooks/useIntelligence.js`, `useOrchestrator.ts` → Dashboard's `DailyIntelligenceBehaviorSection.jsx`, `LifecycleStageFooter.jsx` | `mobile/hooks/useRecommendations.js` (food quick-log), `mobile/hooks/useAnalytics.js` (Your Progress metrics + empty-state) |
| Backing logic | `recommendationOrchestratorService.js` (7-tier lifecycle DISCOVERER→ELITE, SPEAK/REINFORCE/PREDICT/SILENT), `correlationEngineService.js`, `thompsonSamplingService.js` (Beta-Binomial bandit), `driftDetectionService.js`, `learningStateService.js` | `candidateGenerationService.js` (food scoring/merging), `thompsonSamplingService.js` (separately-keyed arms — same file, different arm namespace), `collaborativeFilteringService.js` (user-user k-NN), `foodKnowledgeGraphService.js` (allergen/micronutrient rules), OpenAI `gpt-4o-mini` narration |
| DB tables | `userCorrelationsTable`, `correlationEvidenceTable`, `laggedCorrelationsTable`, `recommendationArmsTable`, the drift-monitoring table near schema.js:1144 | `recommendationsHistoryTable`, `wellnessInsightActionsTable`, `moodMealCorrelationsTable` |
| Background maintenance | `backend/src/jobs/mlBatchAnalysisJob.js` — daily correlation compute + bandit population stats, weekly drift detection | none currently scheduled |

`decisionBrain.js` exposes domain-scoped endpoints that map 1:1 onto the
"Your Progress" tabs: `/decision-brain/mood-insights`, `/nutrition-insights`,
`/hydration-insights`, `/activity-insights`, `/status`. That's not a
coincidence worth re-deriving — it's the reason Your Progress should read
from here instead of generating its own insight cards.

## How they ended up separate

Best reconstruction from the code: the Insight Engine (decision-brain /
orchestrator / correlation / bandit / drift stack) was built first and wired
into the Dashboard. `analyticsRecommendationService.js` was built later to
power the food quick-log flow (`/api/recommendations`) — a genuinely
different problem — and grew its own lightweight insight-card generation
(`generateNutritionRecommendations`'s `insight`-type cards, the hydration
"Below Average" trend card, etc.) to fill the then-new "Your Progress" screen,
without anyone connecting it back to the richer engine already running on the
Dashboard. Both are correct in isolation. The bug is that a user can see one
narrative on the Dashboard and a different one on Your Progress for the same
underlying data.

## The rule going forward

- **New "what should the user eat" logic** → Food Engine
  (`candidateGenerationService.js` / `analyticsRecommendationService.js`).
- **New "what pattern/insight should the user see" logic** → Insight Engine
  (`decisionBrainService.js` / `recommendationOrchestratorService.js`).
- `analyticsRecommendationService.js`'s `getUserDataStats` (period-aware raw
  metrics + `hasDataInPeriod`, fixed 2026-08-16) stays — that's a metrics
  concern, not an insight concern, and both Nutrition/Hydration/Activity tabs
  need it regardless of which engine narrates the insight cards next to it.
- If a feature could plausibly live in either engine, it belongs in the
  Insight Engine if it needs correlation evidence or a confidence score, and
  in the Food Engine if it needs to produce a concrete, loggable food item.

## Migration status

**Done (2026-08-16):** Mood/Nutrition/Hydration/Activity tabs in
`mobile/app/analytics/index.jsx` now read their insight/pattern/suggestion
cards from the Insight Engine (`useAnalytics.js`'s `mapDecisionBrainInsights`
adapter, sourced from `/decision-brain/{mood,nutrition,hydration,activity}-insights`)
instead of `analyticsRecommendationService.js`. Metrics and the
`hasDataInPeriod` empty-state signal still come from the Food Engine
unchanged — see the split above.

**Not done:** `WellnessTab.jsx` still derives its display by string-matching
`recommendation.id.includes('wellness_score')` against the Food Engine's
output. Its "wellness score" gauge needs a shape decision-brain doesn't
expose the same way as the four domain endpoints (`/decision-brain/status`
returns lifecycle/readiness data, not a 0-100 score + breakdown) —
`generateIntelligentRecommendations`'s actual return shape needs its own
investigation before this can move. Tracked as follow-up work, not silently
deferred.

**Bugs found and fixed while wiring this up:** `generateActivityInsights`
(decision-brain's activity domain) was completely broken — three separate
spots read `log.loggedDate` on `activity_log` rows, which only has
`loggedAt`, so every call threw `RangeError: Invalid time value` and the
route 500'd for every user, always. This affected the Dashboard's
`DailyIntelligenceBehaviorSection` too, not just this migration. Fixed in
`decisionBrainService.js` (`calculateActivityStats`,
`generateActivityTrendData`), regression-tested in
`__tests__/decisionBrainActivityStats.test.js`.
