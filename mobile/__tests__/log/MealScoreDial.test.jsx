/**
 * Real component-render verification of the Phase 2 scoring redesign —
 * renders the actual MealScoreDial component (not just the extracted
 * calculateMealScore function in isolation) with the real rice+tomato-dal
 * canonical totals from the Phase 1/2 validation, and asserts what a user
 * would actually see on screen: the rendered score number and label text.
 *
 * This is the escalation from pure-function unit tests to component
 * rendering the earlier Phase 2 report was missing — it would have caught
 * a prop-wiring or import-chain break (like the displayItem null-crash
 * found on-device earlier in this session) that a function-only test can't.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MealScoreDial from '../../components/log/MealSummary/MealScoreDial';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => function MockSvgElement(props) {
    return React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
  };
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'),
    Circle: stub('Circle'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Stop: stub('Stop'),
  };
});

jest.mock('../../providers/ThemeProvider', () => ({
  useTheme: () => ({
    isDark: false,
    colors: { text: { primary: '#111827', secondary: '#4B5563' } },
  }),
}));

describe('MealScoreDial — rendered component, real Phase 2 validation data', () => {
  it('renders the rice+tomato-dal case as Excellent (82), not Fair — the actual bug this session fixed', () => {
    const item = {
      macros: { calories_kcal: 385, protein_g: 14, carbs_g: 75, fat_g: 3, fiber_g: 8.6, sugar_g: 4.1, sodium_mg: 750 },
      micros: { vitaminA: 300, folate: 90, calcium: 45, iron: 1.9 },
      confidence: 0.6,
    };
    // macroScore: 100 -12(protein<18) -5(carb/fiber ratio 8.72>6) -10(fat<4) -5(sodium>400) = 68
    // fiberScore 100, sugarScore 83.6, confidenceModifier 85.8 (0.6*143)
    // base = 68*.55 + 100*.20 + 83.6*.15 + 85.8*.05 = 74.23
    // microBonus: 4 of 7 key nutrients present (calcium, iron, vitaminA, folate) = 8
    // final = round(74.23 + 8) = 82
    render(<MealScoreDial item={item} />);
    expect(screen.getByText('82')).toBeOnTheScreen();
    expect(screen.getByText('Excellent')).toBeOnTheScreen();
  });

  it('renders a genuine junk-food case (granola bar) as Poor, not Fair', () => {
    const item = {
      macros: { calories_kcal: 190, protein_g: 4, carbs_g: 29, fat_g: 7, fiber_g: 1, sugar_g: 15, sodium_mg: 140 },
      micros: { iron: 0.8 },
      confidence: 0.7,
    };
    render(<MealScoreDial item={item} />);
    expect(screen.getByText('35')).toBeOnTheScreen();
    expect(screen.getByText('Poor')).toBeOnTheScreen();
  });

  it('renders "Meal Score" subtitle regardless of item', () => {
    render(<MealScoreDial item={{ macros: { calories_kcal: 100 } }} />);
    expect(screen.getByText('Meal Score')).toBeOnTheScreen();
  });

  it('does not crash when item is null (matches calculateMealScore\'s null-safe default of 50)', () => {
    render(<MealScoreDial item={null} />);
    expect(screen.getByText('50')).toBeOnTheScreen();
    expect(screen.getByText('Fair')).toBeOnTheScreen();
  });
});
