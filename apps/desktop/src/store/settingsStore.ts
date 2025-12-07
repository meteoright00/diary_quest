import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderConfig, WorldSettings, ModelConfig } from '@diary-quest/core/types';

interface LLMSettings {
  provider: 'openai' | 'claude' | 'gemini' | 'mock';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface AppSettings {
  theme: 'light' | 'dark';
  language: 'ja' | 'en';
  worldSettingsPath: string;
  enableNotifications: boolean;
  notificationTime: string;
  minimizeToTray: boolean;
}

interface SettingsState {
  // State
  llmSettings: LLMSettings;
  appSettings: AppSettings;
  worldSettings: WorldSettings | null;
  isFirstLaunch: boolean;

  // Actions
  setLLMSettings: (settings: Partial<LLMSettings>) => void;
  setAppSettings: (settings: Partial<AppSettings>) => void;
  setWorldSettings: (settings: WorldSettings) => void;
  setIsFirstLaunch: (value: boolean) => void;
  resetSettings: () => void;
  loadSecureSettings: () => Promise<void>;

  // Helper to get LLM Provider Config
  getLLMProviderConfig: () => ProviderConfig;
}

const defaultLLMSettings: LLMSettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4',
  temperature: 0.8,
  maxTokens: 2000,
};

const defaultAppSettings: AppSettings = {
  theme: 'dark',
  language: 'ja',
  worldSettingsPath: '',
  enableNotifications: false,
  notificationTime: '20:00',
  minimizeToTray: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      llmSettings: defaultLLMSettings,
      appSettings: defaultAppSettings,
      worldSettings: null,
      isFirstLaunch: true,

      // Actions
      setLLMSettings: async (settings) => {
        // Save API key to secure storage if it's being updated
        if (settings.apiKey !== undefined) {
          try {
            const { saveApiKey } = await import('../lib/secureStorage');
            await saveApiKey(settings.apiKey);
          } catch (error) {
            console.error('Failed to save API key securely:', error);
          }
        }

        set((state) => ({
          llmSettings: { ...state.llmSettings, ...settings },
        }));
      },

      setAppSettings: (settings) =>
        set((state) => ({
          appSettings: { ...state.appSettings, ...settings },
        })),

      setWorldSettings: (settings) =>
        set({
          worldSettings: settings,
        }),

      setIsFirstLaunch: (value) =>
        set({
          isFirstLaunch: value,
        }),

      resetSettings: () =>
        set({
          llmSettings: defaultLLMSettings,
          appSettings: defaultAppSettings,
          worldSettings: null,
          isFirstLaunch: true,
        }),

      // Load secure settings (API key)
      loadSecureSettings: async () => {
        try {
          const { loadApiKey } = await import('../lib/secureStorage');
          const apiKey = await loadApiKey();
          if (apiKey) {
            set((state) => ({
              llmSettings: { ...state.llmSettings, apiKey },
            }));
          }
        } catch (error) {
          console.error('Failed to load secure settings:', error);
        }
      },

      // Helper to get LLM Provider Config
      getLLMProviderConfig: () => {
        const { llmSettings } = get();

        // Create model config based on current settings
        const modelConfig: ModelConfig = {
          id: llmSettings.model,
          name: llmSettings.model,
          maxTokens: llmSettings.maxTokens,
          costPer1kTokens: 0.01, // Default, will be updated by LLM Manager
        };

        return {
          id: llmSettings.provider,
          name: llmSettings.provider.charAt(0).toUpperCase() + llmSettings.provider.slice(1),
          apiKey: llmSettings.apiKey,
          enabled: true,
          models: [modelConfig],
          usage: {
            totalTokens: 0,
            totalCost: 0,
            lastResetAt: new Date(),
          },
        };
      },
    }),
    {
      name: 'diary-quest-settings',
      partialize: (state) => ({
        ...state,
        llmSettings: {
          ...state.llmSettings,
          apiKey: '', // Don't persist API key to localStorage
        },
      }),
    }
  )
);
