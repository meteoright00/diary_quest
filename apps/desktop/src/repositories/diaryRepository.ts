/**
 * Diary repository instance for desktop app
 */

import { DiaryRepository } from '@diary-quest/database';
import { db } from '@/services/database';

// Create a singleton instance of DiaryRepository with the DatabaseService
export const diaryRepository = new DiaryRepository(db);
