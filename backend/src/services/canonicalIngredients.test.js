import { validateExtraction } from '../canonicalIngredients.js';

// Mock console to keep test output clean
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Canonical Ingredients Service', () => {
  describe('validateExtraction - Quantity Parsing', () => {
    
    test('parses "I had a cup of rice" as 1 cup', () => {
      const input = "I had a cup of rice";
      // Pass empty array [] to treat this as a fresh parse
      const result = validateExtraction(input, []);
      
      expect(result).toHaveLength(1);
      const item = result[0];
      
      expect(item.name).toBe('rice');
      expect(item.quantity).toBe(1);      // "a" -> 1
      expect(item.unit).toBe('cup');      // "cup" -> unit
      expect(item.canonical.canonical).toBe('white rice'); // Default mapping
    });

    test('parses "two fried eggs" correctly', () => {
      const input = "I ate two fried eggs";
      const result = validateExtraction(input, []);
      
      expect(result).toHaveLength(1);
      const item = result[0];
      
      expect(item.name).toBe('fried eggs');
      expect(item.quantity).toBe(2);      // "two" -> 2
      expect(item.unit).toBe('large');    // Fallback to canonical default unit
    });

    test('parses "half an avocado" correctly', () => {
      const input = "half an avocado";
      const result = validateExtraction(input, []);
      
      expect(result[0].name).toBe('avocado');
      expect(result[0].quantity).toBe(0.5); // "half" -> 0.5
    });
  });
});