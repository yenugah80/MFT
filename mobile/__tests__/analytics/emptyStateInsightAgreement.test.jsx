/**
 * Regression guard for the "Your Progress" empty-state/insight contradiction.
 *
 * The bug: NutritionTab and HydrationTab each derived their own "is there
 * anything to show" flag from a today-only field (calories.consumed / todayMl),
 * while the insight cards rendered alongside them came from a separately
 * period-scoped source. A user with real logged history but nothing logged
 * *today* would see "No nutrition data yet" directly above a populated
 * "Calorie Trend" card in the same screen render.
 *
 * The fix: both tabs now gate their empty state on `data.hasDataInPeriod`, a
 * single flag computed backend-side over the same window the insight cards
 * are generated from (see getUserDataStats in analyticsRecommendationService.js).
 * These tests pin that contract: the empty-state text and a populated insight
 * card must never both be visible, and hasDataInPeriod — not the legacy
 * today-only fields — is what decides which one renders.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => (props) => React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'),
    Polyline: stub('Polyline'),
    Circle: stub('Circle'),
    Line: stub('Line'),
    Text: stub('SvgText'),
  };
});
// GoalRealityCheckCard fires a real /nutrition/weight-history request via
// apiClient's useQuery — without this it hits the real network in tests and
// leaks retries past test completion.
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(() => Promise.resolve(null)) },
}));
jest.mock('../../hooks/useRecommendations', () => ({
  useSmartRecommendations: () => ({
    recommendations: [],
    summary: null,
    nutritionalStatus: null,
    loading: false,
    fetchRecommendations: jest.fn(),
    quickLog: jest.fn(),
    hasRecommendations: false,
  }),
}));

import NutritionTab from '../../components/analytics/NutritionTab';
import HydrationTab from '../../components/analytics/HydrationTab';

const nutritionData = {
  calories: { consumed: 0, budget: 2000, percentage: 0 }, // nothing logged *today*
  macros: {},
  mealsLogged: 0,
  weekData: [],
  hasDataInPeriod: true, // ...but the selected period has real data
};

const calorieTrendInsight = {
  id: 'nutrition_calorie_trend',
  type: 'insight',
  title: 'Calorie Trend',
  message: "Your average daily intake is 1393 calories. You're eating lighter than average today.",
};

const hydrationData = {
  todayMl: 0, // nothing logged *today*
  goalMl: 2500,
  goalPercent: 0,
  streak: 0,
  avgDaily: 3900,
  hasDataInPeriod: true, // ...but the selected period has real data
};

const hydrationTrendInsight = {
  id: 'hydration_trend',
  type: 'insight',
  title: 'Below Average',
  message: "Your daily average is 3.9L. Today you're a bit behind.",
};

// GoalRealityCheckCard (rendered inside NutritionTab's "has data" branch)
// calls useQuery directly — needs a real QueryClient in the tree.
function renderWithClient(ui) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NutritionTab empty-state / insight agreement', () => {
  it('does not show the empty state when hasDataInPeriod is true, even with zero calories today', () => {
    renderWithClient(
      <NutritionTab data={nutritionData} period="week" recommendations={[calorieTrendInsight]} />
    );
    expect(screen.queryByText('No nutrition data yet')).toBeNull();
    expect(screen.getByText('Calorie Trend')).toBeTruthy();
  });

  it('shows the empty state when hasDataInPeriod is false, regardless of today-only fields', () => {
    renderWithClient(
      <NutritionTab
        data={{ ...nutritionData, hasDataInPeriod: false }}
        period="week"
        recommendations={[]}
      />
    );
    expect(screen.getByText('No nutrition data yet')).toBeTruthy();
  });
});

describe('HydrationTab empty-state / insight agreement', () => {
  it('does not show the empty state when hasDataInPeriod is true, even with zero ml today', () => {
    render(
      <HydrationTab data={hydrationData} period="month" recommendations={[hydrationTrendInsight]} />
    );
    expect(screen.queryByText('No hydration data yet')).toBeNull();
    expect(screen.getByText('Below Average')).toBeTruthy();
  });

  it('shows the empty state when hasDataInPeriod is false, regardless of today-only fields', () => {
    render(
      <HydrationTab
        data={{ ...hydrationData, hasDataInPeriod: false }}
        period="month"
        recommendations={[]}
      />
    );
    expect(screen.getByText('No hydration data yet')).toBeTruthy();
  });
});
