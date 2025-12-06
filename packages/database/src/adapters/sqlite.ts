/**
 * SQLite database adapter using better-sqlite3
 */

import Database from 'better-sqlite3';
import type { DatabaseAdapter, DatabaseConfig } from './base';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;
  private inTransaction: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  initialize(): void {
    if (!this.config.filepath) {
      throw new Error('SQLite filepath is required');
    }

    this.db = new Database(this.config.filepath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  execute(query: string, params: unknown[] = []): void {
    const db = this.getDb();
    const stmt = db.prepare(query);
    stmt.run(...params);
  }

  query<T = unknown>(query: string, params: unknown[] = []): T[] {
    const db = this.getDb();
    const stmt = db.prepare(query);
    return stmt.all(...params) as T[];
  }

  queryOne<T = unknown>(query: string, params: unknown[] = []): T | null {
    const db = this.getDb();
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result ? (result as T) : null;
  }

  beginTransaction(): void {
    const db = this.getDb();
    db.exec('BEGIN TRANSACTION');
    this.inTransaction = true;
  }

  commit(): void {
    const db = this.getDb();
    db.exec('COMMIT');
    this.inTransaction = false;
  }

  rollback(): void {
    const db = this.getDb();
    db.exec('ROLLBACK');
    this.inTransaction = false;
  }

  transaction<T>(fn: () => T): T {
    const db = this.getDb();
    return db.transaction(fn)();
  }

  tableExists(tableName: string): boolean {
    const result = this.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result ? result.count > 0 : false;
  }

  runMigrations(): void {
    const db = this.getDb();

    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT NOT NULL
      )
    `);

    // Get list of executed migrations
    const executed = this.query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    const executedNames = new Set(executed.map((m) => m.name));

    // Load migration files
    const migrationsDir = join(__dirname, '../../migrations');
    if (!existsSync(migrationsDir)) {
      console.warn('Migrations directory not found');
      return;
    }

    const migrationFiles = this.getMigrationFiles(migrationsDir);

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedNames.has(file.name)) {
        console.log(`Running migration: ${file.name}`);
        this.transaction(() => {
          const sql = readFileSync(file.path, 'utf-8');
          db.exec(sql);

          this.execute('INSERT INTO migrations (name, executed_at) VALUES (?, ?)', [
            file.name,
            new Date().toISOString(),
          ]);
        });
      }
    }
  }

  private getMigrationFiles(dir: string): { name: string; path: string }[] {
    const files = readdirSync(dir);

    return files
      .filter((file: string) => file.endsWith('.sql'))
      .sort()
      .map((file: string) => ({
        name: file,
        path: join(dir, file),
      }));
  }
}
