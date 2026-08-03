/**
 * Recovery is no longer its own screen.
 *
 * It answered "how ready am I", which is the first step of the training
 * decision rather than a separate errand — so it now opens Activity Insights,
 * where it is the Readiness section. It previously sat behind an unlabelled
 * pulse icon in the nav bar, which is easy to miss entirely.
 *
 * This route is kept as a redirect: it was one of six insight destinations
 * wired up previously, and other screens, notifications and deep links may
 * still point at it.
 */

import { Redirect } from 'expo-router';

export default function ActivityRecoveryRedirect() {
  return <Redirect href="/insights/activity-insights" />;
}
