/**
 * Game-related constants
 */

// Experience calculation
export const EXP_BASE = 100;
export const EXP_GROWTH_RATE = 1.5;

/**
 * Calculate experience required for next level
 */
export function calculateExpForLevel(level: number): number {
  return Math.floor(EXP_BASE * Math.pow(level, EXP_GROWTH_RATE));
}

// Diary rewards
export const DIARY_BASE_EXP = 50;
export const DIARY_BASE_GOLD = 10;

// Word count bonuses
export const WORD_COUNT_THRESHOLDS = {
  SHORT: 100,
  MEDIUM: 300,
  LONG: 500,
  VERY_LONG: 1000,
} as const;

export const WORD_COUNT_BONUS_EXP = {
  SHORT: 0,
  MEDIUM: 10,
  LONG: 25,
  VERY_LONG: 50,
} as const;

// Streak bonuses
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365] as const;
export const STREAK_BONUS_EXP_RATE = 0.1; // 10% per streak level

// Random event probabilities
export const RANDOM_EVENT_BASE_CHANCE = 0.2; // 20%
export const RANDOM_EVENT_RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
} as const;

// Quest difficulties
export const QUEST_DIFFICULTY_MULTIPLIERS = {
  easy: 1.0,
  normal: 1.5,
  hard: 2.0,
  expert: 3.0,
  legendary: 5.0,
} as const;

// Currency
export const SILVER_TO_GOLD_RATE = 100;

// Stats growth per level
export const STATS_GROWTH_PER_LEVEL = {
  hp: 10,
  mp: 5,
  stamina: 8,
  attack: 2,
  defense: 2,
  magic: 2,
  magicDefense: 2,
  agility: 1,
  luck: 1,
} as const;
