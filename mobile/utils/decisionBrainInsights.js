/**
 * Normalizes a decision-brain domain-insights response (patterns[] +
 * correlations[] + recommendations[], see backend/src/routes/decisionBrain.js)
 * into the flat array of { id, domain, type, title, message, icon, color,
 * metric } objects RecommendationCard/RecommendationSection already expect.
 * Tab components filter this array by `.type` into their existing
 * "AI Insights" / "Discovered Patterns" / "Suggestions" sections — only the
 * data source changed (see docs/architecture/recommendation-engine.md), not
 * the rendering.
 *
 * Pure and dependency-free on purpose — useAnalytics.js is the only caller,
 * but keeping this out of the hook file means it can be unit-tested without
 * pulling react-query/apiClient into the test environment.
 *
 * @param {object|undefined} data - raw response from a /decision-brain/*-insights query
 * @param {'mood'|'nutrition'|'hydration'|'activity'} domain
 * @returns {Array<object>}
 */
export function mapDecisionBrainInsights(data, domain, options = {}) {
  if (!data?.success) return [];

  const canonicalTodayProgress = Number(options.canonicalTodayProgress);
  const apiTodayProgress = Number(data.stats?.todayProgress);
  const hasCanonicalTodayProgress = Number.isFinite(canonicalTodayProgress);
  const todayProgressAgrees = !hasCanonicalTodayProgress
    || (Number.isFinite(apiTodayProgress) && apiTodayProgress === canonicalTodayProgress);

  // Older deployed servers used this same 14-day rolling window but did not
  // describe it in the payload. Keep the fallback during rolling upgrades.
  const windowContext = {
    windowType: data.window?.type || 'rolling',
    windowDays: data.window?.days || 14,
    correlationDays: data.window?.correlationDays || [7, 14],
  };

  const patterns = (data.patterns || [])
    .filter((pattern) => pattern?.category !== 'today' || todayProgressAgrees)
    .map((p, i) => ({
    id: `${domain}-pattern-${i}`,
    domain,
    type: 'pattern',
    title: p.title,
    message: p.description,
    icon: p.icon,
    color: p.color,
    ...windowContext,
    // Backend pattern generators return confidence as a 0-1 fraction (e.g.
    // 0.8); RecommendationCard's badge renders `{metric.confidence}%`
    // directly with no scaling of its own, so this must already be 0-100
    // or every pattern card shows something like "0.8%" instead of "80%".
    metric: p.confidence !== undefined ? { confidence: Math.round(p.confidence * 100) } : undefined,
  }));

  const correlations = (data.correlations || []).map((c, i) => ({
    id: c.id || `${domain}-correlation-${i}`,
    domain,
    type: 'insight',
    title: c.pattern,
    message: c.statement,
    metric: c.confidence !== undefined ? { confidence: c.confidence } : undefined,
    evidence: c.impactType ? { type: 'correlation', impactType: c.impactType } : undefined,
    ...windowContext,
  }));

  const recs = (data.recommendations || []).map((r, i) => ({
    id: `${domain}-rec-${i}`,
    domain,
    type: 'suggestion',
    title: r.title,
    message: r.description,
    icon: r.icon,
    ...windowContext,
  }));

  return [...patterns, ...correlations, ...recs];
}

export default mapDecisionBrainInsights;
