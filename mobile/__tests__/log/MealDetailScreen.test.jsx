import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1', logData: global.__TEST_LOG_DATA__ }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (props) => <View {...props} /> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (props) => <View {...props} /> };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => function MockSvgElement(props) {
    return React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
  };
  return { __esModule: true, default: stub('Svg'), Svg: stub('Svg'), Circle: stub('Circle') };
});

jest.mock('@/services/database', () => ({ getMealById: jest.fn() }));

import MealDetailScreen from '../../app/meal/[id]';

describe('MealDetailScreen — Stage 8b: trusts stored healthScore/nutriscore instead of recomputing', () => {
  it('renders the STORED healthScore/nutriscore, not a recomputed one, when both are present', () => {
    // Macros here are deliberately chosen so the screen's OWN local
    // calculateHealthScore/calculateNutritionGrade would produce a
    // DIFFERENT number (Excellent macros -> local calc would score high) —
    // proving the stored value below is what actually renders, not a
    // recomputation that happens to coincide with it.
    global.__TEST_LOG_DATA__ = JSON.stringify({
      id: '1', foodName: 'Test Meal', timestamp: Date.now(),
      calories: 300, protein: 5, carbs: 60, fat: 2, fiber: 1, sugar: 20, sodium: 900,
      healthScore: 42, // deliberately NOT what the local macro-balance calc would produce
      nutriscore: 'D', // deliberately NOT what the local grade calc would produce
      micros: {},
    });
    render(<MealDetailScreen />);
    expect(screen.getByText('42')).toBeOnTheScreen();
    expect(screen.getByText('D')).toBeOnTheScreen();
  });

  it('falls back to the local calculation when healthScore/nutriscore are genuinely absent', () => {
    global.__TEST_LOG_DATA__ = JSON.stringify({
      id: '2', foodName: 'Legacy Meal', timestamp: Date.now(),
      calories: 300, protein: 5, carbs: 60, fat: 2, fiber: 1, sugar: 20, sodium: 900,
      // no healthScore / nutriscore fields at all
      micros: {},
    });
    render(<MealDetailScreen />);
    // Hand-computed from this screen's own calculateHealthScore/
    // calculateNutritionGrade for these exact macros: macroScore 10 (low
    // protein%, high carb%, low fat%) -> baseScore 16.5 -> round 17;
    // grade points: positive 1, negative 8 -> finalScore 7 -> 'C'.
    expect(screen.getByText('17')).toBeOnTheScreen();
    expect(screen.getByText('C')).toBeOnTheScreen();
  });
});
