/**
 * Application configuration types
 */

import type { LLMConfig } from './llm';

export interface AppConfig {
  general: {
    language: 'ja' | 'en';
    theme: 'light' | 'dark' | 'auto';
    startOnBoot: boolean;
  };

  llm: LLMConfig;

  data: {
    backupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    backupLocation: string;
    autoExport: boolean;
  };

  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    reminderTime: string; // HH:mm
    questDeadlines: boolean;
    levelUp: boolean;
    achievements: boolean;
  };

  privacy: {
    analyticsEnabled: boolean;
    errorReporting: boolean;
  };

  editor: {
    autoSave: boolean;
    autoSaveInterval: number; // seconds
    spellCheck: boolean;
    wordWrap: boolean;
  };
}
