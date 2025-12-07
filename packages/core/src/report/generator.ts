/**
 * Report generator - Generates growth and statistics reports
 */

import type { LLMManager } from '../llm/manager';
import type { Report } from '../types/report';
import type { Diary } from '../types/diary';
import type { Quest } from '../types/quest';
import type { Character } from '../types/character';
import type { EmotionType } from '../types/diary';
import { generateId } from '@diary-quest/shared';
import { ExpCalculator } from '../character/exp-calculator';

// Helper to parse YYYY-MM-DD string to local Date object at 00:00:00
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export interface ReportGenerateOptions {
  type: Report['type'];
  startDate: string;
  endDate: string;
  diaries: Diary[];
  quests: Quest[];
  character: Character;
}

export class ReportGenerator {
  private llmManager: LLMManager;

  constructor(llmManager: LLMManager) {
    this.llmManager = llmManager;
  }

  /**
   * Generate report
   */
  async generateReport(options: ReportGenerateOptions): Promise<Report> {
    const { type, startDate, endDate, diaries, quests, character } = options;

    const diaryStats = this.calculateDiaryStats(diaries, startDate, endDate);
    const emotionStats = this.calculateEmotionStats(diaries);
    const topEntities = this.extractTopEntities();
    const characterGrowth = this.calculateCharacterGrowth(diaries, character);
    const questStats = this.calculateQuestStats(quests, startDate, endDate);
    const eventStats = this.calculateEventStats(diaries);
    const charts = this.generateCharts(diaries, emotionStats, startDate, endDate, type);

    // Generate AI summary
    const aiSummary = await this.generateAISummary(options, {
      diaryStats,
      emotionStats,
      characterGrowth,
      questStats,
    });

    const report: Report = {
      id: generateId(),
      generatedAt: new Date(),
      type,
      period: { start: startDate, end: endDate },
      diaryStats,
      emotionStats,
      topEntities,
      characterGrowth,
      questStats,
      eventStats,
      aiSummary,
      charts,
      characterId: character.id,
    };

    return report;
  }

