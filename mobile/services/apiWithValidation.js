/**
 * API Client Wrapper with Runtime Validation
 *
 * This module wraps apiClient calls with Zod validation, providing
 * production-grade safety for all API responses.
 *
 * Usage:
 *   const profile = await apiWithValidation.getProfile();
 *   const foods = await apiWithValidation.getFoodLogs();
 */

import apiClient from './apiClient';
import {
  ProfileSchema,
  NutritionGoalsSchema,
  FoodLogSchema,
  FoodLogListSchema,
  MoodLogSchema,
  WaterLogSchema,
  DashboardSchema,
  NotificationPreferencesSchema,
  validateAPIResponse,
  validateAPIListResponse,
} from './validation';

/**
 * Fetch and validate profile
 */
export async function getProfile() {
  const data = await apiClient.get('/profile/me');
  return validateAPIResponse(ProfileSchema, data, 'Profile');
}

/**
 * Update profile with validation
 */
export async function updateProfile(updates) {
  const data = await apiClient.put('/profile/me', updates);
  return validateAPIResponse(ProfileSchema, data, 'Profile Update');
}

/**
 * Fetch and validate nutrition goals
 */
export async function getNutritionGoals() {
  const data = await apiClient.get('/nutrition/goals');
  return validateAPIResponse(NutritionGoalsSchema, data, 'Nutrition Goals');
}

/**
 * Update nutrition goals with validation
 */
export async function updateNutritionGoals(goals) {
  const data = await apiClient.put('/nutrition/goals', goals);
  return validateAPIResponse(NutritionGoalsSchema, data, 'Nutrition Goals Update');
}

/**
 * Fetch and validate food logs
 */
export async function getFoodLogs() {
  const data = await apiClient.get('/food-logs');
  return validateAPIListResponse(FoodLogSchema, data, 'Food Logs');
}

/**
 * Log food with validation
 */
export async function logFood(foodData) {
  const data = await apiClient.post('/food-logs', foodData);
  return validateAPIResponse(FoodLogSchema, data, 'Food Log');
}

/**
 * Update food log with validation
 */
export async function updateFoodLog(logId, updates) {
  const data = await apiClient.put(`/food-logs/${logId}`, updates);
  return validateAPIResponse(FoodLogSchema, data, 'Food Log Update');
}

/**
 * Delete food log
 */
export async function deleteFoodLog(logId) {
  await apiClient.delete(`/food-logs/${logId}`);
}

/**
 * Fetch and validate mood log
 */
export async function getMoodLog(date) {
  const data = await apiClient.get(`/mood-logs/${date}`);
  return validateAPIResponse(MoodLogSchema, data, 'Mood Log');
}

/**
 * Log mood with validation
 */
export async function logMood(moodData) {
  const data = await apiClient.post('/mood-logs', moodData);
  return validateAPIResponse(MoodLogSchema, data, 'Mood Log');
}

/**
 * Fetch and validate water logs
 */
export async function getWaterLogs() {
  const data = await apiClient.get('/water-logs');
  return validateAPIListResponse(WaterLogSchema, data, 'Water Logs');
}

/**
 * Log water intake with validation
 */
export async function logWater(waterData) {
  const data = await apiClient.post('/water-logs', waterData);
  return validateAPIResponse(WaterLogSchema, data, 'Water Log');
}

/**
 * Fetch and validate dashboard data
 */
export async function getDashboard() {
  const data = await apiClient.get('/dashboard');
  return validateAPIResponse(DashboardSchema, data, 'Dashboard');
}

/**
 * Fetch and validate notification preferences
 */
export async function getNotificationPreferences() {
  const data = await apiClient.get('/profile/notifications');
  return validateAPIResponse(NotificationPreferencesSchema, data, 'Notification Preferences');
}

/**
 * Update notification preferences with validation
 */
export async function updateNotificationPreferences(prefs) {
  const data = await apiClient.post('/profile/notifications', prefs);
  return validateAPIResponse(NotificationPreferencesSchema, data, 'Notification Preferences Update');
}

/**
 * Generic validation wrapper
 * Use this for API calls not covered above
 */
export async function validateGet(endpoint, schema, context) {
  const data = await apiClient.get(endpoint);
  return validateAPIResponse(schema, data, context);
}

export async function validatePost(endpoint, body, schema, context) {
  const data = await apiClient.post(endpoint, body);
  return validateAPIResponse(schema, data, context);
}

export async function validatePut(endpoint, body, schema, context) {
  const data = await apiClient.put(endpoint, body);
  return validateAPIResponse(schema, data, context);
}

export default {
  // Profile
  getProfile,
  updateProfile,

  // Nutrition
  getNutritionGoals,
  updateNutritionGoals,

  // Food
  getFoodLogs,
  logFood,
  updateFoodLog,
  deleteFoodLog,

  // Mood
  getMoodLog,
  logMood,

  // Water
  getWaterLogs,
  logWater,

  // Dashboard
  getDashboard,

  // Notifications
  getNotificationPreferences,
  updateNotificationPreferences,

  // Generic
  validateGet,
  validatePost,
  validatePut,
};
