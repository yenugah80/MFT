# Wellness History, Context, and Change Detection Production Plan

Status: Implementation-ready specification, revision 2  
Date: 2026-08-28  
Scope: Sleep, stress, mood, energy, hydration, meals, nutrition, activity, symptoms, and user reflections

Revision 2 adds the production contracts missing from the first draft: current-system remediation, source provenance, goal and timezone history, correction audit, transactional recalculation, privacy-safe patch semantics, backfill, data lifecycle, operational ownership, and measurable launch outcomes.

Implementation status, 2026-08-28:

- Phase 0 slice 1 is implemented in the working tree.
- Core JSON export now includes sleep, stress, and weight history and is driven by a shared wellness export registry.
- Registry tests verify every included log table belongs to the user and cascades on account deletion.
- Privacy settings now use a versioned allowlist, field-level PATCH requests, atomic JSON merging, safe legacy normalization, and backward-compatible POST routing.
- Backend and mobile regression tests cover these contracts.
- These changes are not committed or deployed yet.

## 1. Product outcome

MFT should help a user remember what happened, understand what is normal for them, notice meaningful changes, inspect possible relationships, and decide whether they want to act. Recommendations are optional. The core product must remain valuable to users who only want a trustworthy personal record.

The shared user journey is:

`Capture -> verify -> compare -> understand -> reflect -> optionally act or share`

Every history experience must answer five questions:

1. What happened?
2. What is normal for me?
3. What changed?
4. What may be connected?
5. Can I trust how this was calculated?

## 2. Current architecture decision

This plan extends existing systems instead of creating another analytics engine.

- Existing domain tables remain the source of truth: `food_log`, `water_log`, `mood_log`, `activity_log`, `sleep_log`, and `stress_log`.
- The existing Insight Engine remains responsible for patterns and evidence through `user_correlations`, `correlation_evidence`, and the `/api/decision-brain/*` routes.
- The existing Food Engine remains responsible for concrete food suggestions.
- The existing `/api/profile/export` and Privacy & Data screen remain the entry points for data rights.
- React Query remains the mobile server-state layer. Expo Router remains the navigation layer.
- No visible production value may come from fixtures or hardcoded demo records.
- Missing data must remain distinct from a measured zero.
- All calculations must be versioned and traceable to source records.

The first release will use a normalized read layer over the existing domain tables. It will not duplicate every log into a new master event table. This avoids risky dual writes and keeps existing history, deletion, and correction flows authoritative.

### 2.1 Current production gaps that must be fixed first

The new work must not be built on top of these unresolved gaps:

1. The current JSON export loads food, water, mood, and activity, but does not include sleep or stress. A complete data inventory and export coverage test are required before adding more record types.
2. The current privacy endpoint accepts an unvalidated JSON object and replaces the complete object. A client updating one toggle can accidentally remove future settings. Privacy updates require a versioned schema and field-level patch semantics.
3. Current scheduled ML eligibility is derived primarily from food history. Wellness baseline and correlation jobs need domain-specific eligibility so sleep, stress, hydration, mood, or activity users are not excluded because they do not log meals.
4. The backend has cron jobs but no durable transactional job handoff for wellness recalculation. A process restart between source persistence and recomputation can leave derived state stale.
5. Current goals represent only the latest value. Historical goal performance can become misleading after a user changes a target.
6. Several records carry a day key or timezone offset, but there is no complete account timezone history. Travel and daylight-saving changes can alter period comparisons if date semantics are not explicit.
7. Data provenance is inconsistent. Manual, device-imported, calculated, and AI-estimated values need a shared response contract.
8. Source edits update the current row but do not provide a user-visible correction history. Trust-sensitive derived calculations need a revision watermark and reproducible source snapshot.

These are Phase 0 release-safety tasks, not optional cleanup.

### 2.2 System invariants

The following rules apply to every domain and phase:

- A source log is authoritative. Derived tables are disposable and rebuildable.
- Every mutation is scoped to the authenticated user and returns the exact persisted record.
- Every offline-capable create uses a stable client event ID.
- Every derived value carries a calculation version, source watermark, coverage, and sample count.
- Every displayed period uses the user's event-local day keys, not the server date.
- Goal comparisons use the goal version active for the evaluated day.
- Missing, unknown, not applicable, measured zero, and calculated zero are different states.
- AI may narrate approved structured facts but may not invent measurements, evidence, context, or clinical meaning.
- Revoked data purposes stop future processing and invalidate affected derived output.
- Health content is never included in product analytics, crash breadcrumbs, URLs, or push payloads.
- A failed derived pipeline must never block creating, editing, viewing, exporting, or deleting the original record.

## 3. Top five product priorities

### Priority 1: Personal baselines and change detection

#### User value

Users can see how the current period differs from their own normal pattern, not only from generic targets.

#### Initial metrics

| Domain | Baseline metrics | Change examples |
|---|---|---|
| Sleep | Duration, quality, bedtime, wake time, consistency | Later bedtime, lower duration, improving regularity |
| Stress | Average level, high-stress frequency, common triggers, symptom frequency | Sustained elevation, new symptom cluster |
| Mood and energy | Intensity, energy, mood distribution, volatility | Persistent drop, increased stability |
| Hydration | Logged-day average, goal frequency, timing coverage | Reduced consistency, later intake concentration |
| Activity | Active days, sessions, minutes, intensity mix | Frequency drop, abrupt load increase |
| Nutrition | Meal coverage, calorie and macro ranges, meal timing | Missed-meal increase, timing shift |

#### Eligibility rules

- Do not show a baseline until the domain has sufficient coverage.
- Sleep: at least 7 valid nights across 14 days.
- Mood or stress: at least 8 check-ins across 5 distinct days.
- Hydration: at least 7 tracked days.
- Activity: at least 6 sessions across 3 weeks for load comparisons.
- Nutrition: at least 7 days with two or more logged meals.
- Always show sample size, tracked-day coverage, comparison window, and calculation version.

#### Calculation contract

- Recent window: trailing 7 complete local days, with today treated as incomplete unless the metric explicitly supports partial-day comparison.
- Baseline window: preceding 28 local days by default.
- Use median and median absolute deviation for noisy measures.
- Use circular time calculations for bedtime and wake time.
- Apply both a domain-specific absolute threshold and a relative threshold before declaring a change.
- Suppress changes when coverage differs materially between the compared periods.
- Label results as `stable`, `small_change`, `meaningful_change`, or `insufficient_data`.
- Never convert an unlogged day into zero.

