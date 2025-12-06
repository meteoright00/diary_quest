/**
 * Story repository
 */

import type { Story } from '@diary-quest/core/types';
import { BaseRepository } from './base';

interface StoryRow {
  id: string;
  character_id: string;
  world_id: string;
  title: string;
  data: string;
  created_at: string;
}

export class StoryRepository extends BaseRepository {
  async create(story: Story): Promise<void> {
    const query = `
      INSERT INTO stories (id, character_id, world_id, title, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      story.id,
      story.characterId,
      story.worldId,
      story.title,
      this.serializeJson(story),
      this.serializeDate(story.createdAt),
    ]);
  }

  async findById(id: string): Promise<Story | null> {
    const query = 'SELECT * FROM stories WHERE id = ?';
    const row = await this.db.queryOne<StoryRow>(query, [id]);
    return row ? this.mapRowToStory(row) : null;
  }

  async findByCharacterId(characterId: string): Promise<Story[]> {
    const query = 'SELECT * FROM stories WHERE character_id = ? ORDER BY created_at DESC';
    const rows = await this.db.query<StoryRow>(query, [characterId]);
    return rows.map((row) => this.mapRowToStory(row));
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM stories WHERE id = ?';
    await this.db.execute(query, [id]);
  }

  private mapRowToStory(row: StoryRow): Story {
    const story = this.deserializeJson<Story>(row.data);
    story.createdAt = this.deserializeDate(row.created_at);
    return story;
  }
}
