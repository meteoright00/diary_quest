/**
 * @diary-quest/database
 *
 * Database abstraction layer for diary-quest application
 * Supports multiple database adapters (SQLite, PostgreSQL)
 */

export const version = '0.1.0';

// Export database adapters
export type { DatabaseAdapter, AsyncDatabaseAdapter, DatabaseConfig } from './adapters/base';
// SQLiteAdapter is for Node.js environments only (not for browser/Tauri frontend)
// export { SQLiteAdapter } from './adapters/sqlite';

// Export repositories
export * from './repositories';
