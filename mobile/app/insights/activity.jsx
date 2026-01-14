/**
 * Activity Insights - Redirects to Activity Analytics
 *
 * This file exists for backwards compatibility.
 * All activity analytics are now consolidated in activity-analytics.jsx
 */

import { Redirect } from 'expo-router';

export default function ActivityInsightsRedirect() {
  return <Redirect href="/insights/activity-analytics" />;
}
