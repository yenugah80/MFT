import fs from 'fs';
import path from 'path';

// Jest executes this file as CommonJS even though the app source uses ESM.
// eslint-disable-next-line no-undef
const MOBILE_ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(MOBILE_ROOT, relativePath), 'utf8');

describe('sleep and stress logger entry-point wiring', () => {
  it('opens both wellness loggers from focus navigation on the Log tab', () => {
    const source = read('app/(tabs)/log.js');

    expect(source).toMatch(/case ['"]sleep['"]:[\s\S]*setShowSleepModal\(true\)/);
    expect(source).toMatch(/case ['"]stress['"]:[\s\S]*setShowStressModal\(true\)/);
  });

  it('opens the logger directly over History instead of redirecting to the meal form', () => {
    const source = read('components/history/WellnessHistoryScreen.jsx');

    expect(source).toContain("import SleepLogger from '../SleepLogger'");
    expect(source).toContain("import StressLogger from '../StressLogger'");
    expect(source).toContain('setShowLogger(true)');
    expect(source).not.toContain('focus: type');
  });

  it('invalidates history after a successful sleep save', () => {
    const source = read('hooks/useSleepLog.js');
    expect(source).toContain("invalidateQueries({ queryKey: ['sleepHistory'] })");
  });

  it('invalidates stress history and dashboard data after a successful stress save', () => {
    const source = read('hooks/useStressLog.js');
    expect(source).toContain("invalidateQueries({ queryKey: ['stressHistory'] })");
    expect(source).toContain("invalidateQueries({ queryKey: ['stressToday'] })");
    expect(source).toContain("invalidateQueries({ queryKey: ['dashboard'] })");
  });

  it('paginates histories and renders stress symptoms with recoverable deletion', () => {
    const sleepHook = read('hooks/useSleepLog.js');
    const stressHook = read('hooks/useStressLog.js');
    const screen = read('components/history/WellnessHistoryScreen.jsx');

    expect(sleepHook).toContain('useInfiniteQuery');
    expect(stressHook).toContain('useInfiniteQuery');
    expect(screen).toContain('entry.physicalSymptoms?.[key]');
    expect(screen).toContain('history.fetchNextPage()');
    expect(screen).toContain('setDeleteError');
  });

  it('preserves full entry detail and wires selected history ranges into insights', () => {
    const history = read('components/history/WellnessHistoryScreen.jsx');
    const sleepInsights = read('app/insights/sleep-analytics.jsx');
    const stressInsights = read('app/insights/stress-patterns.jsx');

    expect(history).toContain('SLEEP_CONTEXT_TAGS.find');
    expect(history).not.toContain('tags.slice(0, 3)');
    expect(history).toContain('/insights/sleep-analytics');
    expect(history).toContain('/insights/stress-patterns');
    expect(history).toContain('?days=${days}');
    expect(sleepInsights).toContain('trendsError');
    expect(stressInsights).toContain('patternsError');
    expect(sleepInsights).toContain('useSleepLog(rangeDays)');
    expect(stressInsights).toContain('useStressLog(rangeDays)');
  });

  it('keeps compact dashboard History and Insights actions readable and accessible', () => {
    const cards = [
      read('components/dashboard/SleepSummaryCard.jsx'),
      read('components/dashboard/StressSummaryCard.jsx'),
    ];

    cards.forEach((source) => {
      expect(source).toContain('numberOfLines={1}>History');
      expect(source).toContain('numberOfLines={1}>Insights');
      expect(source).toContain('accessibilityRole="button"');
      expect(source).toContain('accessibilityHint=');
      expect(source).toContain('minHeight: 44');
      expect(source).toContain('primaryActionButton');
      expect(source).not.toContain('name="chevron-forward" size={12}');
    });

    expect(cards[1]).toContain('ellipsizeMode="tail"');
  });

  it('finishes the dashboard without a FAB or permanent blank footer', () => {
    const dashboard = read('components/DashboardContent.jsx');

    expect(dashboard).not.toContain('FloatingActionButton');
    expect(dashboard).not.toContain('handleDashboardScroll');
    expect(dashboard).not.toContain('isNearDashboardEnd');
    expect(dashboard).toContain('paddingBottom: SPACING[6]');
    expect(dashboard).not.toContain('paddingBottom: 120');
  });

  it('keeps the mood quick check-in compact, truthful, and distinctly routed', () => {
    const card = read('components/dashboard/EnhancedMoodCard.jsx');
    const dashboard = read('components/DashboardContent.jsx');
    const moodHook = read('hooks/useMoodLog.js');
    const moodHistory = read('app/history/mood.jsx');
    const analytics = read('app/analytics/index.jsx');

    expect(card).toContain("const QUICK_MOOD_KEYS = ['calm', 'happy', 'energized', 'neutral', 'tired']");
    expect(card).toContain('QUICK_MOODS.map');
    expect(card).not.toContain('MOOD_TYPES.map');
    expect(card).toContain('<MoodIcon3D');
    expect(card).toContain('interactive={false}');
    expect(card).toContain('resizeMode="contain"');
    expect(card).toContain('accessibilityState={{ selected: isSelected, disabled: !!quickLogging, busy: isSaving }}');
    expect(card).toContain('Energy {latestMood?.energyLevel ?? 5}/10');
    expect(card).toContain('await logMood({');
    expect(card.indexOf('await logMood({')).toBeLessThan(card.indexOf('NotificationFeedbackType.Success'));

    expect(moodHook).toContain('export const MOOD_DEFAULT_ENERGY');
    expect(moodHook).toContain("'moodHistory'");
    expect(dashboard).toContain("pathname: '/analytics', params: { domain: 'mood' }");
    expect(dashboard).toContain("onViewMoodHistory={() => router.push('/history/mood')}");
    expect(analytics).toContain('useLocalSearchParams');
    expect(analytics).toContain("setActiveDomain(validDomain)");
    expect(moodHistory).toContain('useMoodHistory(days)');
    expect(moodHistory).toContain('Mood history');
    expect(moodHistory).toContain('Energy {entry.energyLevel ?? 5}/10');

    const moodIcon = read('components/MoodTracker/MoodIcon3D.jsx');
    expect(moodIcon).toContain('interactive = true');
    expect(moodIcon).toContain('importantForAccessibility="no-hide-descendants"');
    expect(moodIcon).toContain('pointerEvents="none"');
  });
});
