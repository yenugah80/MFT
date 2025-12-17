/**
 * Offline Queue Manager
 *
 * Queues API requests when offline and replays them when connection is restored.
 * Integrates with React Query mutations for automatic retry.
 */

import { getItem, setItem, STORAGE_KEYS } from './storage';
import { getNotifyInstance } from './notify';

/**
 * Queue item structure
 */
export const createQueueItem = (action, payload, metadata = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  action,
  payload,
  metadata,
  timestamp: new Date().toISOString(),
  retries: 0,
});

/**
 * Get offline queue
 */
export const getQueue = async () => {
  try {
    const queue = await getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return Array.isArray(queue) ? queue : [];
  } catch (error) {
    console.error('[OfflineQueue] Failed to get queue:', error);
    return [];
  }
};

/**
 * Add item to queue
 */
export const enqueue = async (action, payload, metadata = {}) => {
  try {
    const queue = await getQueue();
    const item = createQueueItem(action, payload, metadata);
    queue.push(item);
    await setItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);

    console.log('[OfflineQueue] Item enqueued:', item.id);

    // Notify user
    const notify = getNotifyInstance();
    if (notify) {
      notify.info('Action saved for later. Will sync when online.');
    }

    return item;
  } catch (error) {
    console.error('[OfflineQueue] Failed to enqueue item:', error);
    throw error;
  }
};

/**
 * Remove item from queue
 */
export const dequeue = async (itemId) => {
  try {
    const queue = await getQueue();
    const filtered = queue.filter((item) => item.id !== itemId);
    await setItem(STORAGE_KEYS.OFFLINE_QUEUE, filtered);
    console.log('[OfflineQueue] Item dequeued:', itemId);
    return filtered;
  } catch (error) {
    console.error('[OfflineQueue] Failed to dequeue item:', error);
    throw error;
  }
};

/**
 * Clear entire queue
 */
export const clearQueue = async () => {
  try {
    await setItem(STORAGE_KEYS.OFFLINE_QUEUE, []);
    console.log('[OfflineQueue] Queue cleared');
  } catch (error) {
    console.error('[OfflineQueue] Failed to clear queue:', error);
    throw error;
  }
};

/**
 * Process queue (replay all queued actions)
 */
export const processQueue = async (actionHandlers) => {
  try {
    const queue = await getQueue();

    if (queue.length === 0) {
      console.log('[OfflineQueue] Queue is empty, nothing to process');
      return { success: 0, failed: 0 };
    }

    console.log(`[OfflineQueue] Processing ${queue.length} items...`);

    let successCount = 0;
    let failedCount = 0;
    const failedItems = [];

    for (const item of queue) {
      try {
        const handler = actionHandlers[item.action];

        if (!handler) {
          console.warn(`[OfflineQueue] No handler for action: ${item.action}`);
          failedCount++;
          failedItems.push(item);
          continue;
        }

        // Execute the handler
        await handler(item.payload, item.metadata);

        // Remove from queue on success
        await dequeue(item.id);
        successCount++;

        console.log(`[OfflineQueue] Successfully processed: ${item.id}`);
      } catch (error) {
        console.error(`[OfflineQueue] Failed to process item ${item.id}:`, error);
        failedCount++;
        failedItems.push({
          ...item,
          retries: item.retries + 1,
          lastError: error.message,
        });
      }
    }

    // Update queue with failed items (with incremented retry count)
    if (failedItems.length > 0) {
      await setItem(STORAGE_KEYS.OFFLINE_QUEUE, failedItems);
    }

    // Notify user of results
    const notify = getNotifyInstance();
    if (notify) {
      if (successCount > 0) {
        notify.success(
          `${successCount} offline ${successCount === 1 ? 'action' : 'actions'} synced successfully`
        );
      }
      if (failedCount > 0) {
        notify.warning(
          `${failedCount} ${failedCount === 1 ? 'action' : 'actions'} failed to sync`
        );
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('[OfflineQueue] Failed to process queue:', error);
    throw error;
  }
};

/**
 * Get queue size
 */
export const getQueueSize = async () => {
  try {
    const queue = await getQueue();
    return queue.length;
  } catch (error) {
    console.error('[OfflineQueue] Failed to get queue size:', error);
    return 0;
  }
};

export default {
  getQueue,
  enqueue,
  dequeue,
  clearQueue,
  processQueue,
  getQueueSize,
  createQueueItem,
};
