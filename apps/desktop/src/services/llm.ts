/**
 * LLM service for desktop app
 */

import { LLMManager, DiaryConverter, EmotionAnalyzer } from '@diary-quest/core';
import type { LLMConfig } from '@diary-quest/core/types';

// LLMManager singleton instance
let llmManagerInstance: LLMManager | null = null;

/**
 * Initialize LLM Manager with config
 */
export function initializeLLMManager(config: LLMConfig): LLMManager {
  llmManagerInstance = new LLMManager(config);
  return llmManagerInstance;
}

/**
 * Get LLM Manager instance
 */
export function getLLMManager(): LLMManager {
  if (!llmManagerInstance) {
    throw new Error('LLM Manager not initialized. Call initializeLLMManager first.');
  }
  return llmManagerInstance;
}

/**
 * Get Diary Converter instance
 */
export function getDiaryConverter(): DiaryConverter {
  const manager = getLLMManager();
  return new DiaryConverter(manager);
}

/**
 * Get Emotion Analyzer instance
 */
export function getEmotionAnalyzer(): EmotionAnalyzer {
  const manager = getLLMManager();
  return new EmotionAnalyzer(manager);
}

/**
 * Check if LLM Manager is initialized
 */
export function isLLMInitialized(): boolean {
  return llmManagerInstance !== null;
}
