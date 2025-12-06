import { create } from 'zustand';
import type { Quest } from '@diary-quest/core/types';
import { questRepository } from '@/repositories';

interface QuestState {
  // State
  quests: Quest[];
  currentQuest: Quest | null;
  isLoading: boolean;
  error: string | null;

  // Basic Actions (state only)
  setQuests: (quests: Quest[]) => void;
  setCurrentQuest: (quest: Quest | null) => void;
  addQuest: (quest: Quest) => void;
  updateQuest: (id: string, updates: Partial<Quest>) => void;
  deleteQuest: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Repository Actions (DB + state)
  loadQuest: (id: string) => Promise<void>;
  loadQuestsByCharacter: (characterId: string) => Promise<void>;
  loadQuestsByStatus: (characterId: string, status: Quest['status']) => Promise<void>;
  loadActiveQuests: (characterId: string) => Promise<void>;
  loadQuestsByCategory: (characterId: string, category: Quest['category']) => Promise<void>;
  createQuest: (quest: Quest) => Promise<void>;
  saveQuest: (quest: Quest) => Promise<void>;
  removeQuest: (id: string) => Promise<void>;

  // Queries
  getQuestsByCharacterId: (characterId: string) => Quest[];
  getQuestsByStatus: (status: Quest['status']) => Quest[];
  getActiveQuests: (characterId: string) => Quest[];
  getCompletedQuests: (characterId: string) => Quest[];
}

export const useQuestStore = create<QuestState>((set, get) => ({
  // Initial state
  quests: [],
  currentQuest: null,
  isLoading: false,
  error: null,

  // Actions
  setQuests: (quests) => set({ quests }),

  setCurrentQuest: (quest) => set({ currentQuest: quest }),

  addQuest: (quest) =>
    set((state) => ({
      quests: [...state.quests, quest],
    })),

  updateQuest: (id, updates) =>
    set((state) => ({
      quests: state.quests.map((quest) =>
        quest.id === id ? { ...quest, ...updates } : quest
      ),
      currentQuest:
        state.currentQuest?.id === id
          ? { ...state.currentQuest, ...updates }
          : state.currentQuest,
    })),

  deleteQuest: (id) =>
    set((state) => ({
      quests: state.quests.filter((quest) => quest.id !== id),
      currentQuest: state.currentQuest?.id === id ? null : state.currentQuest,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Repository Actions
  loadQuest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const quest = await questRepository.findById(id);
      set({ currentQuest: quest, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadQuestsByCharacter: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const quests = await questRepository.findByCharacterId(characterId);
      set({ quests, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadQuestsByStatus: async (characterId, status) => {
    set({ isLoading: true, error: null });
    try {
      const quests = await questRepository.findByStatus(characterId, status);
      set({ quests, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadActiveQuests: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const quests = await questRepository.findActive(characterId);
      set({ quests, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadQuestsByCategory: async (characterId, category) => {
    set({ isLoading: true, error: null });
    try {
      const quests = await questRepository.findByCategory(characterId, category);
      set({ quests, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createQuest: async (quest) => {
    set({ isLoading: true, error: null });
    try {
      await questRepository.create(quest);
      set((state) => ({
        quests: [...state.quests, quest],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveQuest: async (quest) => {
    set({ isLoading: true, error: null });
    try {
      await questRepository.update(quest);
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === quest.id ? quest : q
        ),
        currentQuest:
          state.currentQuest?.id === quest.id
            ? quest
            : state.currentQuest,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeQuest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await questRepository.delete(id);
      set((state) => ({
        quests: state.quests.filter((q) => q.id !== id),
        currentQuest: state.currentQuest?.id === id ? null : state.currentQuest,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Queries
  getQuestsByCharacterId: (characterId) => {
    const { quests } = get();
    return quests.filter((quest) => quest.characterId === characterId);
  },

  getQuestsByStatus: (status) => {
    const { quests } = get();
    return quests.filter((quest) => quest.status === status);
  },

  getActiveQuests: (characterId) => {
    const { quests } = get();
    return quests.filter(
      (quest) =>
        quest.characterId === characterId &&
        (quest.status === 'in_progress' || quest.status === 'not_started')
    );
  },

  getCompletedQuests: (characterId) => {
    const { quests } = get();
    return quests.filter(
      (quest) =>
        quest.characterId === characterId && quest.status === 'completed'
    );
  },
}));
