/**
 * Quest repository
 */

import type { Quest } from '@diary-quest/core/types';
import { BaseRepository } from './base';

interface QuestRow {
  id: string;
  character_id: string;
  title: string;
  status: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export class QuestRepository extends BaseRepository {
  async create(quest: Quest): Promise<void> {
    const query = `
      INSERT INTO quests (id, character_id, title, status, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      quest.id,
      quest.characterId,
      quest.title,
      quest.status,
      this.serializeJson(quest),
      this.serializeDate(quest.createdAt),
      this.serializeDate(quest.updatedAt),
    ]);
  }

  async findById(id: string): Promise<Quest | null> {
    const query = 'SELECT * FROM quests WHERE id = ?';
    const row = await this.db.queryOne<QuestRow>(query, [id]);
    return row ? this.mapRowToQuest(row) : null;
  }

  async findByCharacterId(characterId: string): Promise<Quest[]> {
    const query = 'SELECT * FROM quests WHERE character_id = ? ORDER BY created_at DESC';
    const rows = await this.db.query<QuestRow>(query, [characterId]);
    return rows.map((row) => this.mapRowToQuest(row));
  }

  async findByStatus(characterId: string, status: Quest['status']): Promise<Quest[]> {
    const query = `
      SELECT * FROM quests
      WHERE character_id = ? AND status = ?
      ORDER BY created_at DESC
    `;
    const rows = await this.db.query<QuestRow>(query, [characterId, status]);
    return rows.map((row) => this.mapRowToQuest(row));
  }

  async findActive(characterId: string): Promise<Quest[]> {
    const query = `
      SELECT * FROM quests
      WHERE character_id = ? AND status IN ('not_started', 'in_progress')
      ORDER BY created_at DESC
    `;
    const rows = await this.db.query<QuestRow>(query, [characterId]);
    return rows.map((row) => this.mapRowToQuest(row));
  }

  async findByCategory(characterId: string, category: Quest['category']): Promise<Quest[]> {
    const query = `
      SELECT * FROM quests
      WHERE character_id = ? AND json_extract(data, '$.category') = ?
      ORDER BY created_at DESC
    `;
    const rows = await this.db.query<QuestRow>(query, [characterId, category]);
    return rows.map((row) => this.mapRowToQuest(row));
  }

  async update(quest: Quest): Promise<void> {
    const query = `
      UPDATE quests
      SET title = ?, status = ?, data = ?, updated_at = ?
      WHERE id = ?
    `;

    await this.db.execute(query, [
      quest.title,
      quest.status,
      this.serializeJson(quest),
      this.serializeDate(new Date()),
      quest.id,
    ]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM quests WHERE id = ?';
    await this.db.execute(query, [id]);
  }

  async countByStatus(characterId: string, status: Quest['status']): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM quests WHERE character_id = ? AND status = ?';
    const result = await this.db.queryOne<{ count: number }>(query, [characterId, status]);
    return result?.count || 0;
  }

  private mapRowToQuest(row: QuestRow): Quest {
    const quest = this.deserializeJson<Quest>(row.data);
    quest.createdAt = this.deserializeDate(row.created_at);
    quest.updatedAt = this.deserializeDate(row.updated_at);

    // Deserialize date fields
    if (quest.deadline) {
      quest.deadline = new Date(quest.deadline);
    }
    if (quest.startDate) {
      quest.startDate = new Date(quest.startDate);
    }
    if (quest.completedAt) {
      quest.completedAt = new Date(quest.completedAt);
    }
    if (quest.recurring.endDate) {
      quest.recurring.endDate = new Date(quest.recurring.endDate);
    }

    return quest;
  }
}
