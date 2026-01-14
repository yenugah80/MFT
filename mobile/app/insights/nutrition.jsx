/**
 * Nutrition Insights - Redirects to Food Analytics
 *
 * This file exists for backwards compatibility.
 * All nutrition analytics are now consolidated in food-analytics.jsx
 */

import { Redirect } from 'expo-router';

export default function NutritionInsightsRedirect() {
  return <Redirect href="/insights/food-analytics" />;
}
