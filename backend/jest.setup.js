import { beforeEach, jest } from '@jest/globals';

// Jest setup file for MyFoodTracker backend
globalThis.jest = jest;

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock global fetch for Node.js
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});
