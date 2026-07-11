// File: mobile/services/profileAPI.js
// Production-grade Profile API service with comprehensive error handling & auto token refresh

import { API_URL } from "../constants/api";

/**
 * Enhanced error class for profile API errors
 */
class ProfileAPIError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'ProfileAPIError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Parse error response from API
 */
const parseErrorResponse = async (response) => {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    return `HTTP ${response.status} ${response.statusText}`;
  }
};

/**
 * Helper to refresh token and retry a request (auto token refresh)
 * @param {Function} getToken - Callback to get fresh token from Clerk
 * @param {Function} requestFn - Async function that makes the API request
 * @returns {Promise<Response>} Response from the API request
 * @throws {ProfileAPIError} If token refresh fails
 */
const refreshTokenAndRetry = async (getToken, requestFn) => {
  try {
    // Get a fresh token
    const freshToken = await getToken({ skipCache: true });

    if (!freshToken) {
      console.warn('[ProfileAPI] Failed to refresh token');
      throw new ProfileAPIError('Session expired. Please sign in again.', 401);
    }

    console.log('[ProfileAPI] Token refreshed, retrying request...');

    // Retry the request with fresh token
    return await requestFn(freshToken);
  } catch (error) {
    console.error('[ProfileAPI] Token refresh failed:', error.message);
    if (error instanceof ProfileAPIError) {
      throw error;
    }
    throw new ProfileAPIError('Authentication failed. Please sign in again.', 401);
  }
};

/**
 * Fetch complete user profile from database
 * @param {string} token - Clerk auth token
 * @param {Function} getToken - Optional callback to refresh token on 401
 * @returns {Promise<Object|null>} Profile data with basics, dietary, goals, gamification
 * @throws {ProfileAPIError} On network or server errors
 */
