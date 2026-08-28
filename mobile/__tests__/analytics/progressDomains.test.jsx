import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockRouter } from '../auth/__mocks__/expoRouter';
import WellnessTab from '../../components/analytics/WellnessTab';
import NutritionTab from '../../components/analytics/NutritionTab';
import ActivityTab from '../../components/analytics/ActivityTab';
import HydrationTab from '../../components/analytics/HydrationTab';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(() => Promise.resolve()), notificationAsync: jest.fn(() => Promise.resolve()), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Error: 'error' } }));
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => {
    function MockSvgElement(props) {
      return React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
    }
    return MockSvgElement;
  };
  return { __esModule: true, default: stub('Svg'), Svg: stub('Svg'), Polyline: stub('Polyline'), Circle: stub('Circle'), Line: stub('Line'), Text: stub('SvgText') };
});
jest.mock('../../services/apiClient', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve(null)) } }));
jest.mock('../../hooks/useRecommendations', () => ({ useSmartRecommendations: () => ({ recommendations: [], summary: null, nutritionalStatus: null, loading: false, fetchRecommendations: jest.fn(), quickLog: jest.fn(), hasRecommendations: false, blocked: false }) }));

const renderWithClient = (ui) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('remaining Progress domains redesign', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unpacks wellness score and wires sleep/stress deep dives', () => {
    render(<WellnessTab period="week" recommendations={[{ id: 'wellness_score_week', type: 'insight', message: 'Your combined balance this week.', metric: { overall: 64, breakdown: { nutrition: 50, hydration: 70, activity: 80, mood: 56 } } }]} />);
    expect(screen.getByText('64 out of 100')).toBeTruthy();
    expect(screen.getByText('The score, unpacked')).toBeTruthy();
    expect(screen.getByText('An average of the four domain scores')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Sleep analytics'));
    expect(mockRouter.push).toHaveBeenCalledWith('/insights/sleep-analytics');
    fireEvent.press(screen.getByLabelText('Stress patterns'));
    expect(mockRouter.push).toHaveBeenCalledWith('/insights/stress-patterns');
  });

  it('labels activity range totals separately from the fixed weekly guideline', () => {
    render(<ActivityTab period="month" recommendations={[]} data={{ totalMinutes: 420, weeklyGoalMinutes: 120, cdcGoalPercent: 80, activeDays: 9, streak: 3, hasDataInPeriod: true, weekData: [{ label: 'A', minutes: 30 }, { label: 'B', minutes: 45 }] }} />);
    expect(screen.getByText('420 active minutes')).toBeTruthy();
    expect(screen.getByText('Range minutes')).toBeTruthy();
    expect(screen.getByText('150-minute progress')).toBeTruthy();
    expect(screen.getByText('Sunday–Saturday calendar week, independent of the rolling range above')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Activity insights'));
    expect(mockRouter.push).toHaveBeenCalledWith('/insights/activity-insights');
  });

  it('separates hydration today values from selected-range averages and wires both actions', () => {
    render(<HydrationTab period="month" recommendations={[]} data={{ todayMl: 800, goalMl: 2500, goalPercent: 32, streak: 2, avgDaily: 1900, totalMlInPeriod: 15200, daysLoggedInPeriod: 8, daysGoalMetInPeriod: 3, hasDataInPeriod: true }} />);
    expect(screen.getByText('1.9L daily average')).toBeTruthy();
    expect(screen.getByText('Current-day progress')).toBeTruthy();
    expect(screen.getByText('Hydration in the last 30 days')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Hydration analytics'));
    expect(mockRouter.push).toHaveBeenCalledWith('/analytics/hydration');
    fireEvent.press(screen.getByLabelText('Log water'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/log?focus=hydration');
  });

  it('preserves Smart Food Picks while distinguishing today-only nutrition values', () => {
    renderWithClient(<NutritionTab period="week" recommendations={[]} data={{ calories: { consumed: 650, budget: 2000, percentage: 33 }, macros: { protein: { goal: 100 }, carbs: { goal: 200 }, fat: { goal: 60 } }, mealsLogged: 2, hasDataInPeriod: true, weekData: [{ label: 'M', calories: 1200 }], weeklyAverages: { avgCalories: 1500, avgProtein: 70, avgCarbs: 160, avgFats: 50 } }} />);
    expect(screen.getByText('1,500 daily average')).toBeTruthy();
    expect(screen.getByText('Calories today')).toBeTruthy();
    expect(screen.getByText('Meals today')).toBeTruthy();
    expect(screen.getByLabelText('Smart Food Picks')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Nutrition analytics'));
    expect(mockRouter.push).toHaveBeenCalledWith('/analytics/nutrition');
  });
});
