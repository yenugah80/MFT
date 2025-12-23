/**
 * SQLite Database Service
 * Centralized database management for production-grade data persistence
 *
 * Responsibilities:
 * - Database initialization and schema management
 * - Migration handling
 * - Transaction utilities
 * - Database health checks
 *
 * Usage:
 *   import { db, initDatabase, runInTransaction } from '@/services/database';
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database version for migration tracking
const DB_VERSION = 1;
const DB_VERSION_KEY = '@db_version';

// Singleton database instance
let dbInstance = null;

/**
 * Get or create database instance
 */
export function getDatabase() {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('food_tracker.db');
  }
  return dbInstance;
}

/**
 * Initialize database schema
 * Safe to call multiple times (uses IF NOT EXISTS)
 */
export async function initDatabase() {
  const db = getDatabase();

  try {
    console.log('[Database] Initializing schema...');

    // Enable WAL mode for better concurrency
    db.execSync(`PRAGMA journal_mode = WAL;`);

    // Create tables
    db.execSync(`
      CREATE TABLE IF NOT EXISTS food_logs (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        id INTEGER,
        userId TEXT,
        foodName TEXT,
        calories REAL,
        protein REAL,
        carbs REAL,
        fat REAL,
        fiber REAL,
        sugar REAL,
        netCarbs REAL,
        servingSize TEXT,
        timestamp INTEGER,
        status TEXT,
        clientEventId TEXT UNIQUE,
        data_json TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientEventId TEXT UNIQUE,
        log_data TEXT,
        timestamp INTEGER
      );
    `);

    // Create indices for performance
    db.execSync(`
      -- Composite index for fetchHistory (userId + timestamp range queries)
      CREATE INDEX IF NOT EXISTS idx_food_logs_user_timestamp
        ON food_logs(userId, timestamp DESC);

      -- Index for filtering by sync status
      CREATE INDEX IF NOT EXISTS idx_food_logs_status
        ON food_logs(status);

      -- Index for sync queue operations
      CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp
        ON sync_queue(timestamp ASC);
    `);

    // Check and run migrations if needed
    await runMigrations(db);

    console.log('[Database] ✅ Schema initialized successfully');
    return db;
  } catch (error) {
    console.error('[Database] ❌ Initialization failed:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
async function runMigrations(db) {
  try {
    const currentVersion = parseInt(await AsyncStorage.getItem(DB_VERSION_KEY) || '0', 10);

    if (currentVersion < DB_VERSION) {
      console.log(`[Database] Running migrations from v${currentVersion} to v${DB_VERSION}`);

      // Future migrations go here
      // Example:
      // if (currentVersion < 2) {
      //   db.execSync(`ALTER TABLE food_logs ADD COLUMN newColumn TEXT;`);
      // }

      await AsyncStorage.setItem(DB_VERSION_KEY, DB_VERSION.toString());
      console.log('[Database] ✅ Migrations complete');
    }
  } catch (error) {
    console.error('[Database] Migration error:', error);
    throw error;
  }
}

/**
 * Execute a function within a transaction
 * Automatically rolls back on error
 *
 * @param {Function} fn - Async function to execute
 * @returns {Promise<any>} Result of the function
 *
 * @example
 * await runInTransaction(async (db) => {
 *   await db.runAsync('INSERT INTO food_logs ...');
 *   await db.runAsync('INSERT INTO sync_queue ...');
 * });
 */
export async function runInTransaction(fn) {
  const db = getDatabase();
  return db.withTransactionAsync(fn);
}

/**
 * Get database statistics for debugging
 */
export async function getDatabaseStats() {
  const db = getDatabase();

  try {
    const foodLogsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM food_logs');
    const syncQueueCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue');
    const dbSize = await db.getFirstAsync("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");

    return {
      foodLogs: foodLogsCount.count,
      syncQueue: syncQueueCount.count,
      sizeBytes: dbSize.size,
      sizeMB: (dbSize.size / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    console.error('[Database] Failed to get stats:', error);
    return null;
  }
}

/**
 * Clear all data (for testing or account deletion)
 * ⚠️ DESTRUCTIVE - Use with caution
 */
export async function clearDatabase() {
  const db = getDatabase();

  await runInTransaction(async () => {
    await db.runAsync('DELETE FROM food_logs');
    await db.runAsync('DELETE FROM sync_queue');
    console.log('[Database] ⚠️ All data cleared');
  });
}

/**
 * Export database as JSON (for backup/debugging)
 */
export async function exportDatabase() {
  const db = getDatabase();

  try {
    const foodLogs = await db.getAllAsync('SELECT * FROM food_logs ORDER BY timestamp DESC');
    const syncQueue = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY timestamp ASC');

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      foodLogs: foodLogs.map(row => ({
        ...row,
        data_json: JSON.parse(row.data_json || '{}'),
      })),
      syncQueue: syncQueue.map(row => ({
        ...row,
        log_data: JSON.parse(row.log_data || '{}'),
      })),
    };
  } catch (error) {
    console.error('[Database] Export failed:', error);
    throw error;
  }
}

// Export singleton instance
export const db = getDatabase();
