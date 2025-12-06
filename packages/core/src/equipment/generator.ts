import type { Equipment, Rarity } from '../types/character';
import type { WorldSettings } from '../types/world';
import type { LLMManager } from '../llm/manager';
import { generateId } from '@diary-quest/shared';

/**
 * レアリティ別のステータス倍率
 */
const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4.0,
  legendary: 6.0,
};

/**
 * 装備タイプ別の基本ステータス
 */
const BASE_STATS = {
  weapon: { attack: 10, magic: 5, stamina: 5 },
  armor: { defense: 10, hp: 20, stamina: 10, magicDefense: 5 },
  accessory: { luck: 5, agility: 5, mp: 10, magicDefense: 3 },
};

/**
 * フォールバック用の装備名（LLM生成失敗時）
 */
const FALLBACK_EQUIPMENT_NAMES = {
  weapon: {
    common: '錆びた剣',
    uncommon: '鋼の剣',
    rare: '魔法の剣',
    epic: '英雄の剣',
    legendary: '伝説の聖剣',
  },
  armor: {
    common: '布の鎧',
    uncommon: '革の鎧',
    rare: '鋼の鎧',
    epic: '竜鱗の鎧',
    legendary: '神聖なる鎧',
  },
  accessory: {
    common: '木の指輪',
    uncommon: '銀の指輪',
    rare: '魔法の指輪',
    epic: '賢者の指輪',
    legendary: '至高の指輪',
  },
};

const FALLBACK_EQUIPMENT_ICONS = {
  weapon: '🗡️',
  armor: '🛡️',
  accessory: '💍',
};

/**
 * 装備生成クラス
 */
export class EquipmentGenerator {
  constructor(private llm: LLMManager) { }

  /**
   * 世界観に合った装備を生成
   */
  async generateEquipment(
    type: 'weapon' | 'armor' | 'accessory',
    rarity: Rarity,
    worldSettings: WorldSettings,
    characterLevel: number
  ): Promise<Equipment> {
    try {
      // LLMで装備を生成
      const equipment = await this.generateWithLLM(type, rarity, worldSettings);

      // ステータスを計算
      const stats = this.calculateStats(type, rarity, characterLevel);

      return {
        ...equipment,
        id: generateId(),
        type,
        rarity,
        stats,
        requiredLevel: Math.max(1, Math.floor(characterLevel * 0.8)),
      };
    } catch (error) {
      console.error('Failed to generate equipment with LLM, using fallback:', error);
      return this.generateFallbackEquipment(type, rarity, characterLevel);
    }
  }

  /**
   * LLMを使って装備の名前と説明を生成
   */
  private async generateWithLLM(
    type: 'weapon' | 'armor' | 'accessory',
    rarity: Rarity,
    worldSettings: WorldSettings
  ): Promise<Pick<Equipment, 'name' | 'description' | 'icon'>> {
    const typeNames = {
      weapon: '武器',
      armor: '防具',
      accessory: 'アクセサリー',
    };

    const rarityNames = {
      common: 'コモン（一般的）',
      uncommon: 'アンコモン（やや珍しい）',
      rare: 'レア（珍しい）',
      epic: 'エピック（非常に珍しい）',
      legendary: 'レジェンダリー（伝説級）',
    };

    const prompt = `あなたは「${worldSettings.worldInfo.name}」という世界のアイテムデザイナーです。

世界観情報:
- 時代: ${worldSettings.worldInfo.era}
- 特徴: ${worldSettings.worldInfo.characteristics}

${rarityNames[rarity]}レアリティの${typeNames[type]}を1つ作成してください。

以下のJSON形式で返してください（JSONのみを返し、説明文は不要）:
{
  "name": "装備名（世界観に合った名前、10文字以内）",
  "description": "装備の説明（世界観に合った説明、30-80文字）",
  "icon": "絵文字1文字"
}

注意:
- nameは世界観に合った独創的な名前にすること
- descriptionは装備の由来や特徴を簡潔に説明すること
- iconは装備のタイプに合った絵文字を1文字だけ返すこと`;

    const response = await this.llm.generateText(prompt, {
      temperature: 0.9,
      maxTokens: 1024,
    });

    // JSONを抽出
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      name: parsed.name || FALLBACK_EQUIPMENT_NAMES[type][rarity],
      description: parsed.description || `${rarityNames[rarity]}の${typeNames[type]}`,
      icon: parsed.icon || FALLBACK_EQUIPMENT_ICONS[type],
    };
  }

  /**
   * レアリティとレベルに応じたステータスを計算
   */
  private calculateStats(
    type: 'weapon' | 'armor' | 'accessory',
    rarity: Rarity,
    characterLevel: number
  ): Equipment['stats'] {
    const baseStats = BASE_STATS[type];
    const multiplier = RARITY_MULTIPLIER[rarity];
    const levelBonus = 1 + (characterLevel / 100); // レベル100で2倍
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8〜1.2

    const stats: Equipment['stats'] = {};

    for (const [stat, value] of Object.entries(baseStats)) {
      stats[stat as keyof Equipment['stats']] = Math.floor(
        value * multiplier * levelBonus * randomFactor
      );
    }

    return stats;
  }

  /**
   * フォールバック装備を生成（LLM失敗時）
   */
  private generateFallbackEquipment(
    type: 'weapon' | 'armor' | 'accessory',
    rarity: Rarity,
    characterLevel: number
  ): Equipment {
    const typeNames: Record<string, string> = {
      weapon: '武器',
      armor: '防具',
      accessory: 'アクセサリー',
    };

    return {
      id: generateId(),
      name: FALLBACK_EQUIPMENT_NAMES[type][rarity],
      type,
      rarity,
      description: `冒険者が使う${typeNames[type] || type}。`,
      icon: FALLBACK_EQUIPMENT_ICONS[type],
      stats: this.calculateStats(type, rarity, characterLevel),
      requiredLevel: Math.max(1, Math.floor(characterLevel * 0.8)),
    };
  }

  /**
   * ランダムな装備タイプを選択
   */
  static getRandomEquipmentType(): 'weapon' | 'armor' | 'accessory' {
    const types: Array<'weapon' | 'armor' | 'accessory'> = ['weapon', 'armor', 'accessory'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * 確率に基づいてレアリティを決定
   */
  static rollRarity(): Rarity {
    const roll = Math.random();

    if (roll < 0.60) return 'common';
    if (roll < 0.85) return 'uncommon';
    if (roll < 0.95) return 'rare';
    if (roll < 0.99) return 'epic';
    return 'legendary';
  }
}
