/**
 * Emotion analyzer - Analyzes emotions from diary content
 */

import type { LLMManager } from '../llm/manager';
import type { EmotionAnalysis, EmotionType } from '../types/diary';
import { POSITIVE_EMOTIONS, NEGATIVE_EMOTIONS, SENTIMENT_THRESHOLDS } from '@diary-quest/shared';

export class EmotionAnalyzer {
  private llmManager: LLMManager;

  constructor(llmManager: LLMManager) {
    this.llmManager = llmManager;
  }

  /**
   * Analyze emotions from diary content
   */
  async analyze(diaryContent: string): Promise<EmotionAnalysis> {
    const prompt = this.buildAnalysisPrompt(diaryContent);

    const response = await this.llmManager.generateForFeature('emotionAnalysis', prompt, {
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 2048,
    });

    return this.parseAnalysisResult(response.text);
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(content: string): string {
    return `
以下の日記の感情を分析してください。

【日記】
${content}

【分析項目】
以下のJSON形式で出力してください：

{
  "primary": "主要な感情（joy/sadness/anger/anxiety/calm/excitement/fatigue）",
  "secondary": "副次的な感情（なければnull）",
  "scores": {
    "joy": 0-100の数値,
    "sadness": 0-100の数値,
    "anger": 0-100の数値,
    "anxiety": 0-100の数値,
    "calm": 0-100の数値,
    "excitement": 0-100の数値,
    "fatigue": 0-100の数値
  },
  "overallSentiment": "positive/neutral/negative",
  "sentimentScore": -100から100の数値（ポジティブほど高い）,
  "encouragementMessage": "励ましメッセージ（ネガティブな場合のみ、なければnull）"
}

JSONのみを出力し、他の説明は不要です。
    `.trim();
  }

  /**
   * Parse analysis result from LLM response
   */
  private parseAnalysisResult(responseText: string): EmotionAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        primary: EmotionType;
        secondary: EmotionType | null;
        scores: Record<EmotionType, number>;
        overallSentiment: 'positive' | 'neutral' | 'negative';
        sentimentScore: number;
        encouragementMessage: string | null;
      };

      return {
        primary: parsed.primary,
        secondary: parsed.secondary,
        scores: parsed.scores,
        overallSentiment: parsed.overallSentiment,
        sentimentScore: parsed.sentimentScore,
        encouragementMessage: parsed.encouragementMessage,
        recommendedDiaries: [], // Will be populated by the caller
      };
    } catch (error) {
      // Fallback to neutral analysis if parsing fails
      console.error('Failed to parse emotion analysis:', error);
      return this.createNeutralAnalysis();
    }
  }

  /**
   * Create neutral analysis as fallback
   */
  private createNeutralAnalysis(): EmotionAnalysis {
    return {
      primary: 'calm',
      secondary: null,
      scores: {
        joy: 30,
        sadness: 10,
        anger: 5,
        anxiety: 10,
        calm: 40,
        excitement: 20,
        fatigue: 15,
      },
      overallSentiment: 'neutral',
      sentimentScore: 0,
      encouragementMessage: null,
      recommendedDiaries: [],
    };
  }

  /**
   * Determine if emotion is positive
   */
  isPositiveEmotion(emotion: EmotionType): boolean {
    return (POSITIVE_EMOTIONS as readonly string[]).includes(emotion);
  }

  /**
   * Determine if emotion is negative
   */
  isNegativeEmotion(emotion: EmotionType): boolean {
    return (NEGATIVE_EMOTIONS as readonly string[]).includes(emotion);
  }

  /**
   * Calculate overall sentiment from scores
   */
  calculateSentiment(scores: Record<EmotionType, number>): {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  } {
    const positiveScore = POSITIVE_EMOTIONS.reduce(
      (sum: number, emotion: string) => sum + scores[emotion as EmotionType],
      0
    );
    const negativeScore = NEGATIVE_EMOTIONS.reduce(
      (sum: number, emotion: string) => sum + scores[emotion as EmotionType],
      0
    );

    const sentimentScore = positiveScore - negativeScore;

    let sentiment: 'positive' | 'neutral' | 'negative';
    if (sentimentScore >= SENTIMENT_THRESHOLDS.POSITIVE_MIN) {
      sentiment = 'positive';
    } else if (sentimentScore <= SENTIMENT_THRESHOLDS.NEGATIVE_MAX) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return { sentiment, score: sentimentScore };
  }
}