#### Mobile experience

- Add a shared `ChangeSummaryCard` below each domain's period summary.
- Show current value, personal baseline, direction, period, sample coverage, and `How this was calculated`.
- Selecting the card opens the supporting days or entries.
- A neutral state says `Building your baseline` and tells the user exactly what data is still needed.

### Priority 2: Context markers and reflections

#### User value

Users can explain meaningful circumstances around their records without entering the same note in several domain loggers.

#### Marker model

Initial predefined markers:

- Travel
- Illness
- Work pressure
- Menstrual cycle
- Medication change
- Injury
- Fasting
- Social event
- Vacation
- Custom

Rules:

- Markers are explicit user input. Sensitive context is never inferred.
- A marker has a local start date, optional end date, optional note, and selected visibility domains.
- Custom marker names are limited to 60 characters. Notes are limited to 500 characters.
- A marker may span multiple days.
- The user can edit, delete, or exclude a marker from insights.
- Notes are private by default and excluded from export sharing unless explicitly selected.

#### Daily reflection

- One optional reflection per local day.
- Prompts: `What felt different?`, `What helped?`, and `Anything worth remembering?`
- The user may leave all prompts blank and save only a marker.
- Reflections are shown in the day timeline but are not sent to AI unless AI analysis and reflection analysis are both enabled.

#### Mobile experience

- Add `Add context` to the unified day screen and domain history overflow actions.
- Display context as compact chips on affected dates.
- Selecting a chip opens the marker detail and affected records.
- Provide `Hide from insights` separately from deletion.

### Priority 3: Unified day timeline

#### User value

One screen explains what happened on a day without forcing the user to open every domain separately.

#### Timeline contents

- Sleep interval and quality
- Meals and analyzed ingredients
- Hydration entries and hydration-adjusted volume
- Activity sessions
- Mood and energy check-ins
- Stress level, triggers, symptoms, and coping strategies
- Context markers
- Daily reflection
- Data source and edited state

#### Ordering and grouping

- Timed events are ordered by the user's local event time.
- All-day items such as a travel marker appear above timed events.
- Overnight sleep is assigned to the existing `sleepDate` contract and visually spans bedtime to wake time.
- Items without a reliable event time appear in an `Time not recorded` group, never at a fabricated time.
- Multiple entries from the same domain may be collapsed with an accessible expand control.

#### Navigation

- Dashboard date header, calendar days, history entries, change cards, pattern evidence, and weekly review days all route to `/history/day/[dayKey]`.
- Previous and next day controls preserve the user's local timezone.
- Domain filters remain optional and do not alter source data.

#### Editing

- Editing or deleting an item uses the existing domain endpoint.
- After mutation, invalidate day timeline, domain history, dashboard, baseline, change, review, and insight query keys.
- Optimistic deletion is allowed only with rollback and exact source ID matching.

### Priority 4: Explainable cross-feature patterns

#### User value

Users can inspect observed relationships without being told that one behavior caused another.

#### Engine ownership

- Extend the existing Insight Engine and correlation evidence tables.
- Do not add pattern logic to individual mobile screens.
- Do not use the Food Engine for general wellness patterns.

#### Initial pattern pairs

- Sleep duration and next-day energy
- Sleep consistency and mood
- Stress and sleep quality
- Activity and same-day or next-day mood
- Hydration and user-reported symptoms
- Meal timing and energy
- Coping strategy and later stress check-in

#### Minimum evidence rules

- At least 10 paired observations across at least 7 distinct days.
- Show paired observation count, total tracked days, date range, time lag, effect direction, and confidence band.
- Apply false-discovery control when testing multiple candidate relationships.
- Recompute when relevant source records are edited or deleted.
- Expire an insight when it has not been observed within its configured validity window.
- Never use causal language such as `caused`, `fixed`, or `improved because of`.
- Sensitive context markers are excluded unless the user has enabled them for insights.

#### Evidence experience

- Each pattern card has `Why am I seeing this?`.
- The evidence view lists the exact supporting dates and paired measurements.
- Users can mark a pattern accurate, inaccurate, already known, not useful, or sensitive.
- `Not useful` reduces ranking. `Sensitive` hides the pattern and prevents notification delivery.

### Priority 5: Weekly review with user confirmation

#### User value

The review turns separate logs into a concise, user-controlled account of the week.

#### Review contents

1. Coverage: what was and was not tracked.
2. Changes: at most three meaningful changes.
3. Progress: behavior or consistency improvements.
4. Context: markers that overlap those changes.
5. Patterns: at most two eligible evidence-backed observations.
6. Reflection: one optional user-written summary.
7. Next focus: optional, never required.

#### Generation rules

- Deterministic metrics are generated server-side from versioned calculations.
- AI may rewrite metrics into concise language only when AI analysis consent is active.
- Without AI consent, the review remains fully functional using templated copy.
- A generated review is immutable. Corrections create a new version while preserving the audit relationship.
- Reviews are not notifications by default. Users opt into a weekly reminder.

#### User feedback

- Accurate
- Not accurate
- Not relevant
- Save highlight
- Add context
- Hide this topic

Feedback is stored separately from health logs and is used for presentation ranking, not for changing historical measurements.

## 4. Cross-cutting production foundations

### 4.1 Export and sharing

#### Current state

`GET /api/profile/export` produces a JSON export and the mobile Privacy & Data screen shares that file. This remains supported.

#### Required upgrade

- Add selectable date range and domains.
- Support JSON for complete portability, CSV per domain, and a human-readable PDF summary.
- Show an export preview with included categories and record counts.
- Exclude private reflections and sensitive markers by default.
- Label manual, device-imported, calculated, and AI-estimated values.
- Include calculation versions and goal versions when derived metrics are exported.
- Generate large exports asynchronously with an expiring authenticated download.
- Encrypt generated files at rest and remove them automatically after 24 hours.
- Store export audit metadata, not the exported health content.

#### Sharing

Phase one uses the native share sheet for a user-generated file. No public link is created.

Phase two may introduce revocable links only after the following exist:

- Explicit recipient and expiry selection
- Single-use or time-limited access
- Revocation
- Download audit
- No search engine indexing
- No analytics pixels on the recipient page
- Step-up authentication for creating a link

### 4.2 Privacy controls

Replace ambiguous settings with specific purposes:

