import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { mockRouter, setMockSearchParams } from '../auth/__mocks__/expoRouter';

import AnalyticsScreen from '../../app/analytics/index';

const mockUseAnalytics = jest.fn();

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(() => Promise.resolve()), ImpactFeedbackStyle: { Light: 'light' } }));
jest.mock('../../hooks/useAnalytics', () => ({ useAnalytics: (...args) => mockUseAnalytics(...args) }));
jest.mock('../../components/FadeInView', () => {
  const React = require('react');
  return function MockFade({ children }) { return <>{children}</>; };
});

jest.mock('../../components/analytics/WellnessTab', () => {
  const React = require('react'); const { Text } = require('react-native');
  return function MockWellnessTab({ period }) { return <Text>{`wellness:${period}`}</Text>; };
});
jest.mock('../../components/analytics/NutritionTab', () => {
  const React = require('react'); const { Text } = require('react-native');
  return function MockNutritionTab({ period }) { return <Text>{`nutrition:${period}`}</Text>; };
});
jest.mock('../../components/analytics/MoodTab', () => {
  const React = require('react'); const { Text } = require('react-native');
  return function MockMoodTab({ period }) { return <Text>{`mood:${period}`}</Text>; };
});
jest.mock('../../components/analytics/ActivityTab', () => {
  const React = require('react'); const { Text } = require('react-native');
  return function MockActivityTab({ period }) { return <Text>{`activity:${period}`}</Text>; };
});
jest.mock('../../components/analytics/HydrationTab', () => {
  const React = require('react'); const { Text } = require('react-native');
  return function MockHydrationTab({ period }) { return <Text>{`hydration:${period}`}</Text>; };
});

describe('Your Progress route wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockSearchParams({});
    mockUseAnalytics.mockReturnValue({
      nutrition: {}, mood: {}, activity: {}, hydration: {}, wellness: {},
      recommendations: {}, queries: {}, isLoading: false,
      refetch: jest.fn(() => Promise.resolve()),
      onCompleteRecommendation: jest.fn(), onDismissRecommendation: jest.fn(),
    });
  });

  it('keeps the selected domain and period in the URL', () => {
    render(<AnalyticsScreen />);

    fireEvent.press(screen.getByLabelText('Month view'));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ domain: 'nutrition', period: 'month' });
    expect(screen.getByText('nutrition:month')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Hydration progress'));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ domain: 'hydration', period: 'month' });
    expect(screen.getByText('hydration:month')).toBeTruthy();
  });

  it('opens a valid deep link directly on its requested domain and range', () => {
    setMockSearchParams({ domain: 'activity', period: 'today' });
    render(<AnalyticsScreen />);

    expect(screen.getByText('activity:today')).toBeTruthy();
    expect(mockUseAnalytics).toHaveBeenCalledWith('today');
  });
});
