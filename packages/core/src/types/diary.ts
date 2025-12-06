/**
 * Diary related types
 */

export type EmotionType = 'joy' | 'sadness' | 'anger' | 'anxiety' | 'calm' | 'excitement' | 'fatigue';

/**
 * Story metadata for diary continuity
 */
export interface StoryMetadata {
  location: string;           // Current location (e.g., "港町リュート")
  companions: string[];       // Companions in the story (e.g., ["ガルス", "エリナ"])
  ongoingEvents: string[];    // Ongoing events (e.g., ["船の修理", "嵐からの回復"])
  significantItems: string[]; // Significant items (e.g., ["壊れた羅針盤", "古い地図"])
}

export interface Diary {
  id: string;
  date: string; // ISO 8601 (YYYY-MM-DD)
  createdAt: Date;
  updatedAt: Date;

  // Title
  title?: string;

  // Diary content
  originalContent: string;
  convertedContent: string;

  // Related info
  characterId: string;
  worldId: string;

  // Emotion analysis
  emotionAnalysis: EmotionAnalysis;

  // Rewards
  rewards: {
    exp: number;
    gold: number;
    items: string[];
  };

  // Metadata
  metadata: {
    wordCount: number;
    characterCount: number;
    isStreak: boolean;
    streakCount: number;
  };

  // Story metadata (for continuity)
  storyMetadata?: StoryMetadata;

  // Tags
  tags: string[];

  // Favorite
  isFavorite: boolean;

  // Random events
  events: RandomEvent[];
}

export interface EmotionAnalysis {
  primary: EmotionType;
  secondary: EmotionType | null;

  scores: {
    joy: number;
    sadness: number;
    anger: number;
    anxiety: number;
    calm: number;
    excitement: number;
    fatigue: number;
  };

  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -100 to 100

  encouragementMessage: string | null;

  recommendedDiaries: string[];
}

export interface RandomEvent {
  id: string;
  type: 'exp_bonus' | 'stat_up' | 'equipment_found';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  triggeredAt: Date;

  title: string;
  description: string;

  rewards: {
    exp?: number;
    gold?: number;
    equipment?: import('./character').Equipment;
    statBonus?: {
      stat: string;
      value: number;
    };
  };
}
