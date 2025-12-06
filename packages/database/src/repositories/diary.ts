/**
 * Diary repository
 */

import type { Diary } from '@diary-quest/core/types';
import { BaseRepository } from './base';

interface DiaryRow {
  id: string;
  date: string;
  character_id: string;
  world_id: string;
  original_content: string;
  converted_content: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export class DiaryRepository extends BaseRepository {
  async create(diary: Diary): Promise<void> {
    const query = `
      INSERT INTO diaries (
        id, date, character_id, world_id,
        original_content, converted_content, data,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      diary.id,
      diary.date,
      diary.characterId,
      diary.worldId,
      diary.originalContent,
      diary.convertedContent,
      this.serializeJson(diary),
      this.serializeDate(diary.createdAt),
      this.serializeDate(diary.updatedAt),
    ]);
  }

  async findById(id: string): Promise<Diary | null> {
    const query = 'SELECT * FROM diaries WHERE id = ?';
    const row = await this.db.queryOne<DiaryRow>(query, [id]);
    return row ? this.mapRowToDiary(row) : null;
  }

  async findByCharacterId(characterId: string): Promise<Diary[]> {
    const query = 'SELECT * FROM diaries WHERE character_id = ? ORDER BY date DESC, created_at DESC';
    const rows = await this.db.query<DiaryRow>(query, [characterId]);
    return rows.map((row) => this.mapRowToDiary(row));
  }

  /**
   * Find recent diaries before a given date (for context in diary conversion)
   * @param characterId Character ID
   * @param beforeDate Date to search before (exclusive)
   * @param limit Number of diaries to return (default: 3)
   */
  async findRecentByCharacter(
    characterId: string,
    beforeDate: string,
    limit: number = 3
  ): Promise<Diary[]> {
    const query = `
      SELECT * FROM diaries
      WHERE character_id = ? AND date < ?
      ORDER BY date DESC, created_at DESC
      LIMIT ?
    `;
    const rows = await this.db.query<DiaryRow>(query, [characterId, beforeDate, limit]);
    // Reverse to get chronological order (oldest first)
    return rows.reverse().map((row) => this.mapRowToDiary(row));
  }

  async findByDate(characterId: string, date: string): Promise<Diary | null> {
    const query = 'SELECT * FROM diaries WHERE character_id = ? AND date = ?';
    const row = await this.db.queryOne<DiaryRow>(query, [characterId, date]);
    return row ? this.mapRowToDiary(row) : null;
  }

  async findByDateRange(
    characterId: string,
    startDate: string,
    endDate: string
  ): Promise<Diary[]> {
    const query = `
      SELECT * FROM diaries
      WHERE character_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `;
    const rows = await this.db.query<DiaryRow>(query, [characterId, startDate, endDate]);
    return rows.map((row) => this.mapRowToDiary(row));
  }

  async findFavorites(characterId: string): Promise<Diary[]> {
    const query = `
      SELECT * FROM diaries
      WHERE character_id = ? AND json_extract(data, '$.isFavorite') = 1
      ORDER BY date DESC
    `;
    const rows = await this.db.query<DiaryRow>(query, [characterId]);
    return rows.map((row) => this.mapRowToDiary(row));
  }

  async findByTags(characterId: string, tags: string[]): Promise<Diary[]> {
    // This is a simplified version - for better performance, consider a separate tags table
    // This is a simplified version - for better performance, consider a separate tags table
    const query = `
      SELECT * FROM diaries
      WHERE character_id = ?
      ORDER BY date DESC
    `;
    const rows = await this.db.query<DiaryRow>(query, [characterId]);

    // Filter by tags in application code
    return rows
      .map((row) => this.mapRowToDiary(row))
      .filter((diary) => tags.some((tag) => diary.tags.includes(tag)));
  }

  async update(diary: Diary): Promise<void> {
    const query = `
      UPDATE diaries
      SET original_content = ?, converted_content = ?, data = ?, updated_at = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [
      diary.originalContent,
      diary.convertedContent,
      this.serializeJson(diary),
      this.serializeDate(new Date()),
      diary.id,
    ]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM diaries WHERE id = ?';
    await this.db.execute(query, [id]);
  }

  async countByCharacter(characterId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM diaries WHERE character_id = ?';
    const result = await this.db.queryOne<{ count: number }>(query, [characterId]);
    return result?.count || 0;
  }

  private mapRowToDiary(row: DiaryRow): Diary {
    const diary = this.deserializeJson<Diary>(row.data);
    diary.createdAt = this.deserializeDate(row.created_at);
    diary.updatedAt = this.deserializeDate(row.updated_at);
    return diary;
  }
}
