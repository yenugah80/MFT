/**
 * Firebase Admin SDK Configuration
 * Used for sending FCM push notifications from the server
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

let firebaseApp = null;
let messaging = null;

/**
 * Initialize Firebase Admin SDK
 * Supports multiple credential options for different environments
 */
export function initializeFirebase() {
  if (firebaseApp) {
    return { app: firebaseApp, messaging };
  }

  try {
    // Option 1: Service account JSON string in environment variable (recommended for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase] Initialized with service account from environment');
    }
    // Option 2: Service account file path (for local development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = JSON.parse(
        readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
      );
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase] Initialized with service account from file');
    }
    // Option 3: Application Default Credentials (for GCP environments)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('[Firebase] Initialized with application default credentials');
    }
    // No credentials configured
    else {
      console.warn('[Firebase] No credentials configured - FCM will be disabled');
      console.warn('[Firebase] Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH');
      return { app: null, messaging: null };
    }

    messaging = admin.messaging();
    console.log('[Firebase] Cloud Messaging ready');

    return { app: firebaseApp, messaging };
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error.message);
    return { app: null, messaging: null };
  }
}

/**
 * Get Firebase Messaging instance
 * @returns {admin.messaging.Messaging|null} Firebase Messaging instance or null if not initialized
 */
export function getMessaging() {
  if (!messaging) {
    const result = initializeFirebase();
    messaging = result.messaging;
  }
  return messaging;
}

/**
 * Check if Firebase is initialized and ready
 * @returns {boolean} True if Firebase is ready to send notifications
 */
export function isFirebaseReady() {
  return messaging !== null;
}

/**
 * Get the Firebase app instance
 * @returns {admin.app.App|null} Firebase app instance or null
 */
export function getFirebaseApp() {
  return firebaseApp;
}

export default {
  initializeFirebase,
  getMessaging,
  isFirebaseReady,
  getFirebaseApp,
};
