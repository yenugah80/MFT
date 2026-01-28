/**
 * Analytics Service Tests
 *
 * Tests for:
 * - fetchFoodSuggestions function
 * - trackEvent function
 * - Event constants
 */

// Mock the API_URL constant
jest.mock('../constants/api', () => ({
  API_URL: 'https://test-api.example.com/api',
}));

// Import after mocking
import {
  fetchFoodSuggestions,
  trackEvent,
  Events,
  initAnalytics,
  getAnalyticsStatus,
} from '../services/analytics';

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('fetchFoodSuggestions', () => {
    it('returns empty object when gaps array is empty', async () => {
      const result = await fetchFoodSuggestions([]);
      expect(result).toEqual({});
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns empty object when gaps is null', async () => {
      const result = await fetchFoodSuggestions(null);
      expect(result).toEqual({});
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns empty object when gaps is undefined', async () => {
      const result = await fetchFoodSuggestions(undefined);
      expect(result).toEqual({});
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('makes POST request with correct body', async () => {
      const mockGaps = [
        { key: 'iron', label: 'Iron', percentage: 25 },
        { key: 'calcium', label: 'Calcium', percentage: 30 },
      ];

      const mockResponse = {
        suggestions: {
          iron: { foods: ['spinach', 'lentils'], tip: 'Pair with vitamin C' },
          calcium: { foods: ['dairy', 'leafy greens'], tip: 'Spread throughout day' },
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchFoodSuggestions(mockGaps);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/analytics/food-suggestions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gaps: mockGaps }),
        }
      );

      expect(result).toEqual(mockResponse.suggestions);
    });

    it('returns null when API returns non-ok response', async () => {
      const mockGaps = [{ key: 'iron', label: 'Iron', percentage: 25 }];

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchFoodSuggestions(mockGaps);

      expect(result).toBeNull();
    });

    it('returns null when fetch throws an error', async () => {
      const mockGaps = [{ key: 'iron', label: 'Iron', percentage: 25 }];

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchFoodSuggestions(mockGaps);

      expect(result).toBeNull();
    });

    it('handles empty suggestions in response', async () => {
      const mockGaps = [{ key: 'iron', label: 'Iron', percentage: 25 }];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: {} }),
      });

      const result = await fetchFoodSuggestions(mockGaps);

      expect(result).toEqual({});
    });

    it('handles missing suggestions key in response', async () => {
      const mockGaps = [{ key: 'iron', label: 'Iron', percentage: 25 }];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchFoodSuggestions(mockGaps);

      expect(result).toEqual({});
    });
  });

  describe('Events constants', () => {
    it('has all required event names', () => {
      // Core events
      expect(Events.FOOD_LOG_STARTED).toBe('food_log_started');
      expect(Events.FOOD_LOGGED_TEXT).toBe('food_logged_text');
      expect(Events.FOOD_LOGGED_PHOTO).toBe('food_logged_photo');
      expect(Events.FOOD_LOGGED_VOICE).toBe('food_logged_voice');

      // Voice events
      expect(Events.VOICE_RECORDING_STARTED).toBe('voice_recording_started');
      expect(Events.VOICE_RECORDING_COMPLETED).toBe('voice_recording_completed');
      expect(Events.VOICE_ANALYSIS_COMPLETED).toBe('voice_analysis_completed');
      expect(Events.VOICE_ANALYSIS_FAILED).toBe('voice_analysis_failed');

      // Feature usage
      expect(Events.FEATURE_USED).toBe('feature_used');

      // Recommendations
      expect(Events.RECOMMENDATION_VIEWED).toBe('recommendation_viewed');
      expect(Events.RECOMMENDATION_ACCEPTED).toBe('recommendation_accepted');
    });

    it('has unique event names', () => {
      const eventValues = Object.values(Events);
      const uniqueValues = new Set(eventValues);
      expect(uniqueValues.size).toBe(eventValues.length);
    });
  });

  describe('trackEvent', () => {
    beforeEach(async () => {
      // Initialize analytics first
      await initAnalytics();
    });

    it('logs event in dev mode (does not make API call)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // In dev mode (__DEV__ is true), trackEvent should just log
      trackEvent('test_event', { foo: 'bar' });

      // In test environment, this behaves like dev
      // The event should be logged but not sent to API
      expect(global.fetch).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('accepts event with no properties', () => {
      expect(() => trackEvent('simple_event')).not.toThrow();
    });

    it('accepts event with properties object', () => {
      expect(() => trackEvent('event_with_props', { key: 'value', num: 123 })).not.toThrow();
    });
  });

  describe('getAnalyticsStatus', () => {
    it('returns status object with required fields', async () => {
      await initAnalytics();
      const status = getAnalyticsStatus();

      expect(status).toHaveProperty('ready');
      expect(status).toHaveProperty('sessionId');
      expect(status).toHaveProperty('sessionStart');
      expect(status).toHaveProperty('queuedEvents');
      expect(status).toHaveProperty('isFlushing');
      expect(status).toHaveProperty('initializeError');
    });

    it('shows ready state after initialization', async () => {
      await initAnalytics();
      const status = getAnalyticsStatus();

      expect(status.ready).toBe(true);
      expect(status.sessionId).toBeTruthy();
      expect(status.sessionStart).toBeTruthy();
    });
  });
});

describe('Voice Analytics Events', () => {
  it('has correct voice event names for tracking', () => {
    expect(Events.VOICE_RECORDING_STARTED).toBe('voice_recording_started');
    expect(Events.VOICE_RECORDING_COMPLETED).toBe('voice_recording_completed');
    expect(Events.VOICE_RECORDING_CANCELLED).toBe('voice_recording_cancelled');
    expect(Events.VOICE_TRANSCRIPTION_RECEIVED).toBe('voice_transcription_received');
    expect(Events.VOICE_TRANSCRIPTION_EDITED).toBe('voice_transcription_edited');
    expect(Events.VOICE_ANALYSIS_STARTED).toBe('voice_analysis_started');
    expect(Events.VOICE_ANALYSIS_COMPLETED).toBe('voice_analysis_completed');
    expect(Events.VOICE_ANALYSIS_FAILED).toBe('voice_analysis_failed');
    expect(Events.VOICE_PLAYBACK_STARTED).toBe('voice_playback_started');
    expect(Events.VOICE_RERECORD).toBe('voice_rerecord');
  });
});
