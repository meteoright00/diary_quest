/**
 * Diary converter - Converts real-life diary to RPG world diary
 */

import type { LLMManager } from '../llm/manager';
import type { WorldSettings } from '../types/world';
import type { StoryMetadata } from '../types/diary';

export interface DiaryConversionOptions {
  originalContent: string;
  worldSettings: WorldSettings;
  characterName: string;
  characterClass: string;
  date: string;
}

export interface DiaryConversionResult {
  convertedContent: string;
  tokensUsed: number;
  model: string;
}

/**
 * Previous diary for context
 */
export interface PreviousDiary {
  date: string;
  convertedContent: string;
  storyMetadata?: StoryMetadata;
}

/**
 * Options for conversion with metadata extraction
 */
export interface DiaryConversionWithMetadataOptions extends DiaryConversionOptions {
  previousDiaries: PreviousDiary[]; // Last 3 diaries for context
  nameMappings?: Array<{
    realWorld: string;
    fantasyWorld: string;
    category: 'location' | 'person' | 'organization' | 'item';
  }>;
}

/**
 * Result of conversion with metadata extraction
 */
export interface DiaryConversionWithMetadataResult extends DiaryConversionResult {
  storyMetadata: StoryMetadata;
  newMappings?: Array<{
    realWorld: string;
    fantasyWorld: string;
    category: 'location' | 'person' | 'organization' | 'item';
  }>;
}

export class DiaryConverter {
  private llmManager: LLMManager;

  constructor(llmManager: LLMManager) {
    this.llmManager = llmManager;
  }

  /**
   * Convert diary to RPG world format
   */
  async convert(options: DiaryConversionOptions): Promise<DiaryConversionResult> {
    const prompt = this.buildConversionPrompt(options);
    const systemPrompt = this.buildSystemPrompt(options.worldSettings);

    const response = await this.llmManager.generateForFeature('diaryConversion', prompt, {
      systemPrompt,
      temperature: 0.8, // Higher temperature for more creative output
      maxTokens: 8192,
    });

    return {
      convertedContent: response.text.trim(),
      tokensUsed: response.usage.totalTokens,
      model: response.model,
    };
  }

