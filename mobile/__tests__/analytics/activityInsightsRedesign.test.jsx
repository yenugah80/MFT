import React from 'react';
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ActivityInsightsView from '../../components/ActivityInsightsView';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => function MockSvgElement(props) {
    return React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
  };
  return { __esModule: true, default: stub('Svg'), Svg: stub('Svg'), Circle: stub('Circle') };
});

const day = (daysAgo, overrides = {}) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return {
    id: `activity-${daysAgo}`,
    timestamp: date.toISOString(),
    loggedAt: date.toISOString(),
    duration: 30,
    durationMinutes: 30,
    calories: 180,
    caloriesBurned: 180,
    category: 'Cardio',
    name: 'Walking',
    type: 'walking',
    intensity: 'moderate',
    ...overrides,
  };
};

const recovery = {
  score: 68,
  label: 'Good',
  color: '#16A34A',
  coverage: { isReliable: true, counted: 4, total: 5, missingWeight: 5, missing: ['mood'] },
  factors: [
    { factor: 'sleep', value: 75, counted: true, weight: 0.4, contribution: 10, detail: 'Good sleep' },
    { factor: 'stress', value: 55, counted: true, weight: 0.25, contribution: 1, detail: 'Moderate stress' },
  ],
};

const baseProps = {
  activities: [day(0), day(1), day(2)],
  targetMinutes: 150,
  moodTrend: [],
  recovery,
  strainTarget: { target: 12, recommendation: 'A moderate session fits today.' },
  recoveryHistory: { history: [] },
  chartWidth: 320,
  onLogSignal: jest.fn(),
  onDeleteActivity: jest.fn(),
  smartInsights: { onGenerate: jest.fn(), insights: null, isLoading: false },
};

describe('Activity Insights redesign', () => {
  beforeEach(() => jest.clearAllMocks());

  it('consolidates weekly progress and calendar without repeating the same metrics', () => {
    const onLogWorkout = jest.fn();
    render(<ActivityInsightsView {...baseProps} onLogWorkout={onLogWorkout} />);

    expect(screen.getByText('Good day to move')).toBeTruthy();
    expect(screen.getByText('Training progress')).toBeTruthy();
    expect(screen.getByLabelText(/\d+ of \d+ elapsed days have a workout this week/)).toBeTruthy();
    expect(screen.getByLabelText('3 workouts logged')).toBeTruthy();
    expect(screen.getByLabelText(/3 workouts logged on 3 calendar days from/)).toBeTruthy();
    expect(screen.getByText('TODAY’S PLAN')).toBeTruthy();
    expect(screen.queryByText('Weekly movement')).toBeNull();
    expect(screen.queryByText('Recommended for today')).toBeNull();
    expect(screen.queryByText('Next session')).toBeNull();
    expect(screen.getByLabelText('Recovery details, collapsed')).toBeTruthy();
    expect(screen.getByLabelText('Calendar details, collapsed')).toBeTruthy();
    expect(screen.getByLabelText('Progress patterns, collapsed')).toBeTruthy();
    expect(screen.queryByText(/AUGUST|SEPTEMBER|OCTOBER/)).toBeNull();

    fireEvent.press(screen.getByText('Set up this workout'));
    expect(onLogWorkout).toHaveBeenCalledTimes(1);
    expect(onLogWorkout).toHaveBeenCalledWith(expect.objectContaining({ hasSuggestion: true }));
  });

  it('preserves the full calendar and optional AI workflow behind disclosure', () => {
    const onGenerate = jest.fn();
    render(<ActivityInsightsView {...baseProps} smartInsights={{ onGenerate, insights: null, isLoading: false }} />);

    fireEvent.press(screen.getByLabelText('Calendar details, collapsed'));
    expect(screen.getByLabelText('Calendar details, expanded')).toBeTruthy();
    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('Week')).toBeTruthy();
    expect(screen.getByText('Month')).toBeTruthy();
    expect(screen.getByText(/Full ring ≈ \d+ min/)).toBeTruthy();
    expect(screen.getByText('Rest / upcoming')).toBeTruthy();
    expect(screen.getByText('Selected week')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Smart insights, collapsed'));
    fireEvent.press(screen.getByText('Generate insights'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows an actionable empty state without fabricating training patterns', () => {
    const onLogWorkout = jest.fn();
    render(<ActivityInsightsView {...baseProps} activities={[]} recovery={null} onLogWorkout={onLogWorkout} />);

    expect(screen.getByText('Your training story starts here')).toBeTruthy();
    expect(screen.queryByLabelText('Calendar details, collapsed')).toBeNull();
    fireEvent.press(screen.getByText('Log first workout'));
    expect(onLogWorkout).toHaveBeenCalledTimes(1);
  });

  it('does not overstate recovery coverage from a legacy backend response', () => {
    render(
      <ActivityInsightsView
        {...baseProps}
        recovery={{
          ...recovery,
          coverage: { isReliable: true, counted: 4, total: 4, missingWeight: 0, missing: [] },
          factors: recovery.factors.concat(
            { factor: 'activity_load', value: 65, counted: true, weight: 0.2, contribution: 3 },
            { factor: 'hydration', value: 75, counted: true, weight: 0.1, contribution: 3 }
          ),
        }}
      />
    );

    fireEvent.press(screen.getByLabelText('Recovery details, collapsed'));
    expect(screen.getByLabelText('4 of 5 recovery signals available')).toBeTruthy();
    expect(screen.getByText(/Mood not logged.*5% of the model had no data/)).toBeTruthy();
  });

  it('does not convert a history request failure into fake zero activity', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks/useActivityLog.js'), 'utf8');

    expect(source).toContain("throw err;");
    expect(source).not.toContain("return { activities: [], total: 0, summary: {} }");
  });
});
