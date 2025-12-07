import { useState, useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import Layout from './components/layout/Layout';
import DiaryPage from './pages/DiaryPage';
import PastDiariesPage from './pages/PastDiariesPage';
import CharacterPage from './pages/CharacterPage';
import QuestsPage from './pages/QuestsPage';
import StoryPage from './pages/StoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import { useAppInitialize } from './hooks/useAppInitialize';
import { useSettingsStore } from './store/settingsStore';
import { useCharacterStore } from './store/characterStore';
import { notificationService } from './services/NotificationService';
import { initializeLLMManager, isLLMInitialized } from './services/llm';

type Page = 'welcome' | 'home' | 'diary' | 'pastDiaries' | 'character' | 'quests' | 'story' | 'reports' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const { isInitializing, error } = useAppInitialize();
  const { setIsFirstLaunch, llmSettings, worldSettings, loadSecureSettings, getLLMProviderConfig } = useSettingsStore();
  const { characters } = useCharacterStore();

  // Load secure settings (API key)
  useEffect(() => {
    loadSecureSettings();
  }, [loadSecureSettings]);

  // Initialize LLM Manager when settings are available
  useEffect(() => {
    if (llmSettings && llmSettings.apiKey) {
      try {
        const providerConfig = getLLMProviderConfig();
        initializeLLMManager({
          providers: [providerConfig],
          defaultProvider: llmSettings.provider,
          fallbackEnabled: false,
          usageTracking: false,
          features: {
            diaryConversion: { provider: llmSettings.provider, model: llmSettings.model },
            emotionAnalysis: { provider: llmSettings.provider, model: llmSettings.model },
            storyGeneration: { provider: llmSettings.provider, model: llmSettings.model },
            reportGeneration: { provider: llmSettings.provider, model: llmSettings.model },
          },
          costManagement: {
            monthlyLimit: 100,
            alertThreshold: 0.8,
          },
        });
        console.log('LLM Manager initialized globally');
      } catch (error) {
        console.error('Failed to initialize LLM Manager:', error);
      }
    }
  }, [llmSettings, getLLMProviderConfig]);

  // Initialize Notification Service
  useEffect(() => {
    notificationService.start();
    return () => notificationService.stop();
  }, []);

  // Handle Window Close Request (Minimize to Tray)
  useEffect(() => {
    // Skip if not in Tauri
    if (typeof window === 'undefined' || !('__TAURI_IPC__' in window)) return;

    const unlisten = appWindow.onCloseRequested(async (event) => {
      const { appSettings } = useSettingsStore.getState();
      if (appSettings.minimizeToTray) {
        event.preventDefault();
        await appWindow.hide();
      }
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Check setup status whenever page changes
  useEffect(() => {
    if (isInitializing) return;

    const hasWorldSettings = !!worldSettings;
    const hasCharacter = characters.length > 0;
    const hasLLMSettings = !!llmSettings?.apiKey;
    const isSetupComplete = hasWorldSettings && hasCharacter && hasLLMSettings;

    // If setup is not complete and trying to navigate away from setup pages
    if (!isSetupComplete) {
      // Allow welcome, character, and settings pages during setup
      const allowedPages: Page[] = ['welcome', 'character', 'settings'];
      if (!allowedPages.includes(currentPage)) {
        // Redirect to welcome
        setCurrentPage('welcome');
      }
    } else if (currentPage === 'welcome' && isSetupComplete) {
      // Setup is complete but still on welcome - move to home
      setCurrentPage('home');
    }
  }, [isInitializing, currentPage, characters.length, llmSettings?.apiKey, worldSettings]);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <h1 className="text-2xl font-bold mb-2">Diary Quest</h1>
          <p className="text-muted-foreground">初期化中...</p>
        </div>
      </div>
    );
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">初期化エラー</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  const handleWelcomeComplete = () => {
    setIsFirstLaunch(false);
    setCurrentPage('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onComplete={handleWelcomeComplete} onNavigate={setCurrentPage} />;
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'diary':
        return <DiaryPage />;
      case 'pastDiaries':
        return <PastDiariesPage />;
      case 'character':
        return <CharacterPage onNavigate={setCurrentPage} />;
      case 'quests':
        return <QuestsPage />;
      case 'story':
        return <StoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <div key={currentPage}>
        {renderPage()}
      </div>
    </Layout>
  );
}

export default App;