  /**
   * Build the conversion prompt
   */
  private buildConversionPrompt(options: DiaryConversionOptions): string {
    const { originalContent, worldSettings, characterName, characterClass, date } = options;

    // Use custom prompt template if available
    if (worldSettings.promptTemplate) {
      return this.interpolateTemplate(worldSettings.promptTemplate, {
        originalContent,
        characterName,
        characterClass,
        date,
        worldName: worldSettings.worldInfo.name,
      });
    }

    // Default prompt
    return `
あなたは創造的な物語作家です。以下の日記を「${worldSettings.worldInfo.name}」の世界観に沿った冒険記に変換してください。

【世界観情報】
- 世界名: ${worldSettings.worldInfo.name}
- 時代: ${worldSettings.worldInfo.era}
- 特徴: ${worldSettings.worldInfo.characteristics}
- 魔法: ${worldSettings.worldInfo.magic}

【主人公情報】
- 名前: ${characterName}
- 職業: ${characterClass}
- 所属: ${worldSettings.protagonist.affiliation}
- 特技: ${worldSettings.protagonist.specialties.join('、')}

【変換ルール】
${worldSettings.conversionRules.guidelines.map((g) => `- ${g}`).join('\n')}

【文体】
${worldSettings.conversionRules.writingStyle}

【トーン】
${worldSettings.conversionRules.tone.join('、')}

【元の日記（${date}）】
${originalContent}

【変換後の冒険記】
上記の日記を世界観に合わせて変換してください。現実の出来事を世界観の用語に置き換え、冒険記のような文体で書き直してください。
変換後のテキストのみを出力し、説明や前置きは不要です。
    `.trim();
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(worldSettings: WorldSettings): string {
    return `
あなたは「${worldSettings.worldInfo.name}」という世界の物語を紡ぐ作家です。
現実世界の日記を、この世界観に沿った冒険記に変換することが任務です。
創造的で魅力的な物語を作り出してください。
    `.trim();
  }

  /**
   * Interpolate template with variables
   */
  private interpolateTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Regenerate diary with different parameters
   */
  async regenerate(
    options: DiaryConversionOptions,
    temperature?: number
  ): Promise<DiaryConversionResult> {
    const prompt = this.buildConversionPrompt(options);
    const systemPrompt = this.buildSystemPrompt(options.worldSettings);

    const response = await this.llmManager.generateForFeature('diaryConversion', prompt, {
      systemPrompt,
      temperature: temperature ?? 0.9, // Higher temperature for more variation
      maxTokens: 8192,
    });

    return {
      convertedContent: response.text.trim(),
      tokensUsed: response.usage.totalTokens,
      model: response.model,
    };
  }

  /**
   * Convert diary with story metadata extraction for continuity
   */
  async convertWithMetadata(
    options: DiaryConversionWithMetadataOptions
  ): Promise<DiaryConversionWithMetadataResult> {
    const prompt = this.buildConversionWithMetadataPrompt(options);
    const systemPrompt = this.buildSystemPrompt(options.worldSettings);

    const response = await this.llmManager.generateForFeature('diaryConversion', prompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 8192, // Higher limit for models with thinking process
    });

    // Parse JSON response
    try {
      let jsonText = response.text.trim();

      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

      // Extract JSON object using regex if needed
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText);

      return {
        convertedContent: result.convertedContent,
        storyMetadata: result.storyMetadata,
        newMappings: result.newMappings || [],
        tokensUsed: response.usage.totalTokens,
        model: response.model,
      };
    } catch (error) {
      // Fallback: treat as plain text if JSON parsing fails
      console.error('Failed to parse JSON response, using fallback:', error);
      console.error('Raw response:', response.text);
      return {
        convertedContent: response.text.trim(),
        storyMetadata: {
          location: '',
          companions: [],
          ongoingEvents: [],
          significantItems: [],
        },
        tokensUsed: response.usage.totalTokens,
        model: response.model,
      };
    }
  }

  /**
   * Build conversion prompt with previous diaries for continuity
   */
  private buildConversionWithMetadataPrompt(
    options: DiaryConversionWithMetadataOptions
  ): string {
    const { originalContent, worldSettings, characterName, characterClass, date, previousDiaries, nameMappings } = options;

    // Build previous context section
    let contextSection = '';
    if (previousDiaries.length > 0) {
      contextSection = '\n【ストーリーの連続性情報】\n\n';

      // Add latest story metadata if available
      const latestDiary = previousDiaries[previousDiaries.length - 1];
      if (latestDiary.storyMetadata) {
        const meta = latestDiary.storyMetadata;
        contextSection += `◆ 現在の状況（${latestDiary.date}時点）\n`;
        if (meta.location) contextSection += `- 場所: ${meta.location}\n`;
        if (meta.companions.length > 0) contextSection += `- 同行者: ${meta.companions.join('、')}\n`;
        if (meta.ongoingEvents.length > 0) contextSection += `- 進行中の出来事: ${meta.ongoingEvents.join('、')}\n`;
        if (meta.significantItems.length > 0) contextSection += `- 重要なアイテム: ${meta.significantItems.join('、')}\n`;
        contextSection += '\n';
      }

      // Add recent diary entries
      contextSection += '◆ 直近の冒険記録\n';
      for (const diary of previousDiaries) {
        contextSection += `[${diary.date}]\n${diary.convertedContent}\n\n`;
      }
    }

    // Build name mappings section
    let mappingsSection = '';
    if (nameMappings && nameMappings.length > 0) {
      mappingsSection = '\n【固有名詞マッピング（必ず使用すること）】\n';
      mappingsSection += '以下の用語は過去の日記で既に使用されています。一貫性を保つため、必ずこのマッピングを使用してください。\n\n';

      const categories = {
        location: '場所',
        person: '人物',
        organization: '組織',
        item: 'アイテム'
      };

      for (const category of ['location', 'person', 'organization', 'item'] as const) {
        const items = nameMappings.filter(m => m.category === category);
        if (items.length > 0) {
          mappingsSection += `◆ ${categories[category]}\n`;
          for (const mapping of items) {
            mappingsSection += `- ${mapping.realWorld} → ${mapping.fantasyWorld}\n`;
          }
          mappingsSection += '\n';
        }
      }
    }

    return `
あなたは創造的な物語作家です。以下の日記を「${worldSettings.worldInfo.name}」の世界観に沿った冒険記に変換してください。
${contextSection}${mappingsSection}
【世界観情報】
- 世界名: ${worldSettings.worldInfo.name}
- 時代: ${worldSettings.worldInfo.era}
- 特徴: ${worldSettings.worldInfo.characteristics}
- 魔法: ${worldSettings.worldInfo.magic}

【主人公情報】
- 名前: ${characterName}
- 職業: ${characterClass}
- 所属: ${worldSettings.protagonist.affiliation}
- 特技: ${worldSettings.protagonist.specialties.join('、')}

【変換ルール】
${worldSettings.conversionRules.guidelines.map((g) => `- ${g}`).join('\n')}

【文体】
${worldSettings.conversionRules.writingStyle}

【トーン】
${worldSettings.conversionRules.tone.join('、')}

【元の日記（${date}）】
${originalContent}

【重要な指示】
1. 上記の「ストーリーの連続性情報」を参考にして、物語の流れに一貫性を持たせてください
2. 場所や登場人物が突然変わらないように注意してください
3. 進行中の出来事は適切に継続または完結させてください
4. 「固有名詞マッピング」に記載された用語は必ず使用してください（一貫性のため）
5. 新しく変換した固有名詞（場所、人物、組織、アイテム）があれば、newMappingsに含めてください

【出力形式】
以下のJSON形式で出力してください：

{
  "convertedContent": "変換後の冒険記のテキスト",
  "storyMetadata": {
    "location": "現在の場所（例: 港町リュート）",
    "companions": ["同行者1", "同行者2"],
    "ongoingEvents": ["進行中の出来事1", "進行中の出来事2"],
    "significantItems": ["重要なアイテム1", "重要なアイテム2"]
  },
  "newMappings": [
    {
      "realWorld": "元の用語",
      "fantasyWorld": "変換後の用語",
      "category": "location|person|organization|item"
    }
  ]
}

JSON以外の前置きや説明は一切不要です。JSONのみを出力してください。
    `.trim();
  }
}
