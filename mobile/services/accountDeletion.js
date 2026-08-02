/**
 * Account Deletion
 *
 * Single implementation of "delete my account", shared by every screen that
 * offers it. App Store Guideline 5.1.1(v) requires that an app which creates
 * accounts also lets the user delete one from inside the app, and that the
 * deletion is real — the login must stop working afterwards.
 *
 * Three things have to happen, in this order:
 *
 *   1. Server — DELETE /profile/delete-account removes the profile row (which
 *      cascades to every table holding this user's data) and then deletes the
 *      Clerk user itself. If this fails nothing local is touched, so the caller
 *      can safely retry.
 *   2. Device — SQLite meal cache, the React Query cache, and every AsyncStorage
 *      key the app has written. Without this, the next person to sign in on this
 *      device could see the previous account's meals, moods and insights.
 *   3. Sign out — clears the Clerk session and its SecureStore token.
 *
 * Only step 1 can fail the operation. Once the server has deleted the account,
 * the account is gone; a device-cleanup or sign-out hiccup must not be reported
 * to the user as "delete failed", because retrying would not undo anything.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from './apiClient';
import { clearDatabase } from './database';

/**
 * Deletes the account server-side, then purges every trace of it from this device.
 *
 * @param {object}   options
 * @param {Function} options.signOut     Clerk `signOut` from `useAuth()` / `useClerk()`.
 * @param {object}   [options.queryClient] React Query client from `useQueryClient()`.
 * @throws Only if the server-side deletion fails. Safe to retry — the endpoint is idempotent.
 */
export async function deleteAccountAndPurgeDevice({ signOut, queryClient } = {}) {
  // 1. Server-side deletion. Intentionally not wrapped — the caller shows the error.
  await apiClient.delete('/profile/delete-account');

  // Everything past this point is best-effort cleanup of a now-deleted account.
  await purgeDeviceData(queryClient);
  await endSession(signOut);
}

/**
 * Wipes all locally cached user data. Never throws.
 *
 * Order matters: the in-memory React Query cache is cleared before AsyncStorage,
 * otherwise the throttled cache persister could write the old data back out
 * moments after we erased it.
 */
export async function purgeDeviceData(queryClient) {
  if (queryClient) {
    try {
      queryClient.clear();
    } catch (error) {
      console.error('[accountDeletion] Failed to clear query cache', error);
    }
  }

  try {
    await clearDatabase();
  } catch (error) {
    // Nothing to clear if the database was never opened on this launch.
    console.error('[accountDeletion] Failed to clear local database', error);
  }

  try {
    // Remove every key this app has written — offline meal logs, onboarding and
    // mood drafts, streak state, notification patterns, cached insights and the
    // React Query snapshot. Equivalent to a fresh install. Clerk's session token
    // lives in SecureStore, not here, and is cleared by signOut below.
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
    console.log(`[accountDeletion] Cleared ${keys.length} local storage keys`);
  } catch (error) {
    console.error('[accountDeletion] Failed to clear local storage', error);
  }
}

/**
 * Ends the Clerk session. Never throws.
 *
 * The user record was just deleted server-side, so the session it belongs to may
 * already be invalid and `signOut` can reject. That is an expected outcome here,
 * not a failure — the local session state is discarded either way.
 */
async function endSession(signOut) {
  if (typeof signOut !== 'function') return;

  try {
    await signOut();
  } catch (error) {
    console.log('[accountDeletion] Sign-out after deletion returned an error (session already invalid)', error?.message);
  }
}

export default { deleteAccountAndPurgeDevice, purgeDeviceData };
