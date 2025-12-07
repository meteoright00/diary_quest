/**
 * World repository instance for desktop app
 */

import { WorldRepository } from '@diary-quest/database';
import { db } from '@/services/database';

// Create a singleton instance of WorldRepository with the DatabaseService
export const worldRepository = new WorldRepository(db);
