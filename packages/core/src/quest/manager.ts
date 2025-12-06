/**
 * Quest manager - Manages quest operations
 */

import type { Quest, SubTask } from '../types/quest';
import { generateId } from '@diary-quest/shared';
import { QUEST_DIFFICULTY_MULTIPLIERS } from '@diary-quest/shared';

export interface QuestCreateOptions {
  characterId: string;
  title: string;
  description: string;
  category: Quest['category'];
  difficulty: Quest['difficulty'];
  targetCount: number;
  unit: string;
  deadline?: Date;
  rewardExp?: number;
  rewardGold?: number;
  recurring?: {
    enabled: boolean;
    interval: 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
}

export class QuestManager {
  /**
   * Create a new quest
   */
  createQuest(options: QuestCreateOptions): Quest {
    const now = new Date();
    const baseRewardExp = options.rewardExp || 100;
    const baseRewardGold = options.rewardGold || 50;

    const multiplier = QUEST_DIFFICULTY_MULTIPLIERS[options.difficulty];

    return {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      characterId: options.characterId,
      title: options.title,
      description: options.description,
      category: options.category,
      difficulty: options.difficulty,
      status: 'not_started',
      progress: {
        current: 0,
        target: options.targetCount,
        unit: options.unit,
      },
      deadline: options.deadline || null,
      startDate: null,
      completedAt: null,
      reward: {
        exp: Math.floor(baseRewardExp * multiplier),
        gold: Math.floor(baseRewardGold * multiplier),
        items: [],
      },
      subtasks: [],
      recurring: options.recurring
        ? {
            enabled: options.recurring.enabled,
            interval: options.recurring.interval,
            endDate: options.recurring.endDate || null,
          }
        : {
            enabled: false,
            interval: 'daily',
            endDate: null,
          },
    };
  }

  /**
   * Start a quest
   */
  startQuest(quest: Quest): void {
    if (quest.status === 'not_started') {
      quest.status = 'in_progress';
      quest.startDate = new Date();
      quest.updatedAt = new Date();
    }
  }

  /**
   * Update quest progress
   */
  updateProgress(quest: Quest, progress: number): boolean {
    if (quest.status !== 'in_progress') {
      return false;
    }

    quest.progress.current = Math.min(progress, quest.progress.target);
    quest.updatedAt = new Date();

    // Auto-complete if target reached
    if (quest.progress.current >= quest.progress.target) {
      this.completeQuest(quest);
      return true;
    }

    return false;
  }

  /**
   * Increment quest progress
   */
  incrementProgress(quest: Quest, amount: number = 1): boolean {
    return this.updateProgress(quest, quest.progress.current + amount);
  }

  /**
   * Complete a quest
   */
  completeQuest(quest: Quest): void {
    if (quest.status === 'in_progress') {
      quest.status = 'completed';
      quest.completedAt = new Date();
      quest.updatedAt = new Date();
      quest.progress.current = quest.progress.target;
    }
  }

  /**
   * Fail a quest
   */
  failQuest(quest: Quest): void {
    if (quest.status === 'in_progress') {
      quest.status = 'failed';
      quest.updatedAt = new Date();
    }
  }

  /**
   * Check if quest is expired
   */
  isExpired(quest: Quest): boolean {
    if (!quest.deadline) {
      return false;
    }

    return new Date() > quest.deadline;
  }

  /**
   * Mark quest as expired
   */
  expireQuest(quest: Quest): void {
    if (quest.status === 'in_progress' || quest.status === 'not_started') {
      quest.status = 'expired';
      quest.updatedAt = new Date();
    }
  }

  /**
   * Add subtask to quest
   */
  addSubtask(quest: Quest, title: string, description: string): SubTask {
    const subtask: SubTask = {
      id: generateId(),
      title,
      description,
      completed: false,
      completedAt: null,
      order: quest.subtasks.length,
    };

    quest.subtasks.push(subtask);
    quest.updatedAt = new Date();

    return subtask;
  }

  /**
   * Complete subtask
   */
  completeSubtask(quest: Quest, subtaskId: string): boolean {
    const subtask = quest.subtasks.find((st) => st.id === subtaskId);
    if (!subtask || subtask.completed) {
      return false;
    }

    subtask.completed = true;
    subtask.completedAt = new Date();
    quest.updatedAt = new Date();

    return true;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(quest: Quest): number {
    if (quest.progress.target === 0) {
      return 0;
    }
    return Math.floor((quest.progress.current / quest.progress.target) * 100);
  }

  /**
   * Get subtask completion percentage
   */
  getSubtaskCompletionPercentage(quest: Quest): number {
    if (quest.subtasks.length === 0) {
      return 100;
    }

    const completedCount = quest.subtasks.filter((st) => st.completed).length;
    return Math.floor((completedCount / quest.subtasks.length) * 100);
  }

  /**
   * Reset recurring quest
   */
  resetRecurringQuest(quest: Quest): Quest {
    if (!quest.recurring.enabled) {
      throw new Error('Quest is not recurring');
    }

    const newQuest = { ...quest };
    newQuest.id = generateId();
    newQuest.createdAt = new Date();
    newQuest.updatedAt = new Date();
    newQuest.status = 'not_started';
    newQuest.startDate = null;
    newQuest.completedAt = null;
    newQuest.progress.current = 0;
    newQuest.subtasks = newQuest.subtasks.map((st) => ({
      ...st,
      id: generateId(),
      completed: false,
      completedAt: null,
    }));

    return newQuest;
  }

  /**
   * Calculate reward with bonuses
   */
  calculateRewardWithBonuses(
    quest: Quest,
    expBonus: number = 0,
    goldBonus: number = 0
  ): { exp: number; gold: number } {
    return {
      exp: Math.floor(quest.reward.exp * (1 + expBonus / 100)),
      gold: Math.floor(quest.reward.gold * (1 + goldBonus / 100)),
    };
  }
}
