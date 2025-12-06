/**
 * Google Gemini LLM provider
 */

import { BaseLLMProvider } from '../base';
import type { LLMGenerateOptions, LLMResponse } from '../../types/llm';

export class GeminiProvider extends BaseLLMProvider {
  async generateText(prompt: string, options: LLMGenerateOptions = {}): Promise<LLMResponse> {
    this.validateApiKey();

    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature ?? 0.7;

    // Construct full prompt with system message if provided
    let fullPrompt = prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = (await response.json()) as { error?: { message?: string } };
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        promptFeedback?: { blockReason?: string; safetyRatings?: Array<{ category: string; probability: string }> };
      };

      // Debug: Log the response for troubleshooting
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));

      // Check if response was blocked or has no candidates
      if (!data.candidates || data.candidates.length === 0) {
        const blockReason = data.promptFeedback?.blockReason || 'Unknown reason';
        const safetyInfo = data.promptFeedback?.safetyRatings
          ? `Safety ratings: ${JSON.stringify(data.promptFeedback.safetyRatings)}`
          : '';
        throw new Error(`Gemini API returned no candidates. Reason: ${blockReason}. ${safetyInfo}`);
      }

      // Gemini doesn't provide detailed token usage in all cases
      const candidate = data.candidates[0];
      const part = candidate.content?.parts?.[0];

      if (!part || !part.text) {
        // Check for finish reason or safety ratings
        const finishReason = (candidate as any).finishReason;
        const safetyRatings = (candidate as any).safetyRatings;

        let errorMessage = 'Gemini API returned candidates but no text content found.';
        if (finishReason) {
          errorMessage += ` Finish Reason: ${finishReason}.`;
        }
        if (safetyRatings) {
          errorMessage += ` Safety Ratings: ${JSON.stringify(safetyRatings)}.`;
        }

        throw new Error(errorMessage);
      }

      const text = part.text;
      const estimatedTokens = Math.ceil((fullPrompt.length + text.length) / 4);

      const usage = {
        promptTokens: Math.ceil(fullPrompt.length / 4),
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: estimatedTokens,
      };

      // Update usage statistics
      const cost = this.calculateCost(model, usage.totalTokens);
      this.updateUsage({ totalTokens: usage.totalTokens, cost });

      return {
        text,
        usage,
        model,
      };
    } catch (error) {
      throw new Error(`Failed to generate text with Gemini: ${(error as Error).message}`);
    }
  }
}
