/**
 * Quest repository instance for desktop app
 */

import { QuestRepository } from '@diary-quest/database';
import { db } from '@/services/database';

// Create a singleton instance of QuestRepository with the DatabaseService
export const questRepository = new QuestRepository(db);
