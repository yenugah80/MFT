/**
 * Today's activity snapshot
 *
 * Shapes GET /activity/today into what scoring and summary cards consume.
 * Pure and side-effect free so it can be tested without the hook's React
 * Query / apiClient / expo-crypto dependencies.
 */

const DEFAULT_INTENSITY = 'moderate';

/**
 * @param {{ totalMinutes?: number, totalCalories?: number, activityCount?: number, types?: object }} todaySummary
 * @param {Array<{ intensity?: string, durationMinutes?: number }>} activities
 * @returns {{ minutes: number, calories: number, count: number, types: string[], intensity: string }}
 */
export function deriveTodaySnapshot(todaySummary = {}, activities = []) {
  const rows = Array.isArray(activities) ? activities : [];

  // Dominant intensity = the one carrying the most minutes today. Ties fall to
  // whichever appears first, which keeps the result stable for equal splits.
  const minutesByIntensity = rows.reduce((acc, activity) => {
    const key = activity?.intensity || DEFAULT_INTENSITY;
    acc[key] = (acc[key] || 0) + (Number(activity?.durationMinutes) || 0);
    return acc;
  }, {});

  const dominant = Object.entries(minutesByIntensity).sort((a, b) => b[1] - a[1])[0];

  return {
    minutes: Number(todaySummary?.totalMinutes) || 0,
    calories: Number(todaySummary?.totalCalories) || 0,
    count: Number(todaySummary?.activityCount) || 0,
    // `types` arrives from the API as a { type: minutes } map; the wellness
    // score expects an array (it reads .length for the variety bonus).
    types: Object.keys(todaySummary?.types || {}),
    intensity: dominant?.[0] || DEFAULT_INTENSITY,
  };
}

export default deriveTodaySnapshot;
