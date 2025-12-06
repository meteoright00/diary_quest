/**
 * OpenAI LLM provider
 */

import { BaseLLMProvider } from '../base';
import type { LLMGenerateOptions, LLMResponse } from '../../types/llm';

export class OpenAIProvider extends BaseLLMProvider {
  async generateText(prompt: string, options: LLMGenerateOptions = {}): Promise<LLMResponse> {
    this.validateApiKey();

    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature ?? 0.7;

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: { message?: string } };
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const usage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      };

      // Update usage statistics
      const cost = this.calculateCost(model, usage.totalTokens);
      this.updateUsage({ totalTokens: usage.totalTokens, cost });

      return {
        text: data.choices[0].message.content,
        usage,
        model,
      };
    } catch (error) {
      throw new Error(`Failed to generate text with OpenAI: ${(error as Error).message}`);
    }
  }
}
