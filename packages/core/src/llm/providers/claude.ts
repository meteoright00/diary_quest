/**
 * Anthropic Claude LLM provider
 */

import { BaseLLMProvider } from '../base';
import type { LLMGenerateOptions, LLMResponse } from '../../types/llm';

export class ClaudeProvider extends BaseLLMProvider {
  async generateText(prompt: string, options: LLMGenerateOptions = {}): Promise<LLMResponse> {
    this.validateApiKey();

    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature ?? 0.7;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: { message?: string } };
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as {
        content: Array<{ text: string }>;
        usage: { input_tokens: number; output_tokens: number };
      };

      const usage = {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      };

      // Update usage statistics
      const cost = this.calculateCost(model, usage.totalTokens);
      this.updateUsage({ totalTokens: usage.totalTokens, cost });

      return {
        text: data.content[0].text,
        usage,
        model,
      };
    } catch (error) {
      throw new Error(`Failed to generate text with Claude: ${(error as Error).message}`);
    }
  }
}