export const fetchUserProfile = async (token, getToken = null) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const makeRequest = async (currentToken) => {
      return fetch(`${API_URL}/profile/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Accept': 'application/json'
        },
      });
    };

    let response = await makeRequest(token);

    // Auto-refresh on 401 if getToken callback is provided
    // Note: refreshTokenAndRetry now throws on failure instead of returning null
    if (response.status === 401 && getToken) {
      console.warn('[ProfileAPI] Received 401, attempting token refresh...');
      response = await refreshTokenAndRetry(getToken, makeRequest);
    }

    // Handle 404 - profile doesn't exist yet
    if (response.status === 404) {
      console.warn("⚠️ Profile not found (404). User may need to complete onboarding.");
      return null;
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      const errorMessage = typeof errorData === 'object' ? errorData.error : errorData;

      console.error(`❌ Failed to fetch profile (${response.status}):`, errorMessage);

      throw new ProfileAPIError(
        `Failed to fetch profile: ${errorMessage}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log("✅ Profile fetched successfully");
    return data;
  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error("❌ Network error fetching profile:", error);
      throw new ProfileAPIError(
        "Network error - please check your connection",
        0,
        { originalError: error.message }
      );
    }

    // Re-throw ProfileAPIError as-is
    if (error instanceof ProfileAPIError) {
      throw error;
    }

    // Wrap unknown errors
    console.error("❌ Unexpected error fetching profile:", error);
    throw new ProfileAPIError(
      "An unexpected error occurred while fetching profile",
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Save personal information (basics section)
 * @param {string} token - Clerk auth token
 * @param {Object} basicsData - { fullName, email, gender, age, weightKg, heightCm, activityLevel }
 * @param {Function} getToken - Optional callback to refresh token on 401
 * @returns {Promise<Object>} Updated profile basics
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveProfileBasics = async (token, basicsData, getToken = null) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    if (!basicsData || typeof basicsData !== 'object') {
      throw new ProfileAPIError("Invalid profile data", 400);
    }

    const makeRequest = async (currentToken) => {
      return fetch(`${API_URL}/profile/basics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(basicsData),
      });
    };

    let response = await makeRequest(token);

    // Auto-refresh on 401 if getToken callback is provided
    if (response.status === 401 && getToken) {
      console.warn('[ProfileAPI] Received 401, attempting token refresh...');
      response = await refreshTokenAndRetry(getToken, makeRequest);
    }

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      const errorMessage = typeof errorData === 'object' ? errorData.error : errorData;

      console.error(`❌ Failed to save profile basics (${response.status}):`, errorMessage);

      throw new ProfileAPIError(
        `Failed to save profile: ${errorMessage}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log("✅ Profile basics saved successfully");
    return data;
  } catch (error) {
    if (error instanceof ProfileAPIError) {
      throw error;
    }

    console.error("❌ Error saving profile basics:", error);
    throw new ProfileAPIError(
      "Failed to save profile basics",
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Save dietary preferences
 * @param {string} token - Clerk auth token
 * @param {Object} dietaryData - { preferences[], allergies[], dislikes[] }
 * @param {Function} getToken - Optional callback to refresh token on 401
 * @returns {Promise<Object>} Updated dietary preferences
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveDietaryPreferences = async (token, dietaryData, getToken = null) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const makeRequest = async (currentToken) => {
      return fetch(`${API_URL}/profile/dietary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(dietaryData),
      });
    };

    let response = await makeRequest(token);

    // Auto-refresh on 401 if getToken callback is provided
    if (response.status === 401 && getToken) {
      console.warn('[ProfileAPI] Received 401, attempting token refresh...');
      response = await refreshTokenAndRetry(getToken, makeRequest);
    }

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw new ProfileAPIError(
        "Failed to save dietary preferences",
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log("✅ Dietary preferences saved");
    return data;
  } catch (error) {
    if (error instanceof ProfileAPIError) {
      throw error;
    }

    console.error("❌ Error saving dietary preferences:", error);
    throw new ProfileAPIError(
      "Failed to save dietary preferences",
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Save nutrition goals
 * @param {string} token - Clerk auth token
 * @param {Object} goalsData - { primaryGoal, dailyCalories, proteinG, carbsG, fatsG, waterLiters }
 * @param {Function} getToken - Optional callback to refresh token on 401
 * @returns {Promise<Object>} Updated nutrition goals
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveNutritionGoals = async (token, goalsData, getToken = null) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const makeRequest = async (currentToken) => {
      return fetch(`${API_URL}/profile/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(goalsData),
      });
    };

    let response = await makeRequest(token);

    // Auto-refresh on 401 if getToken callback is provided
    if (response.status === 401 && getToken) {
      console.warn('[ProfileAPI] Received 401, attempting token refresh...');
      response = await refreshTokenAndRetry(getToken, makeRequest);
    }

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw new ProfileAPIError(
        "Failed to save nutrition goals",
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log("✅ Nutrition goals saved");
    return data;
  } catch (error) {
    if (error instanceof ProfileAPIError) {
      throw error;
    }

    console.error("❌ Error saving nutrition goals:", error);
    throw new ProfileAPIError(
      "Failed to save nutrition goals",
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Save gamification stats (XP, level, badges)
 * @param {string} token - Clerk auth token
 * @param {Object} gamificationData - { xp, level, streak, badges[] }
 * @param {Function} getToken - Optional callback to refresh token on 401
 * @returns {Promise<Object>} Updated gamification stats
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveGamificationStats = async (token, gamificationData, getToken = null) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const makeRequest = async (currentToken) => {
      return fetch(`${API_URL}/profile/gamification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(gamificationData),
      });
    };

    let response = await makeRequest(token);

    // Auto-refresh on 401 if getToken callback is provided
    if (response.status === 401 && getToken) {
      console.warn('[ProfileAPI] Received 401, attempting token refresh...');
      response = await refreshTokenAndRetry(getToken, makeRequest);
    }

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw new ProfileAPIError(
        "Failed to save gamification stats",
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log("✅ Gamification stats saved");
    return data;
  } catch (error) {
    if (error instanceof ProfileAPIError) {
      throw error;
    }

    console.error("❌ Error saving gamification stats:", error);
    throw new ProfileAPIError(
      "Failed to save gamification stats",
      500,
      { originalError: error.message }
    );
  }
};

/**
 * ✅ STRICT CACHE INVALIDATION
 * Invalidates the profile query cache to ensure fresh data after any profile update
 *
 * IMPORTANT: Call this after EVERY profile mutation success
 * - User updates basics → invalidate
 * - User updates dietary → invalidate
 * - User completes onboarding → invalidate
 * - User updates goals → invalidate
 *
 * @param {Object} queryClient - React Query client instance
 * @param {boolean} refetchImmediately - If true, also refetch immediately (recommended for critical updates)
 */
export const invalidateProfileCache = (queryClient, refetchImmediately = false) => {
  if (!queryClient) {
    console.warn('[ProfileAPI] queryClient not provided - cache invalidation skipped');
    return;
  }

  try {
    console.log('[ProfileAPI] ✅ Invalidating profile cache...');

    // Invalidate the profile query
    queryClient.invalidateQueries({ queryKey: ['profile'] });

    // Optionally refetch immediately for critical updates
    if (refetchImmediately) {
      console.log('[ProfileAPI] 🔄 Refetching profile immediately...');
      queryClient.refetchQueries({ queryKey: ['profile'] });
    }

    // Also invalidate dashboard since it depends on profile data
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    console.log('[ProfileAPI] ✅ Cache invalidation complete');
  } catch (error) {
    console.error('[ProfileAPI] Cache invalidation failed:', error);
    // Don't throw - cache invalidation failure shouldn't break the app
  }
};
