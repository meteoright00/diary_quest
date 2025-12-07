import { create } from 'zustand';
import type { World, WorldSettings } from '@diary-quest/core/types';
import { worldRepository } from '@/repositories';
import { generateId } from '@diary-quest/shared';

interface WorldState {
    // State
    currentWorld: World | null;
    worlds: World[];
    isLoading: boolean;
    error: string | null;

    // Actions
    initializeWorld: (settings: WorldSettings, id?: string) => Promise<World>;
    loadWorld: (id: string) => Promise<void>;
    loadWorlds: () => Promise<void>;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
    // Initial state
    currentWorld: null,
    worlds: [],
    isLoading: false,
    error: null,

    // Actions
    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    initializeWorld: async (settings: WorldSettings, id?: string) => {
        set({ isLoading: true, error: null });
        try {
            // Check if world with this settings name already exists to avoid duplicates if possible?
            // Or just assume if ID is provided, use it.

            let world: World | null = null;
            if (id) {
                // Try to find existing
                const existing = await worldRepository.findById(id);
                if (existing) {
                    world = existing;
                    // Update settings if needed? For now just use existing.
                    // If it's a built-in world, might need to update if we want to sync settings changes?
                    // But usually initializing implies "Selecting this world".
                }
            }

            if (!world) {
                // Create new world entity
                const now = new Date();
                world = {
                    id: id || generateId(),
                    name: settings.worldInfo.name,
                    description: settings.worldInfo.characteristics, // Use characteristics as desc
                    category: 'fantasy', // Default, maybe derive from settings?
                    settingsFilePath: '', // Not strictly used for DB-only worlds yet
                    settings: settings,
                    isBuiltIn: false, // Default to false unless validated otherwise
                    createdBy: null,
                    usageCount: 1,
                    lastUsedAt: now,
                    createdAt: now,
                    updatedAt: now,
                };

                // If it's one of the presets, we might want to flag isBuiltIn?
                // But for now, just saving it is enough to satisfy FK.
                // Check if a world with this name already exists?
                // Let's rely on logic similar to character creation: just create it.
                // BUT, if multiple users select "Fantasy", do we create multiple "Fantasy" worlds defined in DB?
                // Ideally, yes, or we reuse one.
                // For simplicity: reuse if ID provided (which WelcomePage should do from presets), create if custom.

                // If valid ID was passed but not found, create with that ID (likely built-in ID)
                if (id) {
                    world.isBuiltIn = true; // Assumption: if we passed an ID, it's a preset
                }

                await worldRepository.create(world);
            } else {
                // Just update usage
                await worldRepository.incrementUsageCount(world.id);
                world.usageCount++;
                world.lastUsedAt = new Date();
            }

            set({ currentWorld: world, isLoading: false });
            return world;
        } catch (error) {
            console.error('Failed to initialize world:', error);
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    loadWorld: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const world = await worldRepository.findById(id);
            set({ currentWorld: world, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    loadWorlds: async () => {
        set({ isLoading: true, error: null });
        try {
            const worlds = await worldRepository.findAll();
            set({ worlds, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },
}));
