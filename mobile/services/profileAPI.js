// File: mobile/services/profileAPI.js
// This service connects your profile screen to the backend API

import { API_URL } from "../constants/api";

/**
 * Fetch complete user profile from database
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Profile data with basics, dietary, goals, gamification
 */
export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch(`${API_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.status === 404) {
      console.warn("Profile not found (404). Returning null.");
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch profile: ${response.status} ${text}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

/**
 * Save personal information (basics section)
 * @param {string} token - Clerk auth token
 * @param {Object} basicsData - { fullName, email, gender, age, weightKg, heightCm, activityLevel }
 * @returns {Promise<Object>} Updated profile basics
 */
export const saveProfileBasics = async (token, basicsData) => {
  try {
    const response = await fetch(`${API_URL}/profile/basics`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(basicsData),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to save basics: ${response.status} ${text}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error saving profile basics:", error);
    throw error;
  }
};

/**
 * Save dietary preferences
 * @param {string} token - Clerk auth token
 * @param {Object} dietaryData - { preferences[], allergies[], dislikes[] }
 * @returns {Promise<Object>} Updated dietary preferences
 */
export const saveDietaryPreferences = async (token, dietaryData) => {
  try {
    const response = await fetch(`${API_URL}/profile/dietary`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(dietaryData),
    });
    if (!response.ok) throw new Error("Failed to save dietary preferences");
    return await response.json();
  } catch (error) {
    console.error("Error saving dietary preferences:", error);
    throw error;
  }
};

/**
 * Save nutrition goals
 * @param {string} token - Clerk auth token
 * @param {Object} goalsData - { primaryGoal, dailyCalories, proteinG, carbsG, fatsG, waterLiters }
 * @returns {Promise<Object>} Updated nutrition goals
 */
export const saveNutritionGoals = async (token, goalsData) => {
  try {
    const response = await fetch(`${API_URL}/profile/goals`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(goalsData),
    });
    if (!response.ok) throw new Error("Failed to save nutrition goals");
    return await response.json();
  } catch (error) {
    console.error("Error saving nutrition goals:", error);
    throw error;
  }
};

/**
 * Save gamification stats (XP, level, badges)
 * @param {string} token - Clerk auth token
 * @param {Object} gamificationData - { xp, level, streak, badges[] }
 * @returns {Promise<Object>} Updated gamification stats
 */
export const saveGamificationStats = async (token, gamificationData) => {
  try {
    const response = await fetch(`${API_URL}/profile/gamification`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(gamificationData),
    });
    if (!response.ok) throw new Error("Failed to save gamification stats");
    return await response.json();
  } catch (error) {
    console.error("Error saving gamification stats:", error);
    throw error;
  }
};
