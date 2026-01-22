/**
 * Services Index - Centralized exports for all services
 *
 * Usage:
 *   import { apiClient, database, profileAPI } from '../services';
 */

// Core API
export { default as apiClient } from './apiClient';
export { default as profileAPI } from './profileAPI';
export { default as notificationsAPI } from './notificationsAPI';

// Database
export { default as database } from './database';
export { default as unifiedFoodService } from './unifiedFoodService';

// Analytics
export { default as analytics } from './analytics';
export { default as themeAnalytics } from './themeAnalytics';

// Validation
export { default as validation } from './validation';
export { default as apiWithValidation } from './apiWithValidation';
export { default as environmentValidation } from './environmentValidation';

// Error Handling
export { default as errorHandler } from './errorHandler';
export { default as crashReporting } from './crashReporting';

// Push Notifications
export { default as fcmService } from './fcmService';
export { default as pushNotifications } from './pushNotifications';
export { default as smartNotificationEngine } from './smartNotificationEngine';

// Feature & Permissions
export { default as featureDetection } from './featureDetection';
export { default as iosPermissionsHandler } from './iosPermissionsHandler';
export { default as nativeModulesManager } from './nativeModulesManager';

// Data
export { default as exerciseDatabase } from './exerciseDatabase';

// Startup
export { default as productionStartup } from './productionStartup';
