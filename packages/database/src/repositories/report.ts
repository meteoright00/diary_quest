/**
 * Report repository
 */

import type { Report } from '@diary-quest/core/types';
import { BaseRepository } from './base';

interface ReportRow {
  id: string;
  character_id: string;
  type: string;
  period_start: string;
  period_end: string;
  data: string;
  generated_at: string;
}

export class ReportRepository extends BaseRepository {
  async create(report: Report): Promise<void> {
    const query = `
      INSERT INTO reports (id, character_id, type, period_start, period_end, data, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      report.id,
      report.characterId,
      report.type,
      report.period.start,
      report.period.end,
      this.serializeJson(report),
      this.serializeDate(report.generatedAt),
    ]);
  }

  async findById(id: string): Promise<Report | null> {
    const query = 'SELECT * FROM reports WHERE id = ?';
    const row = await this.db.queryOne<ReportRow>(query, [id]);
    return row ? this.mapRowToReport(row) : null;
  }

  async findByCharacterId(characterId: string): Promise<Report[]> {
    const query = 'SELECT * FROM reports WHERE character_id = ? ORDER BY generated_at DESC';
    const rows = await this.db.query<ReportRow>(query, [characterId]);
    return rows.map((row) => this.mapRowToReport(row));
  }

  async findByType(characterId: string, type: Report['type']): Promise<Report[]> {
    const query = `
      SELECT * FROM reports
      WHERE character_id = ? AND type = ?
      ORDER BY period_start DESC
    `;
    const rows = await this.db.query<ReportRow>(query, [characterId, type]);
    return rows.map((row) => this.mapRowToReport(row));
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM reports WHERE id = ?';
    await this.db.execute(query, [id]);
  }

  private mapRowToReport(row: ReportRow): Report {
    const report = this.deserializeJson<Report>(row.data);
    report.generatedAt = this.deserializeDate(row.generated_at);
    return report;
  }
}
