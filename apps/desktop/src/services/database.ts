import { getDatabasePath } from '@/lib/tauri';
import { invoke } from '@tauri-apps/api/tauri';
import type { AsyncDatabaseAdapter } from '@diary-quest/database';

interface QueryResult {
  rows: unknown[];
  rowsAffected: number;
  lastInsertId?: number;
}

/**
 * Database service for managing the SQLite database using tauri-plugin-sql
 */
class DatabaseService implements AsyncDatabaseAdapter {
  private dbPath: string | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Get the database path from Tauri
        this.dbPath = await getDatabasePath();
        console.log('Database path:', this.dbPath);

        // Mark as initialized before running migrations
        // This allows migrations to use execute() and query() methods
        this.initialized = true;

        // Run migrations
        await this.runMigrations();

        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Reset initialized flag on error
        this.initialized = false;
        this.dbPath = null;
        throw error;
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      // Check if migrations table exists
      await this.execute(
        `CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );

      // Migration 001: Initial schema
      const migration001Applied = await this.isMigrationApplied('001_initial');
      if (!migration001Applied) {
        console.log('Running migration: 001_initial');
        await this.runMigration001();
        await this.recordMigration('001_initial');
      }

      // Migration 002: Fix characters table schema
      const migration002Applied = await this.isMigrationApplied('002_fix_characters_schema');
      if (!migration002Applied) {
        console.log('Running migration: 002_fix_characters_schema');
        await this.runMigration002();
        await this.recordMigration('002_fix_characters_schema');
      }

      // Migration 003: Fix quests table schema
      const migration003Applied = await this.isMigrationApplied('003_fix_quests_schema');
      if (!migration003Applied) {
        console.log('Running migration: 003_fix_quests_schema');
        await this.runMigration003();
        await this.recordMigration('003_fix_quests_schema');
      }

      // Migration 004: Fix stories table schema
      const migration004Applied = await this.isMigrationApplied('004_fix_stories_schema');
      if (!migration004Applied) {
        console.log('Running migration: 004_fix_stories_schema');
        await this.runMigration004();
        await this.recordMigration('004_fix_stories_schema');
      }

      // Migration 005: Fix reports table schema
      const migration005Applied = await this.isMigrationApplied('005_fix_reports_schema');
      if (!migration005Applied) {
        console.log('Running migration: 005_fix_reports_schema');
        await this.runMigration005();
        await this.recordMigration('005_fix_reports_schema');
      }

      // Migration 006: Add story_metadata to diaries
      const migration006Applied = await this.isMigrationApplied('006_add_story_metadata');
      if (!migration006Applied) {
        console.log('Running migration: 006_add_story_metadata');
        await this.runMigration006();
        await this.recordMigration('006_add_story_metadata');
      }

      console.log('All migrations completed');
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  /**
   * Check if migration was applied
   */
  private async isMigrationApplied(name: string): Promise<boolean> {
    try {
      const result = await this.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM migrations WHERE name = ?',
        [name]
      );
      return result.length > 0 && result[0].count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Record migration as applied
   */
  private async recordMigration(name: string): Promise<void> {
    await this.execute('INSERT INTO migrations (name) VALUES (?)', [name]);
  }

  /**
   * Run migration 002: Fix characters table schema
   */
  private async runMigration002(): Promise<void> {
    // Drop old characters table and recreate with new schema
    const migration002 = `
      -- Drop old characters table
      DROP TABLE IF EXISTS characters;

      -- Recreate characters table with new schema
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        world_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (world_id) REFERENCES worlds (id)
      );

      -- Insert default world if not exists
      INSERT OR IGNORE INTO worlds (id, created_at, updated_at, name, description, genre, setting, tone, rules)
      VALUES (
        'world_temp',
        datetime('now'),
        datetime('now'),
        'デフォルトワールド',
        '剣と魔法のファンタジー世界',
        'fantasy',
        '中世ファンタジー',
        'epic',
        '{"magic": true, "level_system": true}'
      );
    `;

    const statements = migration002.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.execute(statement);
      }
    }
  }

  /**
   * Migration 003: Fix quests table schema to use data column
   */
  private async runMigration003(): Promise<void> {
    // Drop old quests table and recreate with new schema
    const migration003 = `
      -- Drop old quests table
      DROP TABLE IF EXISTS quests;