- `usageAnalytics`: anonymous product telemetry
- `aiFoodAnalysis`: food photo and voice processing
- `aiWellnessNarration`: AI-written weekly reviews and explanations
- `crossDomainInsights`: use records across domains for patterns
- `contextInInsights`: allow non-sensitive context markers in analysis
- `reflectionInInsights`: allow reflection text in analysis, default false
- `sensitiveInsights`: allow sensitive marker categories, default false
- `weeklyReviewReminder`: notification preference

Requirements:

- Server is the source of truth for account consent. Biometric app lock remains device-local.
- Store consent version, timestamp, source screen, and revocation timestamp.
- Revocation must stop future processing immediately.
- Derived insights using revoked data must be hidden and queued for deletion or recomputation.
- Product analytics must never contain notes, marker text, mood text, food descriptions, or raw health measurements.
- Every insight and review includes `Why am I seeing this?` and the enabled data categories.

### 4.3 Accessibility

Acceptance requirements:

- All interactive targets are at least 44 by 44 points.
- Dynamic Type works through the largest accessibility size without clipping core content.
- Charts expose a concise screen-reader summary and an accessible data table alternative.
- Color is never the only indicator of state or direction.
- Focus order matches visual order.
- Expand and collapse controls announce their state.
- Date ranges and numbers use locale-aware spoken labels.
- Reduced Motion removes nonessential chart and card animations.
- VoiceOver and TalkBack passes are required on all five feature areas.
- Keyboard and switch-control navigation must reach every action.

### 4.4 Emotional safety

- Use neutral terms such as `not logged`, `outside your usual range`, and `building your baseline`.
- Never label a day or user as `bad`, `failed`, `lazy`, or `noncompliant`.
- Broken streaks are historical facts, not loss messages.
- Do not alert on a single unusual day unless the underlying domain has an explicit safety requirement.
- Let users hide a topic, pause reviews, pause reminders, and disable cross-domain analysis.
- Stress and mood escalation must use a separately reviewed safety protocol and regional resources.
- The app must state that wellness patterns are observations and not diagnoses.
- Avoid celebratory animation for sensitive mood, stress, illness, or medication context.

## 5. Data model

Use the next available migration number. Do not assume a fixed migration ID while the worktree is active.

### 5.1 `wellness_context_markers`

| Column | Type | Notes |
|---|---|---|
| id | serial | Primary key |
| user_id | text | Cascade from profile |
| marker_type | text | Validated enum-like value |
| custom_label | text nullable | Maximum 60 characters |
| start_day_key | text | Local `YYYY-MM-DD` |
| end_day_key | text nullable | Inclusive local date |
| note | text nullable | Maximum 500 characters |
| visible_domains | jsonb | Validated array |
| include_in_insights | boolean | Default false for sensitive types |
| client_event_id | text nullable | Idempotency key |
| timezone_offset | integer | Offset at creation |
| created_at | timestamp | UTC storage |
| updated_at | timestamp | UTC storage |

Constraints:

- Unique `(user_id, client_event_id)` where client event ID is not null.
- End date must be on or after start date.
- Index `(user_id, start_day_key, end_day_key)`.
- Marker type, domain values, label length, and note length are validated at API and database boundaries.

### 5.2 `wellness_daily_reflections`

| Column | Type | Notes |
|---|---|---|
| id | serial | Primary key |
| user_id | text | Cascade from profile |
| day_key | text | User-local date |
| felt_different | text nullable | Encrypted at application layer if available |
| what_helped | text nullable | Encrypted at application layer if available |
| remember_note | text nullable | Encrypted at application layer if available |
| include_in_insights | boolean | Default false |
| client_event_id | text nullable | Idempotency key |
| created_at | timestamp | UTC storage |
| updated_at | timestamp | UTC storage |

Constraints:

- Unique `(user_id, day_key)`.
- Maximum 500 characters per field.

### 5.3 `wellness_daily_metrics`

This is a derived cache, not a new source of truth.

| Column | Type | Notes |
|---|---|---|
| user_id | text | User |
| day_key | text | Local date |
| domain | text | Sleep, stress, mood, hydration, activity, nutrition |
| metric_key | text | Versioned metric identifier |
| numeric_value | decimal nullable | Numeric metric |
| text_value | text nullable | Categorical metric |
| sample_count | integer | Supporting record count |
| coverage | decimal | 0 to 1 |
| calculation_version | text | Required |
| source_updated_at | timestamp | Latest supporting record update |
| computed_at | timestamp | Computation time |

Unique key: `(user_id, day_key, domain, metric_key, calculation_version)`.

### 5.4 `wellness_change_events`

Store only eligible, explainable changes.

Required fields:

- User, domain, metric key, status, direction, magnitude, baseline value, recent value
- Baseline and recent windows
- Sample counts and coverage for both windows
- Calculation version
- Supporting day keys
- First detected, last confirmed, expires at, dismissed at
- Explanation template key

### 5.5 `wellness_weekly_reviews`

Required fields:

- User and local week start
- Review version and calculation version
- Coverage summary
- Change IDs and correlation IDs
- Deterministic structured content
- Optional AI-rendered copy and AI model metadata
- Consent snapshot ID
- Created, superseded, viewed, and dismissed timestamps

Unique key: `(user_id, week_start_day_key, review_version)`.

### 5.6 `wellness_review_feedback`

Required fields:

- Review ID
- User ID
- Feedback type
- Optional section key
- Created timestamp

Do not store free-form health content in telemetry.

### 5.7 Correlation evidence extension

Extend the existing evidence contract so sleep, stress, and activity source records can be traced. Prefer explicit nullable foreign keys for supported tables plus a validated source reference object for future domains. Every evidence record must belong to the same user as its correlation through server-side verification.

### 5.8 Export jobs

Add `data_export_jobs` only when asynchronous export is introduced.

Store:

- User, format, selected domains, date range, status, object key, expiry, byte size, checksum, created, completed, downloaded, and deleted timestamps
- Do not store export contents in PostgreSQL
- Delete the object on expiry or revocation

### 5.9 `wellness_goal_history`

Historical comparisons must use the goal that was active on that day.

