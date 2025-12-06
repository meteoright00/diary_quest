import { useEffect, useState } from 'react';
import { db } from '@/services/database';

interface InitializeState {
  isInitializing: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Hook for initializing the application
 */
export function useAppInitialize() {
  const [state, setState] = useState<InitializeState>({
    isInitializing: true,
    isInitialized: false,
    error: null,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Starting app initialization...');

        // Initialize database
        console.log('Initializing database...');
        await db.initialize();
        console.log('Database initialized');

        // Ensure default world exists
        console.log('Ensuring default world exists...');
        await db.execute(
          `INSERT OR IGNORE INTO worlds (id, created_at, updated_at, name, description, genre, setting, tone, rules)
           VALUES (?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?)`,
          [
            'world_temp',
            'デフォルトワールド',
            '剣と魔法のファンタジー世界',
            'fantasy',
            '中世ファンタジー',
            'epic',
            '{"magic": true, "level_system": true}'
          ]
        );
        console.log('Default world ensured');

        // Load initial data
        console.log('Loading initial data...');
        
        // Import store functions dynamically to avoid circular dependencies
        const { useCharacterStore } = await import('@/store/characterStore');
        const { useDiaryStore } = await import('@/store/diaryStore');
        const { useQuestStore } = await import('@/store/questStore');
        const { useReportStore } = await import('@/store/reportStore');
        const { useStoryStore } = await import('@/store/storyStore');
        
        // Load characters
        console.log('Loading characters...');
        await useCharacterStore.getState().loadCharacters();
        
        // Get characters from store
        const characters = useCharacterStore.getState().characters;
        
        if (characters.length > 0) {
          // Set the first character as current
          const firstCharacter = characters[0];
          console.log('Setting current character:', firstCharacter.id);
          useCharacterStore.getState().setCurrentCharacter(firstCharacter);
          
          console.log('Loading data for current character:', firstCharacter.id);
          
          // Load all character-related data
          await Promise.all([
            useDiaryStore.getState().loadDiariesByCharacter(firstCharacter.id),
            useQuestStore.getState().loadQuestsByCharacter(firstCharacter.id),
            useReportStore.getState().loadReportsByCharacter(firstCharacter.id),
            useStoryStore.getState().loadStoriesByCharacter(firstCharacter.id),
          ]);
          
          console.log('Character data loaded');
        } else {
          console.log('No character found, user needs to create one');
        }

        console.log('App initialization complete');
        setState({
          isInitializing: false,
          isInitialized: true,
          error: null,
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setState({
          isInitializing: false,
          isInitialized: false,
          error: error instanceof Error ? error.message : '初期化に失敗しました',
        });
      }
    };

    initialize();
  }, []);

  return state;
}
