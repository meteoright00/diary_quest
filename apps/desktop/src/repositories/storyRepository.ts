/**
 * Story repository instance for desktop app
 */

import { StoryRepository } from '@diary-quest/database';
import { db } from '@/services/database';

// Create a singleton instance of StoryRepository with the DatabaseService
export const storyRepository = new StoryRepository(db);
