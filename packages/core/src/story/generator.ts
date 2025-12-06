/**
 * Story generator - Generates story from multiple diary entries
 */

import type { LLMManager } from '../llm/manager';
import type { Story, Chapter } from '../types/story';
import type { Diary } from '../types/diary';
import type { Character } from '../types/character';
import type { World } from '../types/world';
import { generateId } from '@diary-quest/shared';

export interface StoryGenerateOptions {
  diaries: Diary[];
  character: Character;
  world: World;
  title?: string;
  tone?: Story['settings']['tone'];
  includeEmotions?: boolean;
  includeStats?: boolean;
}

export class StoryGenerator {
  private llmManager: LLMManager;

  constructor(llmManager: LLMManager) {
    this.llmManager = llmManager;
  }

  /**
   * Generate story from diary entries
   */
  async generateStory(options: StoryGenerateOptions): Promise<Story> {
    const { diaries, character, world } = options;

    if (diaries.length === 0) {
      throw new Error('No diaries provided for story generation');
    }

    // Sort diaries by date
    const sortedDiaries = [...diaries].sort((a, b) => a.date.localeCompare(b.date));

    // Generate chapters
    const chapters = await this.generateChapters(sortedDiaries, character, world, options);

    // Generate highlights
    const highlights = this.extractHighlights(sortedDiaries);

    // Calculate character growth
    const characterGrowth = this.calculateCharacterGrowth(sortedDiaries);

    const story: Story = {
      id: generateId(),
      createdAt: new Date(),
      title: options.title || this.generateDefaultTitle(sortedDiaries),
      period: {
        start: sortedDiaries[0].date,
        end: sortedDiaries[sortedDiaries.length - 1].date,
      },
      chapters,
      includedDiaries: sortedDiaries.map((d) => d.id),
      highlights,
      characterGrowth,
      settings: {
        tone: options.tone || 'serious',
        includeEmotions: options.includeEmotions ?? true,
        includeStats: options.includeStats ?? true,
      },
      characterId: character.id,
      worldId: world.id,
    };

    return story;
  }

  /**
   * Generate chapters from diaries
   */
  private async generateChapters(
    diaries: Diary[],
    character: Character,
    world: World,
    options: StoryGenerateOptions
  ): Promise<Chapter[]> {
    const chapterSize = Math.max(Math.ceil(diaries.length / 5), 3); // 5 chapters max
    const chapterGroups: Diary[][] = [];

    for (let i = 0; i < diaries.length; i += chapterSize) {
      chapterGroups.push(diaries.slice(i, i + chapterSize));
    }

    const chapters: Chapter[] = [];

    for (let i = 0; i < chapterGroups.length; i++) {
      const chapterDiaries = chapterGroups[i];
      const chapter = await this.generateChapter(
        i + 1,
        chapterDiaries,
        character,
        world,
        options
      );
      chapters.push(chapter);
    }

    return chapters;
  }

  /**
   * Generate a single chapter
   */
  private async generateChapter(
    chapterNumber: number,
    diaries: Diary[],
    character: Character,
    world: World,
    options: StoryGenerateOptions
  ): Promise<Chapter> {
    const prompt = this.buildChapterPrompt(chapterNumber, diaries, character, world, options);

    const response = await this.llmManager.generateForFeature('storyGeneration', prompt, {
      temperature: 0.8,
      maxTokens: 8192,
    });

    return {
      chapterNumber,
      title: this.extractChapterTitle(response.text, chapterNumber),
      summary: this.extractChapterSummary(response.text),
      content: response.text.trim(),
      includedDiaries: diaries.map((d) => d.id),
      wordCount: response.text.split(/\s+/).length,
    };
  }

  /**
   * Build chapter generation prompt
   */
  private buildChapterPrompt(
    chapterNumber: number,
    diaries: Diary[],
    character: Character,
    world: World,
    options: StoryGenerateOptions
  ): string {
    const diaryContents = diaries.map((d) => d.convertedContent).join('\n\n---\n\n');

    return `
あなたは物語作家です。以下の日記エントリーから、第${chapterNumber}章を作成してください。

【世界観】
${world.name} - ${world.description}

【主人公】
名前: ${character.basicInfo.name}
職業: ${character.basicInfo.class}

【トーン】
${options.tone || 'serious'}

【日記エントリー】
${diaryContents}

【要件】
- 第${chapterNumber}章のタイトルと本文を作成
- 日記の内容を物語として再構成
- 一貫したストーリーラインを維持
- 感情の起伏を表現
${options.includeStats ? '- キャラクターの成長を示唆' : ''}

【出力形式】
## 第${chapterNumber}章: [章のタイトル]

[章の本文をここに記述]

章のタイトルと本文を作成してください。
    `.trim();
  }

  /**
   * Extract chapter title from generated content
   */
  private extractChapterTitle(content: string, chapterNumber: number): string {
    const match = content.match(/##\s*第\d+章[：:]\s*(.+)/);
    if (match) {
      return match[1].trim();
    }
    return `第${chapterNumber}章`;
  }

  /**
   * Extract chapter summary
   */
  private extractChapterSummary(content: string): string {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length > 0) {
      return lines[0].replace(/^##\s*/, '').substring(0, 200);
    }
    return '';
  }

  /**
   * Extract highlights from diaries
   */
  private extractHighlights(diaries: Diary[]): string[] {
    const highlights: string[] = [];

    // Extract from converted content
    for (const diary of diaries) {
      const sentences = diary.convertedContent.split(/[。！？]/);
      for (const sentence of sentences) {
        if (sentence.length > 20 && sentence.length < 100) {
          highlights.push(sentence.trim());
          if (highlights.length >= 10) break;
        }
      }
      if (highlights.length >= 10) break;
    }

    return highlights;
  }

  /**
   * Calculate character growth during story period
   */
  private calculateCharacterGrowth(
    diaries: Diary[]
  ): Story['characterGrowth'] {
    const expGained = diaries.reduce((sum, d) => sum + d.rewards.exp, 0);

    return {
      levelGained: 0, // Will be calculated by the caller
      skillsUnlocked: [],
      questsCompleted: 0,
      expGained,
    };
  }

  /**
   * Generate default story title
   */
  private generateDefaultTitle(diaries: Diary[]): string {
    const startDate = new Date(diaries[0].date);
    const endDate = new Date(diaries[diaries.length - 1].date);

    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;

    if (startMonth === endMonth) {
      return `${startDate.getFullYear()}年${startMonth}月の冒険記`;
    } else {
      return `${startDate.getFullYear()}年${startMonth}月〜${endMonth}月の冒険記`;
    }
  }
}
