/**
 * Character repository instance for desktop app
 */

import { CharacterRepository } from '@diary-quest/database';
import { db } from '@/services/database';

// Create a singleton instance of CharacterRepository with the DatabaseService
export const characterRepository = new CharacterRepository(db);
