/**
 * Hydration Insights - Redirects to Hydration Analytics
 *
 * This file exists for backwards compatibility.
 * All hydration analytics are now consolidated in hydration-analytics.jsx
 */

import { Redirect } from 'expo-router';

export default function HydrationInsightsRedirect() {
  return <Redirect href="/insights/hydration-analytics" />;
}
