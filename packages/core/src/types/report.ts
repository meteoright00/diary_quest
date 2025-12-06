/**
 * Report related types
 */

import type { EmotionType } from './diary';

export interface Report {
  id: string;
  generatedAt: Date;

  type: 'weekly' | 'monthly' | 'yearly';
  period: {
    start: string;
    end: string;
  };

  diaryStats: {
    totalCount: number;
    averageWordCount: number;
    longestStreak: number;
    totalWordsWritten: number;
    writingDays: number;
    writingRate: number; // %
  };

  emotionStats: {
    mostCommon: EmotionType;
    positiveRatio: number;
    negativeRatio: number;
    neutralRatio: number;
    emotionTrend: {
      date: string;
      sentiment: number;
    }[];
  };

  topEntities: {
    people: EntityCount[];
    places: EntityCount[];
    events: EntityCount[];
  };

  characterGrowth: {
    expGained: number;
    levelsGained: number;
    skillsUnlocked: number;
    titlesEarned: string[];
    goldEarned: number;
  };

  questStats: {
    completed: number;
    failed: number;
    inProgress: number;
    completionRate: number;
  };

  eventStats: {
    totalEvents: number;
    byRarity: Record<string, number>;
    byType: Record<string, number>;
  };

  aiSummary: string;

  charts: {
    emotionTrend: ChartData;
    writingFrequency: ChartData;
    questProgress: ChartData;
  };

  characterId: string;
}

export interface EntityCount {
  name: string;
  count: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}
