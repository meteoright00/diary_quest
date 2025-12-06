/**
 * World repository
 */

import type { World } from '@diary-quest/core/types';
import { BaseRepository } from './base';

interface WorldRow {
  id: string;
  name: string;
  category: string;
  settings_file_path: string;
  data: string;
  is_built_in: number;
  created_at: string;
  updated_at: string;
}

export class WorldRepository extends BaseRepository {
  async create(world: World): Promise<void> {
    const query = `
      INSERT INTO worlds (
        id, name, category, settings_file_path, data, is_built_in, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      world.id,
      world.name,
      world.category,
      world.settingsFilePath,
      this.serializeJson(world),
      world.isBuiltIn ? 1 : 0,
      this.serializeDate(world.createdAt),
      this.serializeDate(world.updatedAt),
    ]);
  }

  async findById(id: string): Promise<World | null> {
    const query = 'SELECT * FROM worlds WHERE id = ?';
    const row = await this.db.queryOne<WorldRow>(query, [id]);
    return row ? this.mapRowToWorld(row) : null;
  }

  async findAll(): Promise<World[]> {
    const query = 'SELECT * FROM worlds ORDER BY usage_count DESC, name ASC';
    const rows = await this.db.query<WorldRow>(query);
    return rows.map((row) => this.mapRowToWorld(row));
  }

  async findByCategory(category: World['category']): Promise<World[]> {
    const query = 'SELECT * FROM worlds WHERE category = ? ORDER BY name ASC';
    const rows = await this.db.query<WorldRow>(query, [category]);
    return rows.map((row) => this.mapRowToWorld(row));
  }

  async findBuiltIn(): Promise<World[]> {
    const query = 'SELECT * FROM worlds WHERE is_built_in = 1 ORDER BY name ASC';
    const rows = await this.db.query<WorldRow>(query);
    return rows.map((row) => this.mapRowToWorld(row));
  }

  async findCustom(): Promise<World[]> {
    const query = 'SELECT * FROM worlds WHERE is_built_in = 0 ORDER BY created_at DESC';
    const rows = await this.db.query<WorldRow>(query);
    return rows.map((row) => this.mapRowToWorld(row));
  }

  async update(world: World): Promise<void> {
    const query = `
      UPDATE worlds
      SET name = ?, category = ?, settings_file_path = ?, data = ?, updated_at = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [
      world.name,
      world.category,
      world.settingsFilePath,
      this.serializeJson(world),
      this.serializeDate(new Date()),
      world.id,
    ]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM worlds WHERE id = ?';
    await this.db.execute(query, [id]);
  }

  async incrementUsageCount(id: string): Promise<void> {
    const query = `
      UPDATE worlds
      SET usage_count = usage_count + 1,
          last_used_at = ?
      WHERE id = ?
    `;
    await this.db.execute(query, [this.serializeDate(new Date()), id]);
  }

  private mapRowToWorld(row: WorldRow): World {
    const world = this.deserializeJson<World>(row.data);
    world.createdAt = this.deserializeDate(row.created_at);
    world.updatedAt = this.deserializeDate(row.updated_at);

    if (world.lastUsedAt) {
      world.lastUsedAt = new Date(world.lastUsedAt);
    }

    return world;
  }
}
