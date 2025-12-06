/**
 * Random event generator - Generates random events for diary entries
 */

import type { RandomEvent } from '../types/diary';
import type { WorldSettings } from '../types/world';
import type { EquipmentGenerator } from '../equipment/generator';
import { generateId } from '@diary-quest/shared';
import {
  RANDOM_EVENT_BASE_CHANCE,
  RANDOM_EVENT_RARITY_WEIGHTS,
} from '@diary-quest/shared';

export class EventGenerator {
  constructor(private equipmentGenerator?: EquipmentGenerator) { }
  /**
   * Check if event should occur
   */
  shouldGenerateEvent(luck: number = 10): boolean {
    const luckBonus = (luck - 10) * 0.01; // 1% per luck point above 10
    const chance = RANDOM_EVENT_BASE_CHANCE + luckBonus;
    return Math.random() < chance;
  }

  /**
   * Generate a random event
   */
  async generateEvent(
    characterLevel: number,
    luck: number = 10,
    worldSettings?: WorldSettings
  ): Promise<RandomEvent> {
    const rarity = this.selectRarity(luck);
    const type = this.selectType();

    const rewards = await this.generateRewards(type, rarity, characterLevel, worldSettings);

    return {
      id: generateId(),
      type,
      rarity,
      triggeredAt: new Date(),
      title: this.generateTitle(type, rarity),
      description: this.generateDescription(type),
      rewards,
    };
  }

  /**
   * Select event rarity based on weights and luck
   */
  private selectRarity(luck: number): RandomEvent['rarity'] {
    const luckFactor = 1 + (luck - 10) * 0.05; // 5% per luck point
    const weights = {
      common: RANDOM_EVENT_RARITY_WEIGHTS.common,
      uncommon: RANDOM_EVENT_RARITY_WEIGHTS.uncommon * luckFactor,
      rare: RANDOM_EVENT_RARITY_WEIGHTS.rare * luckFactor,
      epic: RANDOM_EVENT_RARITY_WEIGHTS.epic * luckFactor,
      legendary: RANDOM_EVENT_RARITY_WEIGHTS.legendary * luckFactor,
    };

    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const rand = Math.random() * total;

    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand <= cumulative) {
        return rarity as RandomEvent['rarity'];
      }
    }

    return 'common';
  }

  /**
   * Select event type
   */
  private selectType(): RandomEvent['type'] {
    const types: RandomEvent['type'][] = ['exp_bonus', 'stat_up', 'equipment_found'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Generate event title
   */
  private generateTitle(type: RandomEvent['type'], rarity: RandomEvent['rarity']): string {
    const rarityPrefix = {
      common: '',
      uncommon: '珍しい',
      rare: 'レアな',
      epic: '伝説的な',
      legendary: '神話級の',
    };

    const titles: Record<RandomEvent['type'], string> = {
      exp_bonus: `${rarityPrefix[rarity]}経験値ボーナス！`,
      stat_up: `${rarityPrefix[rarity]}ステータスアップ！`,
      equipment_found: `${rarityPrefix[rarity]}装備を発見！`,
    };

    return titles[type];
  }

  /**
   * Generate event description
   */
  private generateDescription(
    type: RandomEvent['type'],

  ): string {
    const descriptions: Record<RandomEvent['type'], string[]> = {
      exp_bonus: [
        '今日の冒険で多くの経験を積んだ。',
        '貴重な体験ができた。',
        '大きな成長を感じた。',
      ],
      stat_up: [
        '鍛錬の成果が実を結んだ。',
        '突然力が湧いてくるのを感じた。',
        '能力が向上した。',
      ],
      equipment_found: [
        '冒険の途中、装備を発見した。',
        '古い遺跡で装備を見つけた。',
        '倒した敵が装備を落としていった。',
        '宝箱の中に装備が入っていた。',
      ],
    };

    const options = descriptions[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Generate event rewards
   */
  private async generateRewards(
    type: RandomEvent['type'],
    rarity: RandomEvent['rarity'],
    characterLevel: number,
    worldSettings?: WorldSettings
  ): Promise<RandomEvent['rewards']> {
    const rarityMultiplier = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 5,
      legendary: 10,
    };

    const multiplier = rarityMultiplier[rarity];
    const baseExp = 20 * characterLevel;


    const rewards: RandomEvent['rewards'] = {};

    switch (type) {
      case 'exp_bonus':
        rewards.exp = Math.floor(baseExp * multiplier * 1.5);
        break;

      case 'stat_up':
        rewards.statBonus = {
          stat: this.selectRandomStat(),
          value: multiplier,
        };
        break;

      case 'equipment_found':
        if (this.equipmentGenerator && worldSettings) {
          try {
            const { EquipmentGenerator } = await import('../equipment/generator');
            const equipmentType = EquipmentGenerator.getRandomEquipmentType();
            const equipment = await this.equipmentGenerator.generateEquipment(
              equipmentType,
              rarity,
              worldSettings,
              characterLevel
            );
            rewards.equipment = equipment;
          } catch (error) {
            console.error('Failed to generate equipment:', error);
          }
        }
        break;
    }

    return rewards;
  }

  /**
   * Select random stat for bonus
   */
  private selectRandomStat(): string {
    const stats = ['attack', 'defense', 'magic', 'magicDefense', 'agility', 'luck'];
    return stats[Math.floor(Math.random() * stats.length)];
  }
}
