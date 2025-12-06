/**
 * Story related types
 */

export interface Story {
  id: string;
  createdAt: Date;

  title: string;
  period: {
    start: string; // YYYY-MM-DD
    end: string;
  };

  chapters: Chapter[];

  includedDiaries: string[];

  highlights: string[];

  characterGrowth: {
    levelGained: number;
    skillsUnlocked: string[];
    questsCompleted: number;
    expGained: number;
  };

  settings: {
    tone: 'serious' | 'comic' | 'lyrical';
    includeEmotions: boolean;
    includeStats: boolean;
  };

  characterId: string;
  worldId: string;
}

export interface Chapter {
  chapterNumber: number;
  title: string;
  summary: string;
  content: string;
  includedDiaries: string[];
  wordCount: number;
}
