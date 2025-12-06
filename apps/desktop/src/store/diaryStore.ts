import { create } from 'zustand';
import type { Diary } from '@diary-quest/core/types';
import { diaryRepository } from '@/repositories';

interface DiaryState {
  // State
  diaries: Diary[];
  currentDiary: Diary | null;
  isLoading: boolean;
  error: string | null;

  // Basic Actions (state only)
  setDiaries: (diaries: Diary[]) => void;
  setCurrentDiary: (diary: Diary | null) => void;
  addDiary: (diary: Diary) => void;
  updateDiary: (id: string, updates: Partial<Diary>) => void;
  deleteDiary: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Repository Actions (DB + state)
  loadDiary: (id: string) => Promise<void>;
  loadDiariesByCharacter: (characterId: string) => Promise<void>;
  loadDiariesByDateRange: (characterId: string, startDate: string, endDate: string) => Promise<void>;
  loadDiaryByDate: (characterId: string, date: string) => Promise<void>;
  createDiary: (diary: Diary) => Promise<void>;
  saveDiary: (diary: Diary) => Promise<void>;
  removeDiary: (id: string) => Promise<void>;

  // Queries
  getDiariesByDateRange: (startDate: Date, endDate: Date) => Diary[];
  getDiariesByCharacterId: (characterId: string) => Diary[];
  getTodayDiary: (characterId: string) => Diary | null;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  // Initial state
  diaries: [],
  currentDiary: null,
  isLoading: false,
  error: null,

  // Actions
  setDiaries: (diaries) => set({ diaries }),

  setCurrentDiary: (diary) => set({ currentDiary: diary }),

  addDiary: (diary) =>
    set((state) => ({
      diaries: [...state.diaries, diary],
    })),

  updateDiary: (id, updates) =>
    set((state) => ({
      diaries: state.diaries.map((diary) =>
        diary.id === id ? { ...diary, ...updates } : diary
      ),
      currentDiary:
        state.currentDiary?.id === id
          ? { ...state.currentDiary, ...updates }
          : state.currentDiary,
    })),

  deleteDiary: (id) =>
    set((state) => ({
      diaries: state.diaries.filter((diary) => diary.id !== id),
      currentDiary: state.currentDiary?.id === id ? null : state.currentDiary,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Repository Actions
  loadDiary: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const diary = await diaryRepository.findById(id);
      set({ currentDiary: diary, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadDiariesByCharacter: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const diaries = await diaryRepository.findByCharacterId(characterId);
      set({ diaries, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadDiariesByDateRange: async (characterId, startDate, endDate) => {
    set({ isLoading: true, error: null });
    try {
      const diaries = await diaryRepository.findByDateRange(characterId, startDate, endDate);
      set({ diaries, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadDiaryByDate: async (characterId, date) => {
    set({ isLoading: true, error: null });
    try {
      const diary = await diaryRepository.findByDate(characterId, date);
      set({ currentDiary: diary, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createDiary: async (diary) => {
    set({ isLoading: true, error: null });
    try {
      await diaryRepository.create(diary);
      set((state) => ({
        diaries: [...state.diaries, diary],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveDiary: async (diary) => {
    set({ isLoading: true, error: null });
    try {
      await diaryRepository.update(diary);
      set((state) => ({
        diaries: state.diaries.map((d) =>
          d.id === diary.id ? diary : d
        ),
        currentDiary:
          state.currentDiary?.id === diary.id
            ? diary
            : state.currentDiary,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeDiary: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await diaryRepository.delete(id);
      set((state) => ({
        diaries: state.diaries.filter((d) => d.id !== id),
        currentDiary: state.currentDiary?.id === id ? null : state.currentDiary,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Queries
  getDiariesByDateRange: (startDate, endDate) => {
    const { diaries } = get();
    return diaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      return diaryDate >= startDate && diaryDate <= endDate;
    });
  },

  getDiariesByCharacterId: (characterId) => {
    const { diaries } = get();
    return diaries.filter((diary) => diary.characterId === characterId);
  },

  getTodayDiary: (characterId) => {
    const { diaries } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      diaries.find((diary) => {
        const diaryDate = new Date(diary.date);
        diaryDate.setHours(0, 0, 0, 0);
        return (
          diary.characterId === characterId &&
          diaryDate.getTime() === today.getTime()
        );
      }) ?? null
    );
  },
}));
