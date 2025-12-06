/**
 * Stats manager - Manages character stats and growth
 */

import { STATS_GROWTH_PER_LEVEL } from '@diary-quest/shared';
import type { Character, Equipment } from '../types/character';

export class StatsManager {
  /**
   * Calculate stats growth for level up
   */
  calculateStatsGrowth(levelsGained: number): Character['stats'] {
    return {
      hp: {
        current: STATS_GROWTH_PER_LEVEL.hp * levelsGained,
        max: STATS_GROWTH_PER_LEVEL.hp * levelsGained,
      },
      mp: {
        current: STATS_GROWTH_PER_LEVEL.mp * levelsGained,
        max: STATS_GROWTH_PER_LEVEL.mp * levelsGained,
      },
      stamina: {
        current: STATS_GROWTH_PER_LEVEL.stamina * levelsGained,
        max: STATS_GROWTH_PER_LEVEL.stamina * levelsGained,
      },
      attack: STATS_GROWTH_PER_LEVEL.attack * levelsGained,
      defense: STATS_GROWTH_PER_LEVEL.defense * levelsGained,
      magic: STATS_GROWTH_PER_LEVEL.magic * levelsGained,
      magicDefense: STATS_GROWTH_PER_LEVEL.magicDefense * levelsGained,
      agility: STATS_GROWTH_PER_LEVEL.agility * levelsGained,
      luck: STATS_GROWTH_PER_LEVEL.luck * levelsGained,
    };
  }

  /**
   * Apply stats growth to character
   */
  applyStatsGrowth(character: Character, levelsGained: number): void {
    const growth = this.calculateStatsGrowth(levelsGained);

    character.stats.hp.max += growth.hp.max;
    character.stats.hp.current += growth.hp.current;

    character.stats.mp.max += growth.mp.max;
    character.stats.mp.current += growth.mp.current;

    character.stats.stamina.max += growth.stamina.max;
    character.stats.stamina.current += growth.stamina.current;

    character.stats.attack += growth.attack;
    character.stats.defense += growth.defense;
    character.stats.magic += growth.magic;
    character.stats.magicDefense += growth.magicDefense;
    character.stats.agility += growth.agility;
    character.stats.luck += growth.luck;
  }

  /**
   * Calculate total stats with equipment bonuses
   */
  calculateTotalStats(character: Character): Character['stats'] {
    const baseStats = { ...character.stats };
    const totalStats = JSON.parse(JSON.stringify(baseStats)) as Character['stats'];

    // Apply equipment bonuses
    if (character.equipment.weapon) {
      this.applyEquipmentBonus(totalStats, character.equipment.weapon);
    }
    if (character.equipment.armor) {
      this.applyEquipmentBonus(totalStats, character.equipment.armor);
    }
    if (character.equipment.accessory) {
      this.applyEquipmentBonus(totalStats, character.equipment.accessory);
    }

    return totalStats;
  }

  /**
   * Apply equipment bonus to stats
   */
  private applyEquipmentBonus(stats: Character['stats'], equipment: Equipment): void {
    if (equipment.stats.attack) {
      stats.attack += equipment.stats.attack;
    }
    if (equipment.stats.defense) {
      stats.defense += equipment.stats.defense;
    }
    if (equipment.stats.magic) {
      stats.magic += equipment.stats.magic;
    }
    if (equipment.stats.magicDefense) {
      stats.magicDefense += equipment.stats.magicDefense;
    }
    if (equipment.stats.agility) {
      stats.agility += equipment.stats.agility;
    }
    if (equipment.stats.luck) {
      stats.luck += equipment.stats.luck;
    }
    if (equipment.stats.hp) {
      stats.hp.max += equipment.stats.hp;
    }
    if (equipment.stats.mp) {
      stats.mp.max += equipment.stats.mp;
    }
  }

  /**
   * Restore HP/MP/Stamina
   */
  restoreResources(character: Character, percentage: number = 100): void {
    const factor = percentage / 100;

    const hpRestore = Math.floor(character.stats.hp.max * factor);
    character.stats.hp.current = Math.min(
      character.stats.hp.current + hpRestore,
      character.stats.hp.max
    );

    const mpRestore = Math.floor(character.stats.mp.max * factor);
    character.stats.mp.current = Math.min(
      character.stats.mp.current + mpRestore,
      character.stats.mp.max
    );

    const staminaRestore = Math.floor(character.stats.stamina.max * factor);
    character.stats.stamina.current = Math.min(
      character.stats.stamina.current + staminaRestore,
      character.stats.stamina.max
    );
  }

  /**
   * Check if equipment can be equipped
   */
  canEquip(character: Character, equipment: Equipment): boolean {
    return character.level.current >= equipment.requiredLevel;
  }
}
