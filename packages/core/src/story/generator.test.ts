import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryGenerator } from './generator';
import type { LLMManager } from '../llm/manager';
import type { Diary } from '../types/diary';
import type { Character } from '../types/character';
import type { World } from '../types/world';

// Mock LLMManager
const mockLLMManager = {
    generateForFeature: vi.fn().mockResolvedValue({ text: '## 第1章: 冒険の始まり\n\nこれはテストの物語です。' }),
} as unknown as LLMManager;

describe('StoryGenerator', () => {
    let storyGenerator: StoryGenerator;

    const mockCharacter: Character = {
        id: 'char_1',
        userId: 'user_1',
        basicInfo: {
            name: 'Hero',
            class: 'Warrior',
            race: 'Human',
            gender: 'Male',
            age: 20,
            background: 'None',
            personality: 'Brave',
            appearance: 'Tall',
        },
        status: {
            level: 1,
            exp: 0,
            hp: 100,
            mp: 50,
            maxHp: 100,
            maxMp: 50,
            strength: 10,
            intelligence: 10,
            dexterity: 10,
            agility: 10,
            luck: 10,
            vitality: 10,
            wisdom: 10,
            charisma: 10,
        },
        equipment: {
            weapon: null,
            armor: null,
            accessory: null,
        },
        inventory: [],
        quests: [],
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockWorld: World = {
        id: 'world_1',
        name: 'Fantasy World',
        description: 'A magical place',
        settings: {
            difficulty: 'normal',
            theme: 'fantasy',
            tone: 'serious',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockDiaries: Diary[] = [
        {
            id: 'diary_1',
            userId: 'user_1',
            date: '2023-01-01',
            content: 'Today I started my journey.',
            convertedContent: 'The hero began their quest.',
            images: [],
            tags: [],
            mood: 'happy',
            weather: 'sunny',
            rewards: { exp: 10, gold: 5, items: [] },
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            status: 'converted',
        },
        {
            id: 'diary_2',
            userId: 'user_1',
            date: '2023-01-02',
            content: 'I fought a slime.',
            convertedContent: 'The hero battled a slime.',
            images: [],
            tags: [],
            mood: 'excited',
            weather: 'cloudy',
            rewards: { exp: 20, gold: 10, items: [] },
            createdAt: new Date('2023-01-02'),
            updatedAt: new Date('2023-01-02'),
            status: 'converted',
        },
    ];

    beforeEach(() => {
        storyGenerator = new StoryGenerator(mockLLMManager);
        vi.clearAllMocks();
    });

    describe('generateStory', () => {
        it('should generate a story from diaries', async () => {
            const story = await storyGenerator.generateStory({
                diaries: mockDiaries,
                character: mockCharacter,
                world: mockWorld,
            });

            expect(story).toBeDefined();
            expect(story.id).toBeDefined();
            expect(story.chapters).toHaveLength(1); // 2 diaries < 5 per chapter -> 1 group -> 1 chapter
            expect(story.chapters[0].title).toBe('冒険の始まり');
            expect(story.characterGrowth.expGained).toBe(30); // 10 + 20
            expect(story.includedDiaries).toHaveLength(2);
            expect(story.period.start).toBe('2023-01-01');
            expect(story.period.end).toBe('2023-01-02');
        });

        it('should throw error if no diaries provided', async () => {
            await expect(storyGenerator.generateStory({
                diaries: [],
                character: mockCharacter,
                world: mockWorld,
            })).rejects.toThrow('No diaries provided');
        });

        it('should use provided title if available', async () => {
            const story = await storyGenerator.generateStory({
                diaries: mockDiaries,
                character: mockCharacter,
                world: mockWorld,
                title: 'My Epic Saga',
            });

            expect(story.title).toBe('My Epic Saga');
        });

        it('should generate default title if not provided', async () => {
            const story = await storyGenerator.generateStory({
                diaries: mockDiaries,
                character: mockCharacter,
                world: mockWorld,
            });

            // 2023-01-01 to 2023-01-02 -> Same month
            expect(story.title).toBe('2023年1月の冒険記');
        });

        it('should extract highlights', async () => {
            // Mock extractHighlights behavior by ensuring convertedContent has suitable sentences
            // The implementation splits by [。！？] and checks length > 20 && length < 100
            const longDiary: Diary = {
                ...mockDiaries[0],
                convertedContent: 'これはハイライトとして抽出されるべき十分に長い文章です。短すぎず長すぎない適切な長さを持っています。',
            };

            const story = await storyGenerator.generateStory({
                diaries: [longDiary],
                character: mockCharacter,
                world: mockWorld,
            });

            expect(story.highlights).toContain('これはハイライトとして抽出されるべき十分に長い文章です');
        });
    });
});
