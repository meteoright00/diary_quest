/**
 * Report repository instance for desktop app
 */

import { ReportRepository } from '@diary-quest/database';
import { db } from '@/services/database';

// Create a singleton instance of ReportRepository with the DatabaseService
export const reportRepository = new ReportRepository(db);
