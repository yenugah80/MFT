// Web stub for expo-sqlite — SQLite is not available in the browser.
export const openDatabaseSync = () => ({
  execSync: () => {},
  execAsync: async () => {},
  runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  getAllSync: () => [],
  getAllAsync: async () => [],
  getFirstSync: () => null,
  getFirstAsync: async () => null,
  prepareSync: () => ({ executeSync: () => ({ lastInsertRowId: 0, changes: 0 }), finalizeSync: () => {} }),
  prepareAsync: async () => ({
    executeAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    finalizeAsync: async () => {},
  }),
  closeSync: () => {},
  closeAsync: async () => {},
  withTransactionSync: (fn) => fn(),
  withTransactionAsync: async (fn) => fn(),
});
export const openDatabase = () => ({});
export default { openDatabaseSync, openDatabase };
