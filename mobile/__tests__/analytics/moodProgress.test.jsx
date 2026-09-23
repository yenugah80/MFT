import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { mockRouter } from '../auth/__mocks__/expoRouter';
import MoodTab from '../../components/analytics/MoodTab';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('../../components/MoodTracker/MoodIcon3D', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockMoodIcon({ mood }) {
    return <View testID={`mood-lottie-${mood}`} />;
  };
});
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => {
    function MockSvgElement(props) {
      return React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
    }
    return MockSvgElement;
  };
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

const moodData = {
  avgScore: '6.8',
  avgIntensity: '6.8',
  avgEnergy: '5.9',
  dominantMood: 'calm',
  entriesLogged: 9,
  trackedDays: 6,
  periodDays: 7,
  coveragePercent: 86,
  highestIntensityDay: 'Fri',
  highestIntensity: 9,
  intensityRange: { min: 4, max: 9 },
  hasDataInPeriod: true,
  trend: [
    { date: '2026-08-20', mood: 'calm', intensity: 4, energy: 5, count: 2 },
    { date: '2026-08-21', mood: 'happy', intensity: 9, energy: 8, count: 1 },
  ],
  distribution: [
    { mood: 'calm', count: 5, percentage: 56 },
    { mood: 'happy', count: 4, percentage: 44 },
  ],
};

describe('Mood progress redesign', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps intensity, energy, coverage, and raw check-in distribution semantically separate', () => {
    render(<MoodTab data={moodData} period="week" recommendations={[]} onRefresh={jest.fn()} />);

    expect(screen.getByText('Calm showed up most')).toBeTruthy();
    expect(screen.getByTestId('mood-lottie-calm')).toBeTruthy();
    expect(screen.getByText('Avg intensity')).toBeTruthy();
    expect(screen.getByText('Avg energy')).toBeTruthy();
    expect(screen.getByText('6/7')).toBeTruthy();
    expect(screen.getByText('Fixed 1–10 scale · higher means stronger, not better')).toBeTruthy();
    expect(screen.getByText('9 individual check-ins this week')).toBeTruthy();
    expect(screen.getByLabelText('Calm, 5 check-ins, 56 percent')).toBeTruthy();
  });

  it('wires history and association drill-down actions', () => {
    render(<MoodTab data={moodData} period="week" recommendations={[]} onRefresh={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Mood history'));
    expect(mockRouter.push).toHaveBeenCalledWith('/history/mood');

    fireEvent.press(screen.getByLabelText('Mood & food'));
    expect(mockRouter.push).toHaveBeenCalledWith('/insights/mood-food-patterns');
  });

  it('shows a range-specific empty state without rendering stale KPIs', () => {
    render(
      <MoodTab
        data={{ ...moodData, entriesLogged: 0, hasDataInPeriod: false }}
        period="month"
        recommendations={[]}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getByText('No mood check-ins this month')).toBeTruthy();
    expect(screen.queryByText('Calm showed up most')).toBeNull();
  });
});
