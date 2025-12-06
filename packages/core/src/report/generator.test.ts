import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportGenerator } from './generator';
import type { LLMManager } from '../llm/manager';
import type { Diary } from '../types/diary';
import type { Quest } from '../types/quest';
import type { Character } from '../types/character';

// Mock LLMManager
const mockLLMManager = {
    generateForFeature: vi.fn().mockResolvedValue({ text: '素晴らしい成長です！' }),
} as unknown as LLMManager;

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;

    const mockCharacter: Character = {
        id: 'char_1',
        userId: 'user_1',
        basicInfo: {
            name: 'Hero',
            class: 'Warrior',
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

    const mockDiaries: Diary[] = [
        {
            id: 'diary_1',
            userId: 'user_1',
            date: '2023-01-01',
            content: 'Day 1',
            convertedContent: 'Day 1 story',
            images: [],
            tags: [],
            mood: 'happy',
            weather: 'sunny',
            metadata: { wordCount: 100, characterCount: 500, isStreak: true, streakCount: 1 },
            emotionAnalysis: { primary: 'joy', overallSentiment: 'positive', sentimentScore: 0.8, scores: { joy: 80 } },
            rewards: { exp: 10, gold: 5, items: [] },
            events: [],
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            status: 'converted',
        },
        {
            id: 'diary_2',
            userId: 'user_1',
            date: '2023-01-02',
            content: 'Day 2',
            convertedContent: 'Day 2 story',
            images: [],
            tags: [],
            mood: 'sad',
            weather: 'rainy',
            metadata: { wordCount: 50, characterCount: 250, isStreak: true, streakCount: 2 },
            emotionAnalysis: { primary: 'sadness', overallSentiment: 'negative', sentimentScore: -0.5, scores: { sadness: 60 } },
            rewards: { exp: 20, gold: 10, items: [] },
            events: [],
            createdAt: new Date('2023-01-02'),
            updatedAt: new Date('2023-01-02'),
            status: 'converted',
        },
    ];

    const mockQuests: Quest[] = [
        {
            id: 'quest_1',
            characterId: 'char_1',
            title: 'Quest 1',
            description: 'Desc',
            category: 'one_time',
            difficulty: 'easy',
            status: 'completed',
            progress: { current: 1, target: 1, unit: 'pt' },
            deadline: null,
            startDate: new Date(),
            completedAt: new Date(),
            reward: { exp: 100, gold: 50, items: [] },
            subtasks: [],
            recurring: { enabled: false, interval: 'daily', endDate: null },
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'quest_2',
            characterId: 'char_1',
            title: 'Quest 2',
            description: 'Desc',
            category: 'daily',
            difficulty: 'normal',
            status: 'in_progress',
            progress: { current: 0, target: 1, unit: 'pt' },
            deadline: null,
            startDate: new Date(),
            completedAt: null,
            reward: { exp: 200, gold: 100, items: [] },
            subtasks: [],
            recurring: { enabled: true, interval: 'daily', endDate: null },
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    beforeEach(() => {
        reportGenerator = new ReportGenerator(mockLLMManager);
        vi.clearAllMocks();
    });

    describe('generateReport', () => {
        it('should generate a weekly report', async () => {
            const report = await reportGenerator.generateReport({
                type: 'weekly',
                startDate: '2023-01-01',
                endDate: '2023-01-07',
                diaries: mockDiaries,
                quests: mockQuests,
                character: mockCharacter,
            });

            expect(report).toBeDefined();
            expect(report.type).toBe('weekly');
            expect(report.diaryStats.totalCount).toBe(2);
            expect(report.diaryStats.totalWordsWritten).toBe(150);
            expect(report.diaryStats.longestStreak).toBe(2); // 2 consecutive days

            expect(report.emotionStats.mostCommon).toBe('joy'); // Or sadness, tie-breaking might vary but logic is there
            expect(report.emotionStats.positiveRatio).toBe(50);
            expect(report.emotionStats.negativeRatio).toBe(50);

            expect(report.characterGrowth.expGained).toBe(30);
            expect(report.characterGrowth.goldEarned).toBe(15);

            expect(report.questStats.completed).toBe(1);
            expect(report.questStats.inProgress).toBe(1);
            expect(report.questStats.completionRate).toBe(100); // 1 completed / (1 completed + 0 failed) * 100

            expect(report.charts.writingFrequency.labels).toHaveLength(7); // 7 days
        });

        it('should generate a monthly report', async () => {
            const report = await reportGenerator.generateReport({
                type: 'monthly',
                startDate: '2023-01-01',
                endDate: '2023-01-31',
                diaries: mockDiaries,
                quests: mockQuests,
                character: mockCharacter,
            });

            expect(report.type).toBe('monthly');
            // Monthly report charts group by week
            expect(report.charts.writingFrequency.labels.length).toBeGreaterThanOrEqual(4);
        });
    });
});
