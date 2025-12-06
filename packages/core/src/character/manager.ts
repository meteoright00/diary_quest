/**
 * Character manager - Manages character operations
 */

import type { Character } from '../types/character';
import { ExpCalculator } from './exp-calculator';
import { StatsManager } from './stats-manager';
import { generateId } from '@diary-quest/shared';

export interface CharacterCreateOptions {
  name: string;
  worldId: string;
  characterClass?: string;
  title?: string;
  guild?: string;
}

export class CharacterManager {
  private expCalculator: ExpCalculator;
  private statsManager: StatsManager;

  constructor() {
    this.expCalculator = new ExpCalculator();
    this.statsManager = new StatsManager();
  }

  /**
   * Create a new character
   */
  createCharacter(options: CharacterCreateOptions): Character {
    const now = new Date();

    return {
      id: generateId(),
      worldId: options.worldId,
      createdAt: now,
      updatedAt: now,

      basicInfo: {
        name: options.name,
        class: options.characterClass || '駆け出しの冒険者',
        title: options.title || '新米冒険者',
        guild: options.guild || 'なし',
      },

      level: {
        current: 1,
        exp: 0,
        expToNextLevel: this.expCalculator.calculateExpForNextLevel(1),
      },

      stats: {
        hp: { current: 100, max: 100 },
        mp: { current: 50, max: 50 },
        stamina: { current: 80, max: 80 },
        attack: 10,
        defense: 10,
        magic: 10,
        magicDefense: 10,
        agility: 10,
        luck: 10,
      },

      skills: [],

      equipment: {
        weapon: null,
        armor: null,
        accessory: null,
      },

      inventory: [],

      titles: [
        {
          id: generateId(),
          name: options.title || '新米冒険者',
          description: '冒険を始めたばかりの称号',
          earnedAt: now,
          active: true,
        },
      ],

      achievements: [],

      currency: {
        gold: 100,
        silver: 0,
      },

      statistics: {
        totalDiaries: 0,
        consecutiveDays: 0,
        longestStreak: 0,
        totalWordsWritten: 0,
        totalExpEarned: 0,
        timesLeveledUp: 0,
        skillsUnlocked: 0,
        achievementsUnlocked: 0,
      },

      questLog: [],

      nameMappings: [],
    };
  }

  /**
   * Add experience to character
   */
  addExperience(character: Character, exp: number): {
    leveledUp: boolean;
    levelsGained: number;
    newLevel: number;
  } {
    const oldLevel = character.level.current;
    character.level.exp += exp;
    character.statistics.totalExpEarned += exp;

    const { leveledUp, newLevel, remainingExp } = this.expCalculator.checkLevelUp(
      character.level.exp,
      character.level.current
    );

    if (leveledUp) {
      const levelsGained = newLevel - oldLevel;
      character.level.current = newLevel;
      character.level.exp = remainingExp;
      character.level.expToNextLevel = this.expCalculator.calculateExpForNextLevel(newLevel);

      // Apply stats growth
      this.statsManager.applyStatsGrowth(character, levelsGained);

      // Restore resources on level up
      this.statsManager.restoreResources(character, 100);

      character.statistics.timesLeveledUp += levelsGained;
      character.updatedAt = new Date();

      return { leveledUp: true, levelsGained, newLevel };
    }

    character.updatedAt = new Date();
    return { leveledUp: false, levelsGained: 0, newLevel: oldLevel };
  }

  /**
   * Add currency to character
   */
  addCurrency(character: Character, gold: number, silver: number = 0): void {
    character.currency.gold += gold;
    character.currency.silver += silver;

    // Convert silver to gold if needed
    if (character.currency.silver >= 100) {
      const goldFromSilver = Math.floor(character.currency.silver / 100);
      character.currency.gold += goldFromSilver;
      character.currency.silver %= 100;
    }

    character.updatedAt = new Date();
  }

  /**
   * Update diary statistics
   */
  updateDiaryStatistics(
    character: Character,
    wordCount: number,
    isNewStreak: boolean
  ): void {
    character.statistics.totalDiaries++;
    character.statistics.totalWordsWritten += wordCount;

    if (isNewStreak) {
      character.statistics.consecutiveDays++;
      if (character.statistics.consecutiveDays > character.statistics.longestStreak) {
        character.statistics.longestStreak = character.statistics.consecutiveDays;
      }
    } else {
      character.statistics.consecutiveDays = 1;
    }

    character.updatedAt = new Date();
  }

  /**
   * Reset consecutive days (when streak is broken)
   */
  resetStreak(character: Character): void {
    character.statistics.consecutiveDays = 0;
    character.updatedAt = new Date();
  }

  /**
   * Get character's total stats (including equipment)
   */
  getTotalStats(character: Character): Character['stats'] {
    return this.statsManager.calculateTotalStats(character);
  }

  /**
   * Equip item
   */
  equipItem(character: Character, equipment: Parameters<typeof this.statsManager.canEquip>[1]): boolean {
    if (!this.statsManager.canEquip(character, equipment)) {
      return false;
    }

    // Unequip current item of same type
    const slot = equipment.type;
    character.equipment[slot] = equipment;

    character.updatedAt = new Date();
    return true;
  }

  /**
   * Unequip item
   */
  unequipItem(character: Character, slot: keyof Character['equipment']): void {
    character.equipment[slot] = null;
    character.updatedAt = new Date();
  }
}
