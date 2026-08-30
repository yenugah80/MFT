# Wellness roadmap live audit, Phase 0 privacy foundation

Date: 2026-08-29

Surface: signed-in iPhone 13 Pro Max simulator, native Expo development client, production read API at `https://api.my-food-tracker.com/api`

## User goal and accessibility target

The person should understand each data purpose, make one choice at a time, confirm what remains separate, review prior choices, export all owned data, and delete the account without ambiguous sharing language. Controls should remain usable with VoiceOver, 44 point targets, larger text, and transient API failures.

## Steps and evidence

1. Current production privacy screen
   - Evidence: `01-privacy-current.png`
   - Health: needs correction
   - The single `Share insights` switch combines several materially different purposes. There is no visible control for context, reflections, sensitive topics, AI-written reviews, or review reminders.

2. Revised purpose controls
   - Evidence: `05-privacy-final-top.png`
   - Health: good, pending backend deployment
   - Data use, food analysis, wellness connections, reminders, and device security are separated. Advanced pattern sources remain hidden until cross-feature patterns are enabled, reducing initial length and decision load.

3. Data rights and privacy history entry point
   - Evidence: `06-privacy-final-data.png`
   - Health: good, pending backend deployment
   - The header scrolls away instead of covering content. Privacy activity, export, and deletion are grouped under one clear data-rights section.

4. Staged API failure state
   - Evidence: `07-privacy-history-staged-error.png`
   - Health: expected release-gate blocker
   - Migration `0051` is now applied and schema drift is clean. The production API still returns 404 because the new authenticated audit route has not been deployed. The app keeps the screen usable, explains that history is temporarily unavailable, and offers retry. No production consent value was changed during this audit.

## Confirmed strengths

- Purpose-specific labels replace ambiguous sharing language.
- Cross-feature analysis is off by default.
- Context, reflection, sensitive-topic, and AI review controls depend on cross-feature consent.
- Turning cross-feature consent off revokes all dependent purposes atomically.
- The backend maintains legacy aliases for older installed clients.
- Every actual purpose change creates an immutable audit row with policy version, source screen, platform, timestamps, and revocation time.
- Privacy history is included in complete JSON export and cascades on account deletion.
- Native accessibility inspection confirmed readable switch labels, hints, states, a 44 point back control, expanded state for privacy activity, and no decorative icon glyphs in the revised reading order.

## Remaining risks and release gates

- P0: Deploy and smoke-test backend GET, PATCH, audit pagination, export, and account deletion before enabling the mobile release.
- P1: Run a real VoiceOver navigation session. The accessibility tree is clean, but screenshots and static inspection cannot prove focus order, announcements, rotor behavior, or switch operation.
- P1: Test extra-extra-large and accessibility text sizes on the compact and expanded states.
- P1: Add authenticated controller integration tests against a temporary PostgreSQL database. Utility, schema, export, migration dry-run, and UI contracts currently pass.
- P2: Localize all purpose and error copy before non-English release.

## Automated evidence

- Backend full suite: 262 passed across 28 suites.
- Backend privacy and export contracts: 14 passed.
- Mobile full suite: 761 passed across 61 suites.
- Combined backend and mobile total: 1,023 passed.
- ESLint for revised privacy screen and contract test: passed.
- Backend syntax checks: passed.
- Migration dry run: zero pending migrations.
- Live schema drift audit: all 47 managed tables match, including `privacy_consent_audit`.

## Evidence limits

The audit used a native signed-in simulator and production read API behavior. Migration `0051` was applied after the initial staged-failure capture. The audit did not mutate production privacy settings, deploy services, delete account data, create an export file, or claim full WCAG compliance.