| Column | Type | Notes |
|---|---|---|
| id | serial | Primary key |
| user_id | text | Cascade from profile |
| domain | text | Hydration, activity, nutrition, sleep, or future domain |
| goal_key | text | Versioned goal identifier |
| numeric_value | decimal nullable | Numeric goal |
| text_value | text nullable | Categorical goal |
| unit | text nullable | Canonical unit |
| effective_from_day_key | text | Inclusive local date |
| effective_to_day_key | text nullable | Exclusive local date |
| source | text | User, onboarding, system, or import |
| created_at | timestamp | Audit timestamp |

Rules:

- Goal intervals for the same user and goal key may not overlap.
- Updating a goal closes the current interval and creates a new row in one transaction.
- The existing current-goal tables remain the fast current-state projection during migration.
- Backfill creates one initial interval from the earliest relevant source date and records that its earlier effective date was inferred.

### 5.10 Provenance contract

Add or project these fields consistently for every normalized timeline event:

- `sourceKind`: `manual`, `device`, `import`, `calculated`, or `ai_estimated`
- `sourceProvider`: app, HealthKit, Google Health Connect, USDA, OpenAI, or another registered provider
- `sourceRecordId`: provider identifier when available
- `recordedAt`: when the user or device recorded the value
- `occurredAt`: when the event happened, nullable when unknown
- `eventTimeConfidence`: `exact`, `user_reported`, `derived`, or `unknown`
- `isEdited`
- `sourceUpdatedAt`

Provider identifiers must be idempotent per user and provider. The API must never claim an exact occurrence time when only the logging time is known.

### 5.11 `wellness_record_revisions`

This table stores correction metadata for trust and derived-data invalidation. It is not an unrestricted duplicate health database.

Required fields:

- User ID, source domain, source table, source record ID, revision number
- Changed field names
- Previous value hash and new value hash
- Optional encrypted before and after payload only for the minimum support retention window
- Change source: user, device sync, support, migration, or system correction
- Actor ID when applicable
- Request ID, created timestamp, and purge timestamp

User-facing history may show `Edited` and the edit time. Internal payload retention must be documented and automatically purged. Account deletion removes revisions immediately.

### 5.12 Transactional outbox and job runs

Add `wellness_recalculation_outbox` and `wellness_job_runs`.

The outbox row is inserted in the same database transaction as the source mutation. It contains user ID, source domain, source ID, affected day keys, event type, source watermark, attempts, next attempt, and processing state.

Requirements:

- Unique idempotency key per source mutation and revision.
- Claim rows using safe concurrent locking.
- Exponential retry with a dead-letter state after the configured maximum.
- Dead-letter alerts include only IDs and error codes, never health values.
- Nightly reconciliation compares source watermarks with derived watermarks and repairs gaps.
- Cron may wake the worker, but the durable outbox owns delivery correctness.

### 5.13 `privacy_consent_audit`

Store one immutable record per purpose change:

- User ID
- Purpose key and schema version
- Previous state and new state
- Policy version
- Source screen and device platform
- Changed timestamp
- Revoked timestamp when applicable

Do not store biometric authentication results on the server. App lock remains device-local.

### 5.14 Metric registry

Maintain a code-owned registry for every calculated metric:

- Metric key and calculation version
- Domain and canonical unit
- Source fields
- Eligibility rule
- Missing-data behavior
- Partial-day behavior
- Supported date ranges
- Display precision
- Change thresholds
- Emotional-safety copy templates
- Deprecation and backfill policy

Backend startup validation fails in non-production environments when a served metric lacks a registry entry. Production logs a release-blocking alert without taking the API offline.

## 6. API contracts

All routes require Clerk authentication, user ownership checks, Zod validation, request IDs, rate limiting, and structured errors.

### Shared response contract

Successful responses include:

- `schemaVersion`
- `generatedAt`
- `timezone`
- `sourceWatermark`
- `calculationVersion` for derived responses
- `coverage` and `sampleCount` for analytical responses
- `data` payload

Error responses include:

- Stable machine-readable `code`
- Safe user-readable `message`
- `requestId`
- `retryable`
- Field-level validation issues when applicable
- No stack trace, SQL, source values, or sensitive text

Use cursor pagination for event collections. Reject unsupported date ranges instead of silently truncating them. Support conditional requests with ETag or source watermark where practical.

### Timeline and day detail

- `GET /api/wellness/timeline?start=YYYY-MM-DD&end=YYYY-MM-DD&domains=sleep,mood`
- `GET /api/wellness/day/:dayKey`

Response requirements:

- Local day key and timezone context
- Ordered normalized events
- Source domain, source ID, source type, event time confidence, summary, data provenance, editable flag
- Context markers and reflection returned separately from timed events
- Pagination cursor for ranges larger than 31 days

### Context and reflection

- `POST /api/wellness/context-markers`
- `PATCH /api/wellness/context-markers/:id`
- `DELETE /api/wellness/context-markers/:id`
- `PUT /api/wellness/reflections/:dayKey`
- `DELETE /api/wellness/reflections/:dayKey`

Mutations require `clientEventId` where applicable and return the persisted record.

### Baselines and changes

- `GET /api/wellness/baselines?domains=all`
- `GET /api/wellness/changes?domain=all&status=active`
- `GET /api/wellness/changes/:id/evidence`
- `POST /api/wellness/changes/:id/dismiss`

Each response includes eligibility, sample coverage, calculation version, generated timestamp, and source update watermark.

### Patterns

- Continue domain summaries through `/api/decision-brain/*-insights`.
- Add `GET /api/decision-brain/correlations/:id/evidence`.
- Continue feedback through `POST /api/decision-brain/feedback` with the expanded feedback values.

### Weekly reviews

- `GET /api/wellness/reviews/latest`
- `GET /api/wellness/reviews?cursor=...`
- `GET /api/wellness/reviews/:id`
- `POST /api/wellness/reviews/:id/feedback`
- `POST /api/wellness/reviews/:id/context`

### Export and privacy

- Preserve `GET /api/profile/export` for complete JSON compatibility.
- Add `POST /api/profile/exports` for selected or large exports.
- Add `GET /api/profile/exports/:id` for status.
- Add `DELETE /api/profile/exports/:id` for revocation.
- Replace whole-object privacy writes with `PATCH /api/profile/privacy` using a versioned, validated allowlist. Preserve `POST` temporarily as a compatibility adapter that merges known fields server-side.
- Add `GET /api/profile/privacy/audit` with a safe purpose-change history.

### Goals and calculation definitions

