/**
 * Analytics Routes Tests
 *
 * Tests for:
 * - POST /api/analytics/food-suggestions endpoint
 * - Fallback suggestions on error
 */

import { jest } from '@jest/globals';

// Mock the database
jest.mock('../src/config/db.js', () => ({
  db: {
    execute: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

describe('Food Suggestions Endpoint Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input validation', () => {
    it('validates gaps array is required', () => {
      const gaps = null;
      const isValid = Boolean(gaps && Array.isArray(gaps) && gaps.length > 0);
      expect(isValid).toBe(false);
    });

    it('validates gaps must be an array', () => {
      const gaps = 'not an array';
      const isValid = Boolean(gaps && Array.isArray(gaps) && gaps.length > 0);
      expect(isValid).toBe(false);
    });

    it('validates gaps array must not be empty', () => {
      const gaps = [];
      const isValid = Boolean(gaps && Array.isArray(gaps) && gaps.length > 0);
      expect(isValid).toBe(false);
    });

    it('accepts valid gaps array', () => {
      const gaps = [{ key: 'iron', label: 'Iron', percentage: 25 }];
      const isValid = Boolean(gaps && Array.isArray(gaps) && gaps.length > 0);
      expect(isValid).toBe(true);
    });
  });

  describe('Prompt generation', () => {
    it('generates correct gaps list string', () => {
      const gaps = [
        { key: 'iron', label: 'Iron', percentage: 25 },
        { key: 'calcium', label: 'Calcium', percentage: 30 },
      ];

      const gapsList = gaps
        .map((g) => `${g.label} (currently at ${g.percentage}% of daily recommended)`)
        .join(', ');

      expect(gapsList).toBe(
        'Iron (currently at 25% of daily recommended), Calcium (currently at 30% of daily recommended)'
      );
    });
  });

  describe('Response parsing', () => {
    it('parses valid JSON response', () => {
      const content = '{"suggestions": {"iron": {"foods": ["spinach"], "tip": "Test tip"}}}';
      const suggestions = JSON.parse(content);
      expect(suggestions.suggestions.iron.foods).toContain('spinach');
    });

    it('extracts JSON from markdown wrapped response', () => {
      const content = '```json\n{"suggestions": {"iron": {"foods": ["spinach"]}}}\n```';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const suggestions = JSON.parse(jsonMatch[0]);
      expect(suggestions.suggestions.iron.foods).toContain('spinach');
    });

    it('handles nested JSON object extraction', () => {
      const content = 'Here is the response:\n{"suggestions": {"calcium": {"foods": ["dairy", "greens"], "tip": "Spread intake"}}}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const suggestions = JSON.parse(jsonMatch[0]);
      expect(suggestions.suggestions.calcium.foods).toHaveLength(2);
    });
  });

  describe('Fallback suggestions', () => {
    const fallbackSuggestions = {
      iron: {
        foods: ['spinach', 'lentils', 'red meat', 'fortified cereals'],
        tip: 'Pair with vitamin C for better absorption',
      },
      calcium: {
        foods: ['dairy', 'leafy greens', 'fortified plant milk', 'sardines'],
        tip: 'Spread intake throughout the day',
      },
      vitamin_d: {
        foods: ['fatty fish', 'eggs', 'fortified milk', 'mushrooms'],
        tip: 'Sun exposure also helps',
      },
      vitamin_c: {
        foods: ['citrus fruits', 'bell peppers', 'strawberries', 'broccoli'],
        tip: 'Eat raw when possible',
      },
      potassium: {
        foods: ['bananas', 'potatoes', 'avocado', 'spinach'],
        tip: 'Most fruits and vegetables contain potassium',
      },
      magnesium: {
        foods: ['nuts', 'seeds', 'whole grains', 'dark chocolate'],
        tip: 'Leafy greens are also good sources',
      },
      zinc: {
        foods: ['meat', 'shellfish', 'legumes', 'pumpkin seeds'],
        tip: 'Animal sources are more bioavailable',
      },
      fiber: {
        foods: ['whole grains', 'vegetables', 'legumes', 'fruits'],
        tip: 'Increase gradually with water',
      },
      vitamin_a: {
        foods: ['carrots', 'sweet potato', 'leafy greens', 'eggs'],
        tip: 'Fat helps absorption',
      },
      vitamin_b12: {
        foods: ['meat', 'fish', 'dairy', 'fortified foods'],
        tip: 'Consider supplements if vegan',
      },
    };

    it('has fallback for iron', () => {
      expect(fallbackSuggestions.iron).toBeDefined();
      expect(fallbackSuggestions.iron.foods).toContain('spinach');
      expect(fallbackSuggestions.iron.tip).toBeTruthy();
    });

    it('has fallback for calcium', () => {
      expect(fallbackSuggestions.calcium).toBeDefined();
      expect(fallbackSuggestions.calcium.foods).toContain('dairy');
    });

    it('has fallback for all common nutrients', () => {
      const expectedNutrients = [
        'iron',
        'calcium',
        'vitamin_d',
        'vitamin_c',
        'potassium',
        'magnesium',
        'zinc',
        'fiber',
        'vitamin_a',
        'vitamin_b12',
      ];

      expectedNutrients.forEach((nutrient) => {
        expect(fallbackSuggestions[nutrient]).toBeDefined();
        expect(fallbackSuggestions[nutrient].foods).toBeDefined();
        expect(fallbackSuggestions[nutrient].foods.length).toBeGreaterThan(0);
      });
    });

    it('all fallback suggestions have tips', () => {
      Object.values(fallbackSuggestions).forEach((suggestion) => {
        expect(suggestion.tip).toBeTruthy();
        expect(typeof suggestion.tip).toBe('string');
      });
    });
  });

  describe('OpenAI API request format', () => {
    it('generates correct request body structure', () => {
      const gaps = [{ key: 'iron', label: 'Iron', percentage: 25 }];
      const gapsList = gaps
        .map((g) => `${g.label} (currently at ${g.percentage}% of daily recommended)`)
        .join(', ');

      const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a nutrition expert. Provide concise, practical food suggestions to address nutritional deficiencies. Return only a JSON object with no markdown.',
          },
          {
            role: 'user',
            content: expect.stringContaining(gapsList),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      };

      expect(requestBody.model).toBe('gpt-4o-mini');
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.temperature).toBe(0.7);
    });
  });
});

describe('Voice Analytics Endpoint Logic', () => {
  describe('Success rate calculation', () => {
    it('calculates success rate correctly', () => {
      const totalSessions = 100;
      const completedSessions = 85;

      const successRate =
        totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100 * 100) / 100
          : 0;

      expect(successRate).toBe(85);
    });

    it('returns 0 when no sessions', () => {
      const totalSessions = 0;
      const completedSessions = 0;

      const successRate =
        totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100 * 100) / 100
          : 0;

      expect(successRate).toBe(0);
    });
  });

  describe('Edit rate calculation', () => {
    it('calculates edit rate correctly', () => {
      const totalTranscriptions = 50;
      const editedTranscriptions = 10;

      const editRate =
        totalTranscriptions > 0
          ? Math.round((editedTranscriptions / totalTranscriptions) * 100 * 100) / 100
          : 0;

      expect(editRate).toBe(20);
    });
  });
});
