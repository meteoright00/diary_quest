/**
 * Base LLM provider interface
 */

import type {
  LLMProvider,
  LLMGenerateOptions,
  LLMResponse,
  ProviderConfig,
} from '../types/llm';

export abstract class BaseLLMProvider implements LLMProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  abstract generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse>;

  /**
   * Validate API key
   */
  protected validateApiKey(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key not configured for ${this.name}`);
    }
  }

  /**
   * Get default model ID
   */
  protected getDefaultModel(): string {
    if (this.config.models.length === 0) {
      throw new Error(`No models configured for ${this.name}`);
    }
    return this.config.models[0].id;
  }

  /**
   * Update usage statistics
   */
  protected updateUsage(usage: { totalTokens: number; cost: number }): void {
    this.config.usage.totalTokens += usage.totalTokens;
    this.config.usage.totalCost += usage.cost;
  }

  /**
   * Calculate cost based on tokens
   */
  protected calculateCost(model: string, tokens: number): number {
    const modelConfig = this.config.models.find((m) => m.id === model);
    if (!modelConfig) {
      return 0;
    }
    return (tokens / 1000) * modelConfig.costPer1kTokens;
  }
}
