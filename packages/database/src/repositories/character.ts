/**
 * Character repository
 */

import type { Character } from '@diary-quest/core/types';
import { BaseRepository } from './base';

interface CharacterRow {
  id: string;
  world_id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export class CharacterRepository extends BaseRepository {
  async create(character: Character): Promise<void> {
    const query = `
      INSERT INTO characters (id, world_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      character.id,
      character.worldId,
      this.serializeJson(character),
      this.serializeDate(character.createdAt),
      this.serializeDate(character.updatedAt),
    ]);
  }

  async findById(id: string): Promise<Character | null> {
    const query = 'SELECT * FROM characters WHERE id = ?';
    const row = await this.db.queryOne<CharacterRow>(query, [id]);
    return row ? this.mapRowToCharacter(row) : null;
  }

  async findByWorldId(worldId: string): Promise<Character[]> {
    const query = 'SELECT * FROM characters WHERE world_id = ? ORDER BY created_at DESC';
    const rows = await this.db.query<CharacterRow>(query, [worldId]);
    return rows.map((row) => this.mapRowToCharacter(row));
  }

  async findAll(): Promise<Character[]> {
    const query = 'SELECT * FROM characters ORDER BY updated_at DESC';
    const rows = await this.db.query<CharacterRow>(query);
    return rows.map((row) => this.mapRowToCharacter(row));
  }

  async update(character: Character): Promise<void> {
    const query = `
      UPDATE characters
      SET world_id = ?, data = ?, updated_at = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [
      character.worldId,
      this.serializeJson(character),
      this.serializeDate(new Date()),
      character.id,
    ]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM characters WHERE id = ?';
    await this.db.execute(query, [id]);
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM characters';
    const result = await this.db.queryOne<{ count: number }>(query);
    return result?.count || 0;
  }

  private mapRowToCharacter(row: CharacterRow): Character {
    const character = this.deserializeJson<Character>(row.data);
    character.createdAt = this.deserializeDate(row.created_at);
    character.updatedAt = this.deserializeDate(row.updated_at);
    return character;
  }
}
