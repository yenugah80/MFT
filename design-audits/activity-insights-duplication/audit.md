# Activity Insights duplication audit

Date: August 27, 2026

## Scope

One-screen audit of the collapsed Activity Insights overview, focused on repeated information, repeated labels, and competing actions.

Evidence: `01-overview.png`

The authenticated simulator session expired during capture. The current screen code was rendered with a temporary local activity fixture solely to expose the layout; that fixture was removed immediately after capture. Recovery-specific content could therefore not be fully re-audited live.

## Step 1 — Review today's overview

Health: Needs simplification.

### Findings

1. Weekly progress is repeated. The hero says `120 / 150 min`; the first KPI says `120 Minutes`; active days appear in the KPI row; and the calendar badge repeats the week's session count. These are different cuts of one weekly-status idea, not four independent decisions.
2. The calendar introduction is over-labeled. `THIS WEEK`, `See your training rhythm`, `Training calendar`, and `Open day, week or month details` consume four lines before the calendar is opened.
3. The recommendation is over-labeled. `YOUR PLAN`, `Recommended for today`, `RECOMMENDED NEXT`, `Next session`, and `Movement session` all describe the same object before the rationale appears.
4. Streak is repeated across the overview KPI, the Progress patterns badge, and the expanded personal-bests content.
5. The header plus button and `Open activity log` currently lead to the same generic logging destination. They only justify separate placement if the recommendation CTA pre-fills the suggested activity, duration, and intensity.
6. Recovery summary plus recovery detail is useful progressive disclosure, not harmful duplication, as long as the expanded section explains inputs rather than repeating the score card.
7. Smart Insights and Progress patterns can coexist, but generated AI copy should interpret unexplained patterns rather than restating calendar totals, streaks, or bests.

## Recommended information architecture

1. Today: readiness headline and recovery score.
2. This week: one compact block containing goal progress, active days, session count, and the calendar disclosure.
3. Today's plan: one headline such as `30-minute walk`, two reasons, and a prefilled action.
4. Deeper patterns: recovery factors, records, streak history, mood association, and optional AI.

## Highest-impact reductions

- Remove the standalone `120 Minutes` KPI; the hero progress already communicates it more clearly.
- Merge the `THIS WEEK` introduction into the calendar disclosure header.
- Replace the five recommendation labels with `Today's plan` and `30-minute walk`.
- Keep current streak in one place and historical best inside Progress patterns.
- Make the recommendation CTA prefilled; keep the header plus as the generic logger.

## Accessibility limits

The screenshot supports hierarchy and repetition findings only. Screen-reader order, dynamic type, focus movement, and expanded-section announcements require an authenticated interactive pass.
