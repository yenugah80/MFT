/**
 * "Your Summary" is no longer its own screen.
 *
 * It was a second, parallel entry point into wellness insights alongside
 * /analytics ("Your Progress") — different mental model (Apple-Health-style
 * weekly cards vs. Day/Week/Month domain tabs), no cross-links between them,
 * and its card destinations (Mood -> /insights/mood-food-patterns,
 * Hydration -> /analytics/hydration, Activity -> /insights/activity-insights)
 * already pointed back into the other screen's territory. See
 * docs/architecture/recommendation-engine.md and
 * docs/proposals/ANALYTICS_ARCHITECTURE_PROPOSAL.md for the fragmentation
 * this was part of.
 *
 * /analytics is the canonical destination now — same five domains, plus the
 * Day/Week/Month selector this screen didn't have.
 *
 * Kept as a redirect, not deleted: other screens, notifications, or deep
 * links may still point at bare /insights (same reasoning as
 * app/insights/activity-recovery.jsx).
 */

import { Redirect } from 'expo-router';

export default function InsightsSummaryRedirect() {
  return <Redirect href="/analytics" />;
}