- `GET /api/wellness/goals?domain=all&includeHistory=true`
- `PUT /api/wellness/goals/:domain/:goalKey`
- `GET /api/wellness/metrics/:metricKey/definition?version=...`

Goal updates must close and create effective intervals transactionally. Metric definitions expose user-readable methodology, not internal implementation secrets.

## 7. Backend implementation

### Services

Add:

- `wellnessTimelineService.js`: normalized read-only projection over source logs.
- `wellnessBaselineService.js`: daily metric materialization and eligibility.
- `wellnessChangeDetectionService.js`: robust comparison and evidence generation.
- `wellnessContextService.js`: marker and reflection ownership rules.
- `weeklyReviewService.js`: deterministic review assembly.
- `dataExportService.js`: format generation, redaction, and lifecycle.

Extend:

- `correlationEngineService.js`: new signal pairs, consent filtering, evidence references.
- `decisionBrainService.js`: ranked pattern output with explanation contract.
- `analyticsEventPipeline.js`: product events without health content.
- `profileController.js`: versioned privacy schema and complete export coverage.

Repair before extension:

- Add sleep and stress to the current complete JSON export.
- Inventory every user-owned table and enforce export and deletion coverage with a schema-driven test.
- Change ML batch eligibility from meal-only selection to the eligibility registry for the requested domain.
- Merge privacy updates by validated purpose key so one toggle cannot erase another.

### Recalculation triggers

- Domain mutation writes a durable outbox event with user, domain, source ID, day key, revision, and source update time in the same transaction.
- A worker recomputes affected daily metrics, baselines, changes, correlations, and current weekly review.
- Mutations return immediately after the source record is safely persisted.
- UI may show `Updating insights` while derived data catches up.
- Jobs are idempotent and retryable.
- A nightly reconciliation job repairs missed events and verifies source watermarks.

The existing cron infrastructure may schedule polling and reconciliation. Correctness must not depend on the Node process staying alive after a mutation.

### Cache rules

- Timeline and day detail: 30-second server cache, invalidated by relevant mutation.
- Baselines and changes: cache by calculation version and source watermark.
- Weekly review: immutable by version.
- Never cache one user's response under a key that omits user ID.

### Backfill and migration

1. Add nullable tables and columns without changing current reads.
2. Deploy dual-compatible application code.
3. Inventory row counts and date ranges per domain without logging health content.
4. Backfill day metrics in user batches with bounded concurrency.
5. Backfill initial goal intervals and mark inferred effective dates.
6. Compute baselines and changes in shadow mode.
7. Compare shadow results against golden fixtures and sampled aggregate invariants.
8. Enable reads behind feature flags only after source and derived watermarks match.
9. Retain a rebuild command that can discard and recreate all derived wellness tables.

Backfill must be resumable by user and date cursor, record calculation version, and avoid sending notifications or creating visible reviews until rollout enables them.

### Timezone and date semantics

- Persist an IANA timezone identifier on account settings when available, while retaining each event's original offset.
- Prefer the event's existing day key for historical assignment.
- When day key is absent, derive it once from occurrence time and event offset, then persist the repaired value through a controlled migration.
- Travel changes future defaults but never silently rewrites historical day keys.
- Daylight-saving transitions use IANA timezone rules and explicit ambiguity tests.
- Weekly boundaries follow the user's configured first day of week for presentation, while storage uses an explicit ISO or Sunday-based key documented by the metric registry.

## 8. Mobile implementation

### Shared routes

- `mobile/app/history/day/[dayKey].jsx`
- `mobile/app/history/changes.jsx`
- `mobile/app/history/change/[id].jsx`
- `mobile/app/history/reviews.jsx`
- `mobile/app/history/review/[id].jsx`
- `mobile/app/context/edit.jsx`

### Shared components

- `WellnessDayTimeline`
- `TimelineEventRow`
- `ContextMarkerChips`
- `ContextMarkerEditor`
- `DailyReflectionEditor`
- `ChangeSummaryCard`
- `BaselineComparison`
- `EvidenceCoverage`
- `PatternEvidenceList`
- `WeeklyReviewCard`
- `DataProvenanceBadge`
- `AccessibleChartSummary`

### Hooks

- `useWellnessDay(dayKey)`
- `useWellnessTimeline(filters)`
- `useContextMarkers(range)`
- `useWellnessBaselines(domains)`
- `useWellnessChanges(filters)`
- `useWeeklyReview(idOrLatest)`
- `useExportJob()`

### Query invalidation contract

Centralize keys in `mobile/constants/queryKeys.js`. Domain add, edit, or delete must invalidate:

- Source domain history
- Selected day and timeline range
- Dashboard
- Your Progress period
- Baselines
- Changes
- Decision Brain insights
- Weekly review containing that day
- Export preview counts

### Screen hierarchy

Domain history screens:

1. Period selector
2. Current period summary
3. Change from personal baseline
4. Tracking or trend visualization
5. Context visible in the selected range
6. Eligible evidence-backed patterns
7. Recent records

Unified day screen:

1. Date and coverage
2. Context markers
3. Cross-domain timeline
4. Daily reflection
5. Edit and data-source controls

Weekly review:

1. Coverage
2. Meaningful changes
3. Progress
4. Context
5. Patterns
6. Optional next focus
7. Feedback and sharing

### User modes and progressive disclosure

The product must remain useful at different levels of engagement:

- Record keeper: timeline, corrections, export, and no forced insights.
- Progress monitor: baselines, goals, and changes.
- Pattern explorer: cross-domain evidence and context.
- Guided user: weekly review and optional next focus.

Do not create a permanent mode selector in the first release. Use progressive disclosure and remembered section state. Privacy settings control processing, while display preferences control what is expanded.

Content-density rules:

- One primary conclusion per card.
- No more than three change cards or two pattern cards in a period summary.
- Long-range charts aggregate appropriately and always provide a data-table alternative.
- Recommendations do not appear above history, baseline, or change evidence unless the screen's explicit purpose is guidance.
- A user can reach raw records from every derived statement in two interactions or fewer.

### Provenance and correction presentation

- Show `Manual`, provider name, `Calculated`, or `AI estimate` where provenance affects trust.
- Show `Edited` without exposing internal audit metadata.
- Let the user correct an AI-estimated item before it participates in future analysis.
- If a source entry is deleted, remove it from visible evidence immediately and show derived content as updating until recomputation completes.
- Do not show stale exact values after an edit when the source watermark is newer than the derived watermark.

