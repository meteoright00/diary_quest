/**
 * LLM (Language Model) related types
 */

export interface LLMConfig {
  providers: ProviderConfig[];

  defaultProvider: string;

  fallbackEnabled: boolean;

  usageTracking: boolean;

  features: {
    diaryConversion: FeatureProviderConfig;
    emotionAnalysis: FeatureProviderConfig;
    storyGeneration: FeatureProviderConfig;
    reportGeneration: FeatureProviderConfig;
  };

  costManagement: {
    monthlyLimit: number; // USD
    alertThreshold: number; // %
  };
}

export interface ProviderConfig {
  id: string; // 'openai' | 'claude' | 'gemini'
  name: string;
  apiKey: string;
  enabled: boolean;

  models: ModelConfig[];

  usage: {
    totalTokens: number;
    totalCost: number;
    lastResetAt: Date;
  };
}

export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  description?: string;
}

export interface FeatureProviderConfig {
  provider: string; // Provider ID
  model: string; // Model ID
}

// LLM Provider interface (for implementation)
export interface LLMProvider {
  id: string;
  name: string;

  generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse>;
}

export interface LLMGenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}
