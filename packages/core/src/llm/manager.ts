/**
 * LLM Manager - Manages multiple LLM providers
 */

import type { LLMProvider, LLMConfig, LLMGenerateOptions, LLMResponse } from '../types/llm';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import { GeminiProvider } from './providers/gemini';

export class LLMManager {
  private providers: Map<string, LLMProvider> = new Map();
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    for (const providerConfig of this.config.providers) {
      if (!providerConfig.enabled) continue;

      let provider: LLMProvider | null = null;

      switch (providerConfig.id) {
        case 'openai':
          provider = new OpenAIProvider(providerConfig);
          break;
        case 'claude':
          provider = new ClaudeProvider(providerConfig);
          break;
        case 'gemini':
          provider = new GeminiProvider(providerConfig);
          break;
        default:
          console.warn(`Unknown provider: ${providerConfig.id}`);
      }

      if (provider) {
        this.providers.set(providerConfig.id, provider);
      }
    }
  }

  /**
   * Generate text using the default provider
   */
  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    const providerId = this.config.defaultProvider;
    return this.generateWithProvider(providerId, prompt, options);
  }

  /**
   * Generate text for a specific feature (uses feature-specific provider)
   */
  async generateForFeature(
    feature: keyof LLMConfig['features'],
    prompt: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const featureConfig = this.config.features[feature];
    const providerId = featureConfig.provider;
    const model = options?.model || featureConfig.model;

    return this.generateWithProvider(providerId, prompt, { ...options, model });
  }

  /**
   * Generate text with a specific provider
   */
  async generateWithProvider(
    providerId: string,
    prompt: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const provider = this.providers.get(providerId);

    if (!provider) {
      if (this.config.fallbackEnabled) {
        return this.generateWithFallback(prompt, options);
      }
      throw new Error(`Provider ${providerId} not found or not enabled`);
    }

    try {
      return await provider.generateText(prompt, options);
    } catch (error) {
      console.error(`Error with provider ${providerId}:`, error);

      if (this.config.fallbackEnabled) {
        return this.generateWithFallback(prompt, options, providerId);
      }

      throw error;
    }
  }

  /**
   * Try fallback providers
   */
  private async generateWithFallback(
    prompt: string,
    options?: LLMGenerateOptions,
    excludeProviderId?: string
  ): Promise<LLMResponse> {
    const availableProviders = Array.from(this.providers.entries()).filter(
      ([id]) => id !== excludeProviderId
    );

    if (availableProviders.length === 0) {
      throw new Error('No available providers for fallback');
    }

    for (const [providerId, provider] of availableProviders) {
      try {
        console.log(`Trying fallback provider: ${providerId}`);
        return await provider.generateText(prompt, options);
      } catch (error) {
        console.error(`Fallback provider ${providerId} failed:`, error);
        continue;
      }
    }

    throw new Error('All providers failed');
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): LLMProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get usage statistics for all providers
   */
  getUsageStats() {
    const stats: Record<string, { totalTokens: number; totalCost: number }> = {};

    for (const providerConfig of this.config.providers) {
      stats[providerConfig.id] = {
        totalTokens: providerConfig.usage.totalTokens,
        totalCost: providerConfig.usage.totalCost,
      };
    }

    return stats;
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    const now = new Date();
    for (const providerConfig of this.config.providers) {
      providerConfig.usage.totalTokens = 0;
      providerConfig.usage.totalCost = 0;
      providerConfig.usage.lastResetAt = now;
    }
  }

  /**
   * Check if monthly cost limit is exceeded
   */
  isCostLimitExceeded(): boolean {
    const totalCost = this.config.providers.reduce(
      (sum, p) => sum + p.usage.totalCost,
      0
    );
    return totalCost >= this.config.costManagement.monthlyLimit;
  }

  /**
   * Check if cost alert threshold is reached
   */
  shouldAlertCost(): boolean {
    const totalCost = this.config.providers.reduce(
      (sum, p) => sum + p.usage.totalCost,
      0
    );
    const threshold =
      (this.config.costManagement.monthlyLimit * this.config.costManagement.alertThreshold) / 100;
    return totalCost >= threshold;
  }
}
