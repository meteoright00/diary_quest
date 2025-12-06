import { create } from 'zustand';
import type { Story } from '@diary-quest/core/types';
import { storyRepository } from '@/repositories';

interface StoryState {
  // State
  stories: Story[];
  currentStory: Story | null;
  isLoading: boolean;
  error: string | null;

  // Basic Actions (state only)
  setStories: (stories: Story[]) => void;
  setCurrentStory: (story: Story | null) => void;
  addStory: (story: Story) => void;
  deleteStory: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Repository Actions (DB + state)
  loadStory: (id: string) => Promise<void>;
  loadStoriesByCharacter: (characterId: string) => Promise<void>;
  createStory: (story: Story) => Promise<void>;
  removeStory: (id: string) => Promise<void>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  // Initial state
  stories: [],
  currentStory: null,
  isLoading: false,
  error: null,

  // Actions
  setStories: (stories) => set({ stories }),

  setCurrentStory: (story) => set({ currentStory: story }),

  addStory: (story) =>
    set((state) => ({
      stories: [...state.stories, story],
    })),

  deleteStory: (id) =>
    set((state) => ({
      stories: state.stories.filter((s) => s.id !== id),
      currentStory: state.currentStory?.id === id ? null : state.currentStory,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Repository actions
  loadStory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const story = await storyRepository.findById(id);
      set({ currentStory: story, isLoading: false });
    } catch (error) {
      console.error('Failed to load story:', error);
      set({ error: 'ストーリーの読み込みに失敗しました', isLoading: false });
    }
  },

  loadStoriesByCharacter: async (characterId: string) => {
    set({ isLoading: true, error: null });
    try {
      const stories = await storyRepository.findByCharacterId(characterId);
      set({ stories, isLoading: false });
    } catch (error) {
      console.error('Failed to load stories:', error);
      set({ error: 'ストーリーの読み込みに失敗しました', isLoading: false });
    }
  },

  createStory: async (story: Story) => {
    set({ isLoading: true, error: null });
    try {
      await storyRepository.create(story);
      get().addStory(story);
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to create story:', error);
      set({ error: 'ストーリーの保存に失敗しました', isLoading: false });
      throw error;
    }
  },

  removeStory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await storyRepository.delete(id);
      get().deleteStory(id);
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to delete story:', error);
      set({ error: 'ストーリーの削除に失敗しました', isLoading: false });
      throw error;
    }
  },
}));
