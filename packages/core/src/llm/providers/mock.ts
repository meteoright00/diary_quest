/**
 * Mock LLM Provider
 * Returns dummy responses for testing and development
 */

import { BaseLLMProvider } from '../base';
import type { LLMResponse, LLMGenerateOptions } from '../../types/llm';

export class MockLLMProvider extends BaseLLMProvider {
    /**
     * Generate text using dummy responses
     */
    async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
        const model = options?.model || this.getDefaultModel();
        let text = 'これはMockプロバイダーからのダミーレスポンスです。';

        // Simple keyword matching to return context-aware dummy data
        if (prompt.includes('日記') && (prompt.includes('変換') || prompt.includes('冒険記'))) {
            const mockResult = {
                convertedContent: `# 冒険の記録 - ${new Date().toLocaleDateString()}\n\nギルド（会社）での激務（会議）を終え、私は宿屋（自宅）へと帰還した。疲労困憊だが、心地よい達成感に包まれている。`,
                storyMetadata: {
                    location: '宿屋の自室',
                    companions: [],
                    ongoingEvents: [],
                    significantItems: []
                },
                newMappings: []
            };
            text = JSON.stringify(mockResult);
        } else if (prompt.includes('感情') && prompt.includes('分析')) {
            text = JSON.stringify({
                primary: 'fatigue',
                secondary: 'joy',
                scores: {
                    joy: 60,
                    sadness: 0,
                    anger: 0,
                    anxiety: 10,
                    calm: 20,
                    excitement: 0,
                    fatigue: 80
                },
                overallSentiment: 'neutral',
                sentimentScore: -20,
                encouragementMessage: '激しい戦いの後の心地よい疲れを感じているようです。ゆっくり休んでください。'
            });
        } else if (prompt.includes('ストーリー')) {
            text = '# 第1章：始まりの予兆\n\n冒険者は深い森の中にいた。そこはただの森ではなく、古代の魔力が眠る場所だった...';
        } else if (prompt.includes('レポート')) {
            text = JSON.stringify({
                summary: '今月は多くのクエストを達成しました。',
                stats: { questsCompleted: 15, levelUp: 2 }
            });
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            text,
            usage: {
                promptTokens: prompt.length,
                completionTokens: text.length,
                totalTokens: prompt.length + text.length,
            },
            model,
        };
    }
}