      -- Recreate quests table with data column
      CREATE TABLE IF NOT EXISTS quests (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (character_id) REFERENCES characters (id)
      );
    `;

    const statements = migration003.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.execute(statement);
      }
    }
  }

  /**
   * Migration 004: Fix stories table schema to use data column
   */
  private async runMigration004(): Promise<void> {
    // Drop old stories table and recreate with new schema
    const migration004 = `
      -- Drop old stories table
      DROP TABLE IF EXISTS stories;

      -- Recreate stories table with data column
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        world_id TEXT NOT NULL,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (character_id) REFERENCES characters (id),
        FOREIGN KEY (world_id) REFERENCES worlds (id)
      );
    `;

    const statements = migration004.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.execute(statement);
      }
    }
  }

  /**
   * Migration 005: Fix reports table schema to use data column
   */
  private async runMigration005(): Promise<void> {
    // Drop old reports table and recreate with new schema
    const migration005 = `
      -- Drop old reports table
      DROP TABLE IF EXISTS reports;

      -- Recreate reports table with data column
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        type TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        data TEXT NOT NULL,
        generated_at DATETIME NOT NULL,
        FOREIGN KEY (character_id) REFERENCES characters (id)
      );
    `;

    const statements = migration005.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.execute(statement);
      }
    }
  }

  /**
   * Run migration 006: Add story_metadata column to diaries table
   */
  private async runMigration006(): Promise<void> {
    const migration006 = `
      -- Add story_metadata column to diaries table for continuity tracking
      ALTER TABLE diaries ADD COLUMN story_metadata TEXT;
    `;

    await this.execute(migration006.trim());
  }

  /**
   * Run migration 001: Initial schema
   */
  private async runMigration001(): Promise<void> {
    const migration001 = `
      -- Worlds table
      CREATE TABLE IF NOT EXISTS worlds (
        id TEXT PRIMARY KEY,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        genre TEXT NOT NULL,
        setting TEXT NOT NULL,
        tone TEXT NOT NULL,
        rules TEXT NOT NULL
      );

      -- Characters table
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        world_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (world_id) REFERENCES worlds (id)
      );

      -- Diaries table
      CREATE TABLE IF NOT EXISTS diaries (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        world_id TEXT NOT NULL,
        date DATE NOT NULL,
        original_content TEXT NOT NULL,
        converted_content TEXT,
        data TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );

      -- Quests table
      CREATE TABLE IF NOT EXISTS quests (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        status TEXT NOT NULL,
        progress TEXT NOT NULL,
        deadline DATETIME,
        start_date DATETIME,
        completed_at DATETIME,
        reward TEXT NOT NULL,
        subtasks TEXT NOT NULL,
        recurring TEXT NOT NULL,
        FOREIGN KEY (character_id) REFERENCES characters (id)
      );

      -- Stories table
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        world_id TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        chapters TEXT NOT NULL,
        diary_ids TEXT NOT NULL,
        FOREIGN KEY (character_id) REFERENCES characters (id),
        FOREIGN KEY (world_id) REFERENCES worlds (id)
      );

      -- Reports table
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        statistics TEXT NOT NULL,
        summary TEXT NOT NULL,
        FOREIGN KEY (character_id) REFERENCES characters (id)
      );
    `;

    const statements = migration001.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.execute(statement);
      }
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get database path
   */
  getPath(): string | null {
    return this.dbPath;
  }

  /**
   * Execute SQL query and return results
   */
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await invoke<QueryResult>('execute_sql', {
        dbPath: this.dbPath,
        query: sql,
        values: params || [],
      });

      return (result.rows || []) as T[];
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Execute SQL statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params?: unknown[]): Promise<number> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await invoke<QueryResult>('execute_sql', {
        dbPath: this.dbPath,
        query: sql,
        values: params || [],
      });

      return result.rowsAffected || 0;
    } catch (error) {
      console.error('Execute error:', error);
      throw error;
    }
  }

  /**
   * Execute a query and return a single result
   */
  async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Close database connection (no-op for Tauri plugin)
   */
  async close(): Promise<void> {
    // Tauri plugin manages connections internally
    this.initialized = false;
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    await this.execute('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  /**
   * Run a function within a transaction
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await fn();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result.length > 0 && result[0].count > 0;
  }
}

import { MockDatabaseService } from './MockDatabaseService';

// Singleton instance
const isTauri = typeof window !== 'undefined' && '__TAURI_IPC__' in window;
export const db = isTauri ? new DatabaseService() : new MockDatabaseService();
