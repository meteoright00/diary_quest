/**
 * Base database adapter interface
 */

export interface DatabaseAdapter {
  /**
   * Initialize database connection
   */
  initialize(): void;

  /**
   * Close database connection
   */
  close(): void;

  /**
   * Execute a query
   */
  execute(query: string, params?: unknown[]): void;

  /**
   * Execute a query and return results
   */
  query<T = unknown>(query: string, params?: unknown[]): T[];

  /**
   * Execute a query and return a single result
   */
  queryOne<T = unknown>(query: string, params?: unknown[]): T | null;

  /**
   * Begin a transaction
   */
  beginTransaction(): void;

  /**
   * Commit a transaction
   */
  commit(): void;

  /**
   * Rollback a transaction
   */
  rollback(): void;

  /**
   * Run a function within a transaction
   */
  transaction<T>(fn: () => T): T;

  /**
   * Check if table exists
   */
  tableExists(tableName: string): boolean;

  /**
   * Run migrations
   */
  runMigrations(): void;
}

/**
 * Async database adapter interface for use with async database drivers
 */
export interface AsyncDatabaseAdapter {
  /**
   * Initialize database connection
   */
  initialize(): Promise<void>;

  /**
   * Close database connection
   */
  close(): Promise<void>;

  /**
   * Execute a query
   */
  execute(query: string, params?: unknown[]): Promise<number>;

  /**
   * Execute a query and return results
   */
  query<T = unknown>(query: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a query and return a single result
   */
  queryOne<T = unknown>(query: string, params?: unknown[]): Promise<T | null>;

  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit a transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback a transaction
   */
  rollback(): Promise<void>;

  /**
   * Run a function within a transaction
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Check if table exists
   */
  tableExists(tableName: string): Promise<boolean>;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  filepath?: string; // For SQLite
  host?: string; // For PostgreSQL
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}
