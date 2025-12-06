/**
 * Base repository class
 */

import type { AsyncDatabaseAdapter } from '../adapters/base';

export abstract class BaseRepository {
  protected db: AsyncDatabaseAdapter;

  constructor(db: AsyncDatabaseAdapter) {
    this.db = db;
  }

  /**
   * Serialize Date objects to ISO strings for storage
   */
  protected serializeDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Deserialize ISO strings to Date objects
   */
  protected deserializeDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Serialize object to JSON string
   */
  protected serializeJson<T>(obj: T): string {
    return JSON.stringify(obj);
  }

  /**
   * Deserialize JSON string to object
   */
  protected deserializeJson<T>(json: string): T {
    return JSON.parse(json);
  }

  /**
   * Execute query within a transaction
   */
  protected async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
