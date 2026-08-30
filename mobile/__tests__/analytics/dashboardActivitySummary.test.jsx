import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ActivitySummaryCard from '../../components/dashboard/ActivitySummaryCard';
import { mockRouter } from '../auth/__mocks__/expoRouter';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('../../hooks/useActivityLog', () => ({
  useActivityLog: () => ({
    todaySummary: { totalCalories: 226, totalMinutes: 60, activityCount: 1 },
    activities: [{ type: 'walking', durationMinutes: 60, intensity: 'moderate' }],
    weeklyProgress: { progress: 1, weeklyMinutes: 180, target: 150, remaining: 0, onTrack: true },
    isTodayLoading: false,
  }),
}));

describe('Activity dashboard actions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps History and Insights visible, accessible, and distinctly routed', () => {
    render(<ActivitySummaryCard />);

    fireEvent.press(screen.getByLabelText('Activity history'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/insights/activity-insights',
      params: { view: 'history' },
    });

    fireEvent.press(screen.getByLabelText('Activity insights'));
    expect(mockRouter.push).toHaveBeenCalledWith('/insights/activity-insights');
  });
});