  /**
   * Calculate diary statistics
   */
  private calculateDiaryStats(
    diaries: Diary[],
    startDate: string,
    endDate: string
  ): Report['diaryStats'] {
    const totalCount = diaries.length;
    const totalWords = diaries.reduce((sum, d) => sum + d.metadata.wordCount, 0);
    const averageWordCount = totalCount > 0 ? Math.floor(totalWords / totalCount) : 0;

    // Calculate longest streak
    const sortedDiaries = [...diaries].sort((a, b) => a.date.localeCompare(b.date));
    let longestStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < sortedDiaries.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = parseDate(sortedDiaries[i - 1].date);
        const currDate = parseDate(sortedDiaries[i].date);
        const diffDays = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, currentStreak);
    }

    // Calculate writing rate
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const writingRate = totalDays > 0 ? Math.floor((totalCount / totalDays) * 100) : 0;

    return {
      totalCount,
      averageWordCount,
      longestStreak,
      totalWordsWritten: totalWords,
      writingDays: totalCount,
      writingRate,
    };
  }

  /**
   * Calculate emotion statistics
   */
  private calculateEmotionStats(diaries: Diary[]): Report['emotionStats'] {
    if (diaries.length === 0) {
      return {
        mostCommon: 'calm',
        positiveRatio: 0,
        negativeRatio: 0,
        neutralRatio: 0,
        emotionTrend: [],
      };
    }

    // Count emotions
    const emotionCounts: Record<EmotionType, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      anxiety: 0,
      calm: 0,
      excitement: 0,
      fatigue: 0,
    };

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const emotionTrend: { date: string; sentiment: number }[] = [];

    for (const diary of diaries) {
      const emotion = diary.emotionAnalysis.primary;
      emotionCounts[emotion]++;

      const sentiment = diary.emotionAnalysis.overallSentiment;
      if (sentiment === 'positive') positiveCount++;
      else if (sentiment === 'negative') negativeCount++;
      else neutralCount++;

      emotionTrend.push({
        date: diary.date,
        sentiment: diary.emotionAnalysis.sentimentScore,
      });
    }

    // Find most common emotion
    let mostCommon: EmotionType = 'calm';
    let maxCount = 0;
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count > maxCount) {
        mostCommon = emotion as EmotionType;
        maxCount = count;
      }
    }

    const total = diaries.length;

    return {
      mostCommon,
      positiveRatio: Math.floor((positiveCount / total) * 100),
      negativeRatio: Math.floor((negativeCount / total) * 100),
      neutralRatio: Math.floor((neutralCount / total) * 100),
      emotionTrend,
    };
  }

  /**
   * Extract top entities (people, places, events)
   */
  private extractTopEntities(): Report['topEntities'] {
    // Simplified version - in real implementation, use NLP
    return {
      people: [],
      places: [],
      events: [],
    };
  }

  /**
   * Calculate character growth
   */
  private calculateCharacterGrowth(
    diaries: Diary[],
    character: Character
  ): Report['characterGrowth'] {
    const expGained = diaries.reduce((sum, d) => {
      const diaryExp = d.rewards.exp;
      const eventsExp = d.events.reduce((eSum, e) => eSum + (e.rewards.exp || 0), 0);
      return sum + diaryExp + eventsExp;
    }, 0);

    const goldEarned = diaries.reduce((sum, d) => {
      const diaryGold = d.rewards.gold;
      const eventsGold = d.events.reduce((eSum, e) => eSum + (e.rewards.gold || 0), 0);
      return sum + diaryGold + eventsGold;
    }, 0);

    // Calculate level gains
    const expCalculator = new ExpCalculator();

    // Calculate current total EXP (sum of all EXP needed to reach current level + current EXP)
    let currentTotalExp = character.level.exp;
    for (let i = 1; i < character.level.current; i++) {
      currentTotalExp += expCalculator.calculateExpForNextLevel(i);
    }

    // Calculate start-of-period total EXP
    const startOfPeriodTotalExp = currentTotalExp - expGained;

    // Calculate start-of-period level
    let startLevel = 1;
    let expForStartLevel = 0;

    // Find the level where total exp corresponds to startOfPeriodTotalExp
    while (true) {
      const expForNextLevel = expCalculator.calculateExpForNextLevel(startLevel);
      if (expForStartLevel + expForNextLevel <= startOfPeriodTotalExp) {
        expForStartLevel += expForNextLevel;
        startLevel++;
      } else {
        break;
      }
      if (startLevel >= 99) break; // Safety break
    }

    const endLevel = character.level.current;
    const levelsGained = Math.max(0, character.level.current - startLevel);

    return {
      expGained, // This is specifically from diaries as per current implementation
      levelsGained,
      skillsUnlocked: 0, // Placeholder
      titlesEarned: [],
      goldEarned,
    };
  }

  /**
   * Calculate quest statistics
   */
  private calculateQuestStats(
    quests: Quest[],
    startDate: string,
    endDate: string
  ): Report['questStats'] {
    const end = parseDate(endDate);
    end.setHours(23, 59, 59, 999);

    let completed = 0;
    let failed = 0;
    let inProgress = 0;

    for (const quest of quests) {
      // Status AT THE END OF THE REPORT PERIOD

      // If completed:
      if (quest.status === 'completed' && quest.completedAt) {
        const completedAt = new Date(quest.completedAt);
        if (completedAt <= end) {
          completed++;
          continue;
        }
      }

      // If failed: (assuming we can track when it failed, otherwise rely on current status if no timestamp)
      // Quest interface doesn't have `failedAt`. Proxies: `updatedAt`?
      // If `failed`, and `updatedAt` <= end, count as failed.
      // Else, count as in_progress (it failed later).
      if (quest.status === 'failed') {
        const failedAt = new Date(quest.updatedAt); // Approximation
        if (failedAt <= end) {
          failed++;
          continue;
        }
      }

      // Default to in_progress if it existed during the period
      // Check creation date
      const createdAt = new Date(quest.createdAt);
      if (createdAt <= end) {
        inProgress++;
      }
    }

    const total = completed + failed;
    const completionRate = total > 0 ? Math.floor((completed / total) * 100) : 0;

    return {
      completed,
      failed,
      inProgress,
      completionRate,
    };
  }

  /**
   * Calculate event statistics
   */
  private calculateEventStats(diaries: Diary[]): Report['eventStats'] {
    const allEvents = diaries.flatMap((d) => d.events);

    const byRarity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const event of allEvents) {
      byRarity[event.rarity] = (byRarity[event.rarity] || 0) + 1;
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    return {
      totalEvents: allEvents.length,
      byRarity,
      byType,
    };
  }

  /**
   * Generate charts data
   */
  private generateCharts(
    diaries: Diary[],
    emotionStats: Report['emotionStats'],
    startDate: string,
    endDate: string,
    reportType: Report['type']
  ): Report['charts'] {
    // Aggregate data based on report type
    let emotionTrendLabels: string[] = [];
    let emotionTrendData: number[] = [];
    let writingFrequencyLabels: string[] = [];
    let writingFrequencyData: number[] = [];

    if (reportType === 'weekly') {
      // Daily granularity for weekly reports
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      const allDates: string[] = [];
      const current = new Date(start);

      while (current <= end) {
        allDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // Emotion trend - daily
      const emotionByDate = new Map<string, number[]>();
      for (const trend of emotionStats.emotionTrend) {
        if (!emotionByDate.has(trend.date)) {
          emotionByDate.set(trend.date, []);
        }
        emotionByDate.get(trend.date)!.push(trend.sentiment);
      }

      emotionTrendLabels = allDates;
      emotionTrendData = allDates.map(date => {
        const sentiments = emotionByDate.get(date) || [];
        return sentiments.length > 0
          ? sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length
          : 0;
      });

      // Writing frequency - daily
      const diaryCountsByDate = new Map<string, number>();
      for (const diary of diaries) {
        const date = diary.date;
        diaryCountsByDate.set(date, (diaryCountsByDate.get(date) || 0) + 1);
      }

      writingFrequencyLabels = allDates;
      writingFrequencyData = allDates.map(date => diaryCountsByDate.get(date) || 0);
    } else if (reportType === 'monthly') {
      // Weekly granularity for monthly reports
      const start = parseDate(startDate);
      const end = parseDate(endDate);

      // Group by week
      const weekGroups: { label: string; startDate: Date; endDate: Date }[] = [];
      const current = new Date(start);
      let weekNum = 1;

      while (current <= end) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > end) {
          weekEnd.setTime(end.getTime());
        }

        weekGroups.push({
          label: `第${weekNum}週`,
          startDate: weekStart,
          endDate: weekEnd,
        });

        current.setDate(current.getDate() + 7);
        weekNum++;
      }

      // Emotion trend - weekly average
      emotionTrendLabels = weekGroups.map(w => w.label);
      emotionTrendData = weekGroups.map(week => {
        const weekSentiments = emotionStats.emotionTrend.filter(e => {
          const eDate = parseDate(e.date);
          return eDate >= week.startDate && eDate <= week.endDate;
        });
        return weekSentiments.length > 0
          ? weekSentiments.reduce((sum, e) => sum + e.sentiment, 0) / weekSentiments.length
          : 0;
      });

      // Writing frequency - weekly total
      writingFrequencyLabels = weekGroups.map(w => w.label);
      writingFrequencyData = weekGroups.map(week => {
        return diaries.filter(d => {
          const dDate = parseDate(d.date);
          return dDate >= week.startDate && dDate <= week.endDate;
        }).length;
      });
    } else {
      // Monthly granularity for yearly reports
      const start = parseDate(startDate);
      const end = parseDate(endDate);

      // Group by month
      const monthGroups: { label: string; month: number; year: number }[] = [];
      const current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        monthGroups.push({
          label: `${current.getFullYear()}/${(current.getMonth() + 1).toString().padStart(2, '0')}`,
          month: current.getMonth(),
          year: current.getFullYear(),
        });
        current.setMonth(current.getMonth() + 1);
      }

      // Emotion trend - monthly average
      emotionTrendLabels = monthGroups.map(m => m.label);
      emotionTrendData = monthGroups.map(month => {
        const monthSentiments = emotionStats.emotionTrend.filter(e => {
          const eDate = parseDate(e.date);
          return eDate.getFullYear() === month.year && eDate.getMonth() === month.month;
        });
        return monthSentiments.length > 0
          ? monthSentiments.reduce((sum, e) => sum + e.sentiment, 0) / monthSentiments.length
          : 0;
      });

      // Writing frequency - monthly total
      writingFrequencyLabels = monthGroups.map(m => m.label);
      writingFrequencyData = monthGroups.map(month => {
        return diaries.filter(d => {
          const dDate = parseDate(d.date);
          return dDate.getFullYear() === month.year && dDate.getMonth() === month.month;
        }).length;
      });
    }

    return {
      emotionTrend: {
        labels: emotionTrendLabels,
        datasets: [
          {
            label: '感情スコア',
            data: emotionTrendData,
          },
        ],
      },
      writingFrequency: {
        labels: writingFrequencyLabels,
        datasets: [
          {
            label: '日記数',
            data: writingFrequencyData,
          },
        ],
      },
      questProgress: {
        labels: ['完了', '進行中', '失敗'],
        datasets: [
          {
            label: 'クエスト',
            data: [0, 0, 0], // Will be filled by caller
          },
        ],
      },
    };
  }

  /**
   * Generate AI summary
   */
  private async generateAISummary(
    options: ReportGenerateOptions,
    stats: {
      diaryStats: Report['diaryStats'];
      emotionStats: Report['emotionStats'];
      characterGrowth: Report['characterGrowth'];
      questStats: Report['questStats'];
    }
  ): Promise<string> {
    const prompt = `
あなたは冒険者の成長を見守るメンターです。以下の統計データから、レポート期間の総評を作成してください。
冒険者名: ${options.character.basicInfo.name}

【期間】
${options.startDate} 〜 ${options.endDate}

【日記統計】
- 総日記数: ${stats.diaryStats.totalCount}
- 平均文字数: ${stats.diaryStats.averageWordCount}
- 最長連続記録: ${stats.diaryStats.longestStreak}日

【感情統計】
- 最も多い感情: ${stats.emotionStats.mostCommon}
- ポジティブ率: ${stats.emotionStats.positiveRatio}%

【成長】
- 獲得経験値: ${stats.characterGrowth.expGained}
- レベル上昇: ${stats.characterGrowth.levelsGained}
- 獲得ゴールド: ${stats.characterGrowth.goldEarned}

【クエスト】
- 完了: ${stats.questStats.completed}
- 達成率: ${stats.questStats.completionRate}%

上記のデータから、この期間の冒険者（${options.character.basicInfo.name}）の成長を振り返り、励ましと次の目標を提案してください（200文字程度）。
    `.trim();

    const response = await this.llmManager.generateForFeature('reportGeneration', prompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    return response.text.trim();
  }
}
