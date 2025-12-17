// File: mobile/services/profileAPI.js
// Production-grade Profile API service with comprehensive error handling

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
 * Fetch complete user profile from database
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object|null>} Profile data with basics, dietary, goals, gamification
 * @throws {ProfileAPIError} On network or server errors
 */
export const fetchUserProfile = async (token) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const response = await fetch(`${API_URL}/profile/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
    });

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
 * @returns {Promise<Object>} Updated profile basics
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveProfileBasics = async (token, basicsData) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    if (!basicsData || typeof basicsData !== 'object') {
      throw new ProfileAPIError("Invalid profile data", 400);
    }

    const response = await fetch(`${API_URL}/profile/basics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(basicsData),
    });

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
 * @returns {Promise<Object>} Updated dietary preferences
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveDietaryPreferences = async (token, dietaryData) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const response = await fetch(`${API_URL}/profile/dietary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(dietaryData),
    });

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
 * @returns {Promise<Object>} Updated nutrition goals
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveNutritionGoals = async (token, goalsData) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const response = await fetch(`${API_URL}/profile/goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(goalsData),
    });

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
 * @returns {Promise<Object>} Updated gamification stats
 * @throws {ProfileAPIError} On validation or server errors
 */
export const saveGamificationStats = async (token, gamificationData) => {
  try {
    if (!token) {
      throw new ProfileAPIError("Authentication token is required", 401);
    }

    const response = await fetch(`${API_URL}/profile/gamification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(gamificationData),
    });

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
