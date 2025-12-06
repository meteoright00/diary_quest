/**
 * Experience calculator - Calculates EXP rewards and level progression
 */

import {
  calculateExpForLevel,
  DIARY_BASE_EXP,
  WORD_COUNT_THRESHOLDS,
  WORD_COUNT_BONUS_EXP,
  STREAK_BONUS_EXP_RATE,
  STREAK_MILESTONES,
} from '@diary-quest/shared';

export class ExpCalculator {
  /**
   * Calculate EXP reward for diary entry
   */
  calculateDiaryExp(wordCount: number, streakCount: number): number {
    let exp = DIARY_BASE_EXP;

    // Word count bonus
    exp += this.calculateWordCountBonus(wordCount);

    // Streak bonus
    exp += this.calculateStreakBonus(exp, streakCount);

    return Math.floor(exp);
  }

  /**
   * Calculate word count bonus
   */
  private calculateWordCountBonus(wordCount: number): number {
    if (wordCount >= WORD_COUNT_THRESHOLDS.VERY_LONG) {
      return WORD_COUNT_BONUS_EXP.VERY_LONG;
    } else if (wordCount >= WORD_COUNT_THRESHOLDS.LONG) {
      return WORD_COUNT_BONUS_EXP.LONG;
    } else if (wordCount >= WORD_COUNT_THRESHOLDS.MEDIUM) {
      return WORD_COUNT_BONUS_EXP.MEDIUM;
    } else {
      return WORD_COUNT_BONUS_EXP.SHORT;
    }
  }

  /**
   * Calculate streak bonus
   */
  private calculateStreakBonus(baseExp: number, streakCount: number): number {
    const streakLevel = this.getStreakLevel(streakCount);
    return Math.floor(baseExp * streakLevel * STREAK_BONUS_EXP_RATE);
  }

  /**
   * Get streak level based on milestones
   */
  private getStreakLevel(streakCount: number): number {
    let level = 0;
    for (const milestone of STREAK_MILESTONES) {
      if (streakCount >= milestone) {
        level++;
      } else {
        break;
      }
    }
    return level;
  }

  /**
   * Calculate required EXP for next level
   */
  calculateExpForNextLevel(currentLevel: number): number {
    return calculateExpForLevel(currentLevel + 1);
  }

  /**
   * Check if character leveled up
   */
  checkLevelUp(currentExp: number, currentLevel: number): {
    leveledUp: boolean;
    newLevel: number;
    remainingExp: number;
  } {
    let level = currentLevel;
    let exp = currentExp;
    let leveledUp = false;

    while (exp >= this.calculateExpForNextLevel(level)) {
      exp -= this.calculateExpForNextLevel(level);
      level++;
      leveledUp = true;
    }

    return {
      leveledUp,
      newLevel: level,
      remainingExp: exp,
    };
  }

  /**
   * Calculate total EXP for a given level
   */
  calculateTotalExpForLevel(level: number): number {
    let totalExp = 0;
    for (let i = 1; i < level; i++) {
      totalExp += calculateExpForLevel(i + 1);
    }
    return totalExp;
  }

  /**
   * Calculate EXP reward for quest completion
   */
  calculateQuestExp(
    baseExp: number,
    difficulty: 'easy' | 'normal' | 'hard' | 'expert' | 'legendary'
  ): number {
    const multipliers = {
      easy: 1.0,
      normal: 1.5,
      hard: 2.0,
      expert: 3.0,
      legendary: 5.0,
    };

    return Math.floor(baseExp * multipliers[difficulty]);
  }
}
