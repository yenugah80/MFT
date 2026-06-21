/**
 * useMoodTrends — re-exports from useMoodInsights to avoid duplicate hook names.
 * The canonical implementation lives in useMoodInsights.js.
 *
 * calculateMoodStats operates on the trend data array from GET /mood/trends.
 */

export { useMoodTrends } from './useMoodInsights';

/**
 * Quick client-side stats from GET /mood/trends response data array.
 */
export function calculateMoodStats(trendData) {
  if (!trendData || trendData.length === 0) {
    return { avgMood: '0.0', bestDay: 'N/A', patternsDetected: false };
  }

  const bestEntry = trendData.reduce(
    (best, cur) => (cur.intensity > (best?.intensity || 0) ? cur : best),
    null
  );
  const bestDay = bestEntry?.dayKey ?? 'N/A';

  const avgIntensity =
    trendData.reduce((sum, e) => sum + (e.intensity || 0), 0) / trendData.length;

  const variance =
    trendData.reduce((sum, e) => sum + (e.intensity - avgIntensity) ** 2, 0) /
    trendData.length;

  return {
    avgMood: avgIntensity.toFixed(1),
    bestDay,
    patternsDetected: variance > 2,
  };
}
