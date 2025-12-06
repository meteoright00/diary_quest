import { create } from 'zustand';
import type { Character } from '@diary-quest/core/types';
import { characterRepository } from '@/repositories';

interface CharacterState {
  // State
  currentCharacter: Character | null;
  characters: Character[];
  isLoading: boolean;
  error: string | null;

  // Basic Actions (state only)
  setCurrentCharacter: (character: Character | null) => void;
  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Repository Actions (DB + state)
  loadCharacter: (id: string) => Promise<void>;
  loadCharacters: () => Promise<void>;
  loadCharactersByWorld: (worldId: string) => Promise<void>;
  createCharacter: (character: Character) => Promise<void>;
  saveCharacter: (character: Character) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;

  // Computed
  getCurrentLevel: () => number;
  getCurrentExp: () => number;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  // Initial state
  currentCharacter: null,
  characters: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentCharacter: (character) => set({ currentCharacter: character }),

  setCharacters: (characters) => set({ characters }),

  addCharacter: (character) =>
    set((state) => ({
      characters: [...state.characters, character],
    })),

  updateCharacter: (id, updates) =>
    set((state) => ({
      characters: state.characters.map((char) =>
        char.id === id ? { ...char, ...updates } : char
      ),
      currentCharacter:
        state.currentCharacter?.id === id
          ? { ...state.currentCharacter, ...updates }
          : state.currentCharacter,
    })),

  deleteCharacter: (id) =>
    set((state) => ({
      characters: state.characters.filter((char) => char.id !== id),
      currentCharacter:
        state.currentCharacter?.id === id ? null : state.currentCharacter,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Repository Actions
  loadCharacter: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const character = await characterRepository.findById(id);
      set({ currentCharacter: character, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadCharacters: async () => {
    set({ isLoading: true, error: null });
    try {
      const characters = await characterRepository.findAll();
      set({ characters, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadCharactersByWorld: async (worldId) => {
    set({ isLoading: true, error: null });
    try {
      const characters = await characterRepository.findByWorldId(worldId);
      set({ characters, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createCharacter: async (character) => {
    set({ isLoading: true, error: null });
    try {
      await characterRepository.create(character);
      set((state) => ({
        characters: [...state.characters, character],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveCharacter: async (character) => {
    try {
      await characterRepository.update(character);
      set((state) => ({
        characters: state.characters.map((char) =>
          char.id === character.id ? character : char
        ),
        currentCharacter:
          state.currentCharacter?.id === character.id
            ? character
            : state.currentCharacter,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeCharacter: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await characterRepository.delete(id);
      set((state) => ({
        characters: state.characters.filter((char) => char.id !== id),
        currentCharacter:
          state.currentCharacter?.id === id ? null : state.currentCharacter,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Computed
  getCurrentLevel: () => {
    const character = get().currentCharacter;
    return character?.level.current ?? 1;
  },

  getCurrentExp: () => {
    const character = get().currentCharacter;
    return character?.level.exp ?? 0;
  },
}));