## 9. Error, empty, and synchronization states

Every new screen must implement:

- Initial loading skeleton
- Cached data with a subtle refresh state
- Network failure with retry
- Partial source failure that identifies the unavailable domain
- Empty account
- Insufficient baseline data
- No meaningful change
- No eligible pattern
- Derived data updating
- Offline mutation queue
- Mutation conflict
- Deleted source record
- Export queued, processing, ready, failed, expired, and revoked

Offline rules:

- Context and reflection writes use client event IDs.
- Queued edits show a local pending state.
- Server response replaces local temporary IDs.
- Conflicts use last-write detection and show the user both versions for reflection text.
- Health logs follow their existing offline contracts and must not be duplicated.

## 10. Security and compliance

- Enforce ownership on every source and derived record.
- Validate that requested date ranges are bounded. Default maximum is 365 days for interactive timeline calls.
- Rate-limit export generation, evidence detail, and AI narration.
- Do not place health details in URLs, logs, crash reports, analytics properties, or push-notification payloads.
- Redact notes and custom marker text from server logs.
- Use signed, short-lived URLs for export downloads.
- Require step-up authentication for account deletion and future public-link creation.
- Include all new tables in account deletion and portability exports.
- Update the App Store privacy declaration and public privacy policy before release if processing purposes change.
- Complete a threat model for export, reflection text, context markers, and cross-domain analysis.

### Data lifecycle

- Document retention separately for source logs, revisions, derived metrics, reviews, exports, job records, and consent audits.
- Source health records remain until user deletion or an explicit retention setting is introduced.
- Temporary revision payloads use the minimum support window and are automatically purged.
- Derived metrics and reviews are deleted or rebuilt when their supporting purposes are revoked.
- Export objects expire after 24 hours by default. Metadata follows the audit retention policy.
- Backups must honor account deletion through the documented backup-expiry process.
- Test restore procedures must verify tenant isolation and derived-data rebuildability.

### Age and sensitive-domain governance

- The current profile permits users aged 13 and older. Product and legal review must define whether cross-domain insights, AI narration, sharing, and sensitive markers differ for minors.
- Do not enable sensitive context analysis for minors without an approved consent model.
- Menstrual-cycle, medication, illness, mental-health, and symptom contexts require stricter defaults and separate copy review.
- Regional support resources must be selected from server-controlled, reviewed configuration rather than generated by AI.

### Abuse and sharing safety

- Native file sharing requires a confirmation that identifies sensitive categories included.
- Never preselect private reflections, medication context, or mental-health content.
- Future share links must resist enumeration, forwarding, screenshot assumptions, and metadata leakage.
- Rate-limit repeated export and link generation and alert on account-takeover patterns without inspecting health contents.

## 11. Observability

Allowed product events:

- `wellness_day_opened`
- `context_marker_created`
- `context_marker_hidden_from_insights`
- `change_card_opened`
- `change_evidence_opened`
- `weekly_review_opened`
- `weekly_review_feedback_submitted`
- `export_started`
- `export_completed`
- `export_failed`

Allowed properties:

- Domain category
- Date-range bucket
- Screen source
- Calculation version
- Eligibility state
- Latency bucket
- Error code

Forbidden properties:

- Notes or reflection text
- Custom marker label
- Raw health values
- Food descriptions
- Mood names
- Stress triggers
- Exact timestamps of sensitive events

Operational metrics:

- Timeline p50, p95, and p99 latency
- Derived-data freshness
- Recalculation queue delay and failure rate
- Change-detection suppression reasons
- Pattern eligibility and dismissal rates
- Export completion time, failure rate, and expiry cleanup
- Privacy-consent update failures
- Accessibility crash-free and screen-reader smoke-test results

### Product usefulness measures

Measure whether the product improves understanding and control, not only time spent:

- Percentage of timeline sessions that reach a relevant record or context item
- Successful edit and correction rate
- Percentage of change cards whose evidence is opened
- User feedback distribution for accuracy and relevance
- Weekly review completion, save, hide, and dismiss rates
- Export completion and selected-category confirmation rates
- Privacy-purpose opt-in and revocation completion rates
- Support reports about confusing days, goals, samples, or source labels

Do not optimize for more health logging, longer sessions, more notifications, or more sensitive-data sharing as primary success metrics.

### Initial launch guardrails

These thresholds are provisional and must be approved before cohort rollout:

- Crash-free sessions at or above 99.8 percent on supported mobile versions.
- Privacy-setting mutation failure below 0.1 percent.
- Export generation failure below 1 percent, excluding user cancellation.
- Fewer than 0.5 percent of eligible users with derived data older than 15 minutes after successful source sync.
- Zero cross-user ownership failures in automated and penetration tests.
- Zero critical VoiceOver or TalkBack blockers.
- `Not accurate` feedback below 15 percent after at least 100 eligible change-feedback events. Exceeding this pauses expansion and triggers threshold review.
- No unresolved emotional-safety or privacy severity-one issue.

### Operational ownership

| Area | Directly responsible | Required reviewer |
|---|---|---|
| Source and timeline APIs | Backend engineering | Security |
| Baselines and change detection | Data or backend engineering | Product and statistical review |
| Correlation evidence | Insight Engine owner | Statistical and safety review |
| Mobile history experience | Mobile engineering | Design and accessibility |
| Consent and export | Backend and mobile engineering | Privacy and security |
| Emotional-safety copy | Product content | Safety reviewer |
| Rollout and alerts | Platform or backend engineering | Product owner |

Each release phase must name an on-call owner, rollback operator, and decision-maker before production enablement.

## 12. Testing strategy

### Unit tests

- Timezone and DST day assignment
- Missing versus zero values
- Baseline eligibility and coverage
- Median, deviation, circular time, and change thresholds
- Context interval overlap
- Consent filtering
- Pattern minimum evidence and expiration
- Export redaction and format generation
- Emotionally safe copy guard
- Property-based tests for date ranges, interval overlap, missing data, and idempotency
- Metric-registry validation for units, eligibility, and version changes

### Backend integration tests

- Auth and ownership for every endpoint
- Idempotent context marker writes
- Source mutation to recalculation flow
- Correct invalidation after edit and delete
- Correlation evidence user consistency
- Privacy revocation hides or recomputes derived output
- Complete export and account deletion coverage for all new tables
- Pagination stability and bounded date ranges
- Privacy patch concurrency so simultaneous toggles do not overwrite each other
- Transactional outbox delivery, retry, dead-letter, and reconciliation
- Goal interval non-overlap and historically correct comparisons
- Export inventory test that fails when a new user-owned table lacks an export and deletion policy
- Migration upgrade from representative prior schemas and rollback-safe application behavior

