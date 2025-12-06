/**
 * World settings parser - Parses world settings from markdown files
 */

import type { WorldSettings } from '../types/world';

export class WorldParser {
  /**
   * Parse world settings from markdown content
   */
  parseMarkdown(markdown: string): WorldSettings {
    const sections = this.extractSections(markdown);

    return {
      worldInfo: this.parseWorldInfo(sections),
      protagonist: this.parseProtagonist(sections),
      termMappings: this.parseTermMappings(sections),
      conversionRules: this.parseConversionRules(sections),
      promptTemplate: this.extractPromptTemplate(sections),
    };
  }

  /**
   * Extract sections from markdown
   */
  private extractSections(markdown: string): Map<string, string> {
    const sections = new Map<string, string>();
    const lines = markdown.split('\n');

    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)/);

      if (headerMatch) {
        if (currentSection) {
          sections.set(currentSection, currentContent.join('\n').trim());
        }
        currentSection = headerMatch[1].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections.set(currentSection, currentContent.join('\n').trim());
    }

    return sections;
  }

  /**
   * Parse world info section
   */
  private parseWorldInfo(sections: Map<string, string>): WorldSettings['worldInfo'] {
    const content = sections.get('世界情報') || sections.get('World Info') || '';

    return {
      name: this.extractField(content, '世界名', 'World Name') || '未設定の世界',
      era: this.extractField(content, '時代', 'Era') || '不明',
      characteristics: this.extractField(content, '特徴', 'Characteristics') || '',
      magic: this.extractField(content, '魔法', 'Magic') || 'なし',
    };
  }

  /**
   * Parse protagonist section
   */
  private parseProtagonist(sections: Map<string, string>): WorldSettings['protagonist'] {
    const content = sections.get('主人公設定') || sections.get('Protagonist') || '';

    return {
      defaultName: this.extractField(content, 'デフォルト名', 'Default Name') || '冒険者',
      occupation: this.extractField(content, '職業', 'Occupation') || '冒険者',
      affiliation: this.extractField(content, '所属', 'Affiliation') || 'なし',
      specialties: this.extractList(content, '特技', 'Specialties'),
      goal: this.extractField(content, '目標', 'Goal') || '冒険',
    };
  }

  /**
   * Parse term mappings section
   */
  private parseTermMappings(sections: Map<string, string>): WorldSettings['termMappings'] {
    const content = sections.get('用語マッピング') || sections.get('Term Mappings') || '';

    return {
      places: this.parseMapping(content, '場所', 'Places'),
      people: this.parseMapping(content, '人物', 'People'),
      activities: this.parseMapping(content, '活動', 'Activities'),
      objects: this.parseMapping(content, '物', 'Objects'),
      emotions: this.parseMapping(content, '感情', 'Emotions'),
    };
  }

  /**
   * Parse conversion rules section
   */
  private parseConversionRules(
    sections: Map<string, string>
  ): WorldSettings['conversionRules'] {
    const content = sections.get('変換ルール') || sections.get('Conversion Rules') || '';

    return {
      writingStyle: this.extractField(content, '文体', 'Writing Style') || '物語風',
      tone: this.extractList(content, 'トーン', 'Tone'),
      guidelines: this.extractList(content, 'ガイドライン', 'Guidelines'),
    };
  }

  /**
   * Extract prompt template
   */
  private extractPromptTemplate(sections: Map<string, string>): string {
    return sections.get('プロンプトテンプレート') || sections.get('Prompt Template') || '';
  }

  /**
   * Extract field value from content
   */
  private extractField(content: string, ...fieldNames: string[]): string {
    for (const fieldName of fieldNames) {
      const regex = new RegExp(`[*-]?\\s*${fieldName}[：:：]\\s*(.+)`, 'i');
      const match = content.match(regex);
      if (match) {
        return match[1].trim();
      }
    }
    return '';
  }

  /**
   * Extract list from content
   */
  private extractList(content: string, ...fieldNames: string[]): string[] {
    const list: string[] = [];

    for (const fieldName of fieldNames) {
      const lines = content.split('\n');
      let inList = false;

      for (const line of lines) {
        if (line.match(new RegExp(fieldName, 'i'))) {
          inList = true;
          continue;
        }

        if (inList) {
          const itemMatch = line.match(/^[*-]\s+(.+)/);
          if (itemMatch) {
            list.push(itemMatch[1].trim());
          } else if (line.trim() && !line.match(/^[*-]/)) {
            break; // End of list
          }
        }
      }

      if (list.length > 0) break;
    }

    return list;
  }

  /**
   * Parse mapping (key: value pairs)
   */
  private parseMapping(content: string, ...sectionNames: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const sectionName of sectionNames) {
      const lines = content.split('\n');
      let inSection = false;

      for (const line of lines) {
        if (line.match(new RegExp(sectionName, 'i'))) {
          inSection = true;
          continue;
        }

        if (inSection) {
          const mappingMatch = line.match(/^[*-]\s+(.+?)[：:：→=]\s*(.+)/);
          if (mappingMatch) {
            mapping[mappingMatch[1].trim()] = mappingMatch[2].trim();
          } else if (line.trim() && !line.match(/^[*-]/)) {
            break; // End of section
          }
        }
      }

      if (Object.keys(mapping).length > 0) break;
    }

    return mapping;
  }

  /**
   * Validate world settings
   */
  validateSettings(settings: WorldSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!settings.worldInfo.name) {
      errors.push('世界名が設定されていません');
    }

    if (!settings.protagonist.defaultName) {
      errors.push('主人公のデフォルト名が設定されていません');
    }

    if (!settings.protagonist.occupation) {
      errors.push('主人公の職業が設定されていません');
    }

    if (!settings.conversionRules.writingStyle) {
      errors.push('文体が設定されていません');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate default world settings
   */
  generateDefaultSettings(): WorldSettings {
    return {
      worldInfo: {
        name: '剣と魔法の世界',
        era: '中世ファンタジー',
        characteristics: '魔法と冒険が日常の世界',
        magic: '魔法が存在し、一般的に使用される',
      },
      protagonist: {
        defaultName: '冒険者',
        occupation: '駆け出しの冒険者',
        affiliation: '冒険者ギルド',
        specialties: ['剣術', '魔法', '探索'],
        goal: '一人前の冒険者になること',
      },
      termMappings: {
        places: {
          会社: 'ギルド',
          学校: '訓練所',
          家: '宿屋',
          カフェ: '酒場',
        },
        people: {
          上司: 'ギルドマスター',
          同僚: '仲間の冒険者',
          友人: '冒険仲間',
        },
        activities: {
          仕事: 'クエスト',
          勉強: '訓練',
          買い物: '装備調達',
        },
        objects: {
          パソコン: '魔導書',
          スマホ: '通信の水晶',
        },
        emotions: {
          嬉しい: '心躍る',
          悲しい: '心痛む',
          怒り: '憤り',
        },
      },
      conversionRules: {
        writingStyle: '冒険譚風の物語調',
        tone: ['冒険的', '前向き', 'ドラマチック'],
        guidelines: [
          '現実の出来事を冒険に見立てて表現する',
          '登場人物にRPG的な役割を持たせる',
          '感情を豊かに表現する',
        ],
      },
      promptTemplate: '',
    };
  }
}