### Mobile component tests

- Loading, empty, partial error, retry, and offline states
- Dynamic Type at accessibility sizes
- Expanded and collapsed announcements
- Chart summary and data-table alternative
- Context editor validation
- Feedback and privacy controls
- Query invalidation after each mutation

### End-to-end tests

- Add context, see it on multiple domain histories, edit it, and delete it.
- Add or edit a source log and see the day timeline update.
- Build an eligible baseline and verify a meaningful change appears.
- Open exact evidence from a change and a cross-domain pattern.
- Generate a weekly review with and without AI consent.
- Export selected categories and verify excluded sensitive fields.
- Revoke insight consent and verify affected insights disappear.
- Delete the account and verify server and device data removal.
- Complete native VoiceOver and TalkBack journeys.
- Change timezone and travel context without rewriting historical days.
- Change a goal and verify earlier days retain their original goal comparison.
- Restart the backend immediately after a source write and verify the outbox eventually updates derived data.

### Contract, load, and resilience tests

- Store representative API response fixtures by schema version and validate backward compatibility.
- Run timeline and export load tests against 95th-percentile account sizes.
- Inject database timeout, worker restart, duplicate event, stale cache, partial-domain failure, and object-storage failure.
- Verify the original log remains available during every derived-system failure.
- Verify restoration from backup and complete derived-table rebuild in a production-like environment.
- Verify older supported mobile clients tolerate new privacy fields and response metadata.

### Performance targets

- Day detail API p95 below 500 ms for 95th-percentile user history.
- 31-day timeline API p95 below 900 ms.
- Cached screen meaningful paint below 700 ms on supported devices.
- Fresh screen meaningful paint below 1.5 seconds on a typical mobile connection.
- Context mutation acknowledgement below 800 ms excluding offline queueing.
- Derived change freshness within 5 minutes after a source mutation, with a target below 60 seconds.

## 13. Delivery phases

### Phase 0: Current-state remediation and safety foundation

Deliverables:

- Final calculation definitions and version IDs
- Privacy purpose schema and consent migration
- Field-level privacy patch endpoint with backward-compatible merge adapter
- Complete export inventory with sleep and stress added immediately
- Domain-specific batch eligibility that does not depend on meal history
- Transactional outbox and reconciliation foundation
- Goal-history and timezone-semantics contracts
- Provenance and source-watermark contract
- Emotionally safe copy matrix
- Accessibility component contract
- Query-key and invalidation map
- Threat model
- Feature flags

Exit criteria:

- Product, engineering, privacy, and clinical-safety review approve the contracts.
- No unresolved definition exists for missing data, day boundaries, source provenance, or consent.
- Existing JSON export includes every current user-owned health-log domain.
- Concurrent privacy changes cannot erase unrelated purposes.
- A source mutation survives a backend restart and eventually updates derived state.

### Phase 1: Context and unified day

Deliverables:

- Context and reflection migrations, APIs, and ownership tests
- Normalized day and timeline read service
- Unified day screen
- Domain-history context chips
- Offline and conflict behavior
- JSON export and account deletion updated for new tables
- Goal-history foundation and provenance fields available to the timeline

Exit criteria:

- A context marker appears consistently across every selected domain.
- A source edit or deletion updates the unified day without stale records.
- No mock data appears in production flows.

### Phase 2: Baselines and change detection

Deliverables:

- Daily metric materialization
- Baseline and change services
- Reconciliation job
- Shadow-mode backfill and source-watermark comparison
- Change cards and evidence views
- Insufficient-data states

Exit criteria:

- Golden datasets reproduce expected results across timezones and missing-data patterns.
- Every change is traceable to supporting days and a calculation version.
- False alerts stay below the agreed offline evaluation threshold.

### Phase 3: Explainable patterns

Deliverables:

- Extended correlation evidence
- Initial approved signal pairs
- Evidence detail API and screen
- Consent and sensitive-topic filtering
- User feedback integration

Exit criteria:

- No pattern appears below minimum evidence.
- All displayed patterns use observational language.
- Editing or deleting a source record causes correct evidence recomputation.

### Phase 4: Weekly review

Deliverables:

- Deterministic review generator
- Optional AI narration behind consent
- Review history and detail screens
- Feedback controls
- Optional reminder setting

Exit criteria:

- The review remains useful with AI disabled.
- The review never presents missing categories as negative outcomes.
- Feedback persists and affects presentation ranking.

### Phase 5: Export and sharing upgrade

Deliverables:

- Domain and date selection
- CSV, JSON, and PDF formats
- Export job lifecycle and encrypted object storage
- Export preview, progress, expiry, and revocation
- Updated privacy disclosures

Exit criteria:

- Export contents match selections exactly.
- Sensitive content is excluded by default.
- Expired files are deleted automatically.
- Accessibility checks pass for the export flow and generated PDF.

### Phase 6: Controlled rollout

Rollout sequence:

1. Internal accounts with shadow calculations only.
2. Staff dogfood with context and day timeline.
3. Five percent opt-in cohort.
4. Twenty-five percent cohort after one full weekly-review cycle.
5. Fifty percent cohort after safety and false-change review.
6. Full release after two stable weekly cycles.

Kill switches:

- Change cards
- Cross-domain patterns
- AI narration
- Weekly review reminders
- Export jobs

Rollback must hide derived features without affecting original health logs.

### Phase dependency rule

- Phase 1 cannot expose context until export and deletion cover its tables.
- Phase 2 cannot expose change cards until goal history, metric registry, source watermarks, and shadow evaluation pass.
- Phase 3 cannot expose cross-domain patterns until purpose-specific consent and evidence traceability pass.
- Phase 4 cannot expose AI narration until deterministic reviews are complete and AI consent behavior passes.
- Phase 5 cannot expose downloadable files until expiry cleanup and access auditing pass.

## 14. Release gates

The feature set is not production-ready until all gates pass:

- All migrations applied through `npm run db:migrate` in each environment.
- Full backend and mobile test matrices pass.
- Native iOS and Android authenticated flows use live API data.
- VoiceOver and TalkBack audits pass.
- Privacy export includes all new data and honors exclusions.
- Account deletion removes all new records and generated files.
- Consent revocation behavior passes end-to-end.
- Security threat-model actions are closed.
- App Store privacy and public policy text are updated if required.
- Dashboards and alerts exist for latency, recalculation, exports, and consent failures.
- Feature flags and rollback are tested in production-like infrastructure.
- No causal, diagnostic, shaming, or misleading copy is present.
- Existing supported clients remain compatible with privacy and API contract changes.
- Backfill is complete, resumable, and reconciled against source watermarks.
- Goal changes preserve historical comparisons.
- Timezone and daylight-saving golden cases pass.
- Operational owners, alerts, runbooks, and rollback operators are assigned.
- Launch guardrails have named data sources and alert thresholds.

## 15. Definition of done for each feature

A feature is done only when:

1. Its data source and calculation are documented.
2. Its API is authenticated, validated, bounded, and ownership tested.
3. Its UI handles loading, cached, empty, partial, offline, error, and success states.
4. Its charts and controls are accessible without color or motion.
5. Its privacy purpose and export behavior are documented.
6. Its emotionally safe copy has been reviewed.
7. Its mutations invalidate every dependent live query.
8. Its telemetry excludes health content.
9. It has unit, integration, component, and end-to-end coverage.
10. It is verified on a signed-in native device or simulator using live APIs.
11. Goal and timezone semantics are correct for historical records.
12. Source provenance and edited state are represented honestly.
13. Its derived state can be rebuilt from authoritative logs.
14. Its export, retention, revision, and deletion policy is covered by automated inventory tests.

## 16. Immediate engineering backlog

### P0

- Repair the existing export to include sleep and stress, then add an automated table-coverage inventory.
- Replace whole-object privacy writes with versioned patch and merge semantics.
- Implement the transactional wellness recalculation outbox and worker recovery contract.
- Replace meal-centric batch eligibility with domain-specific eligibility.
- Approve baseline eligibility and change thresholds per domain.
- Define the versioned privacy object and consent migration.
- Define goal history, timezone history, provenance, revision, and metric registry contracts.
- Add context marker and reflection schema migrations.
- Implement the normalized day response contract.
- Centralize React Query keys and mutation invalidation.
- Add all new tables to export and account deletion tests before exposing UI.

### P1

- Build the unified day screen and context editor.
- Materialize daily metrics and implement baseline eligibility.
- Build change evidence and `How this was calculated` views.
- Extend correlation evidence to sleep, stress, and activity.
- Add privacy controls for cross-domain and context analysis.
- Backfill goal intervals, day metrics, and source watermarks in shadow mode.
- Add revision metadata and exact derived-data invalidation after correction.

### P2

- Generate deterministic weekly reviews.
- Add optional AI narration.
- Add selectable CSV and PDF export.
- Complete native accessibility and emotional-safety QA.
- Begin flagged cohort rollout.
- Validate launch guardrails over two complete weekly-review cycles.

## 17. Explicitly deferred

The following are not required for the first production release:

- Predictive medical risk scores
- Diagnosis or treatment advice
- Automatic inference of sensitive context
- Public or permanent health-sharing links
- Personal experiments
- Clinician portal
- Wearable write-back
- New recommendation engine

These items require separate product, privacy, and safety approval.

## 18. Decisions required before coding begins

| Decision | Recommended default | Owner |
|---|---|---|
| Baseline thresholds | Use the eligibility values in Priority 1, then validate in shadow mode | Product and statistical review |
| Week boundary | Locale-aware presentation with explicit stored week key | Product and backend |
| Context insight default | Off for sensitive markers, user-controlled for other markers | Privacy and product |
| Reflection analysis | Off by default and separate from general AI consent | Privacy |
| Revision payload retention | Hashes retained for audit, encrypted values retained no longer than 30 days | Security and privacy |
| Minor accounts | Disable sensitive cross-domain analysis and external sharing until approved | Legal and safety |
| First export formats | Complete JSON, per-domain CSV, summary PDF | Product |
| AI review narration | Optional enhancement only after deterministic review ships | Product and privacy |
| Change feedback threshold | Pause rollout above 15 percent `Not accurate` after minimum sample | Product and statistical review |

No engineering implementation should silently choose a different default. Record approved changes in this document and the metric registry.

## 19. Recommended pull-request sequence

1. Export inventory, sleep and stress export repair, and deletion coverage tests.
2. Versioned privacy schema, patch endpoint, consent audit, and mobile migration.
3. Goal history, provenance, metric registry, and timezone semantics.
4. Transactional outbox, worker, retry, reconciliation, and operational alerts.
5. Context marker and reflection schema plus APIs.
6. Normalized day and timeline APIs plus contract tests.
7. Unified day mobile screen and domain context chips.
8. Daily metric materialization, backfill, and shadow baseline evaluation.
9. Change detection APIs, evidence view, and mobile cards.
10. Correlation evidence extension and approved cross-domain pairs.
11. Deterministic weekly review and feedback.
12. Optional AI narration with purpose-specific consent.
13. Selected export jobs, CSV, PDF, expiry, and revocation.
14. Accessibility, safety, security, load, restore, and cohort rollout gates.

Each pull request must be independently deployable behind disabled feature flags and must preserve existing logging and history behavior.

## 20. Traceability matrix

| Capability | Source or new tables | Primary APIs | Mobile surface | Feature flag |
|---|---|---|---|---|
| Unified day | Existing domain logs, context, reflections | `/wellness/day`, `/wellness/timeline` | Day timeline | `wellness_day_v1` |
| Context | `wellness_context_markers`, reflections | Context and reflection routes | Context editor and chips | `wellness_context_v1` |
| Baselines | Daily metrics, goal history | `/wellness/baselines` | Domain change card | `wellness_baselines_v1` |
| Change detection | Change events, metric registry | `/wellness/changes` | Changes list and evidence | `wellness_changes_v1` |
| Patterns | Existing correlations and extended evidence | Decision Brain evidence routes | Pattern evidence | `wellness_patterns_v2` |
| Weekly review | Weekly reviews and feedback | `/wellness/reviews` | Review list and detail | `wellness_review_v1` |
| Export | Existing logs, new user tables, export jobs | Profile export routes | Privacy & Data | `wellness_export_v2` |

This matrix is the minimum link between product intent, stored data, live APIs, mobile UI, and rollback control. New capability work must extend it.
