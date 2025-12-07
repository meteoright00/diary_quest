import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportGenerator } from './generator';
import type { LLMManager } from '../llm/manager';
import type { Diary } from '../types/diary';
import type { Quest } from '../types/quest';
import type { Character } from '../types/character';

// Mock ExpCalculator
vi.mock('../character/exp-calculator', () => {
    return {
        ExpCalculator: class {
            calculateExpForNextLevel(level: number) {
                return 100 * level; // Simple formula for testing: level 1->2 needs 100, 2->3 needs 200
            }
        }
    };
});

// Mock LLMManager
const mockLLMManager = {
    generateForFeature: vi.fn().mockResolvedValue({ text: '素晴らしい成長です！' }),
} as unknown as LLMManager;

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;

    const mockCharacter: Character = {
        id: 'char_1',
        worldId: 'world_1',
        basicInfo: {
            name: 'Hero',
            class: 'Warrior',
            title: 'Novice',
            guild: 'None',
        },
        level: {
            current: 2,

            // This implies `character.level.exp` is RELATIVE (exp into current level).
            // Let's assume RELATIVE for this test data.
            exp: 50, // 50 into level 2.
            expToNextLevel: 200,
        },
        stats: {
            hp: { current: 100, max: 100 },
            mp: { current: 50, max: 50 },
            stamina: { current: 100, max: 100 },
            attack: 10,
            defense: 10,
            magic: 10,
            magicDefense: 10,
            agility: 10,
            luck: 10,
        },
        equipment: {
            weapon: null,
            armor: null,
            accessory: null,
        },
        inventory: [],
        questLog: [],
        skills: [],
        titles: [],
        achievements: [],
        currency: { gold: 100, silver: 0 },
        statistics: {
            totalDiaries: 0,
            consecutiveDays: 0,
            longestStreak: 0,
            totalWordsWritten: 0,
            totalExpEarned: 0,
            timesLeveledUp: 0,
            skillsUnlocked: 0,
            achievementsUnlocked: 0,
        },
        nameMappings: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-07'),
    };

    const mockDiaries: Diary[] = [
        {
            id: 'diary_1',
            characterId: 'char_1',
            worldId: 'world_1',
            date: '2023-01-01',
            originalContent: 'Day 1',
            convertedContent: 'Day 1 story',
            tags: [],
            metadata: { wordCount: 100, characterCount: 500, isStreak: true, streakCount: 1 },
            emotionAnalysis: {
                primary: 'joy',
                secondary: null,
                overallSentiment: 'positive',
                sentimentScore: 0.8,
                scores: {
                    joy: 80,
                    sadness: 0,
                    anger: 0,
                    anxiety: 0,
                    calm: 0,
                    excitement: 0,
                    fatigue: 0
                },
                encouragementMessage: null,
                recommendedDiaries: []
            },
            rewards: { exp: 60, gold: 5, items: [] }, // 60 EXP
            events: [],
            isFavorite: false,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
        },
        {
            id: 'diary_2',
            characterId: 'char_1',
            worldId: 'world_1',
            date: '2023-01-02',
            originalContent: 'Day 2',
            convertedContent: 'Day 2 story',
            tags: [],
            metadata: { wordCount: 50, characterCount: 250, isStreak: true, streakCount: 2 },
            emotionAnalysis: {
                primary: 'sadness',
                secondary: null,
                overallSentiment: 'negative',
                sentimentScore: -0.5,
                scores: {
                    joy: 0,
                    sadness: 60,
                    anger: 0,
                    anxiety: 0,
                    calm: 0,
                    excitement: 0,
                    fatigue: 0
                },
                encouragementMessage: null,
                recommendedDiaries: []
            },
            rewards: { exp: 60, gold: 10, items: [] }, // 60 EXP
            events: [],
            isFavorite: false,
            createdAt: new Date('2023-01-02'),
            updatedAt: new Date('2023-01-02'),
        },
    ];
    // Total EXP from diaries: 120.
    // Character is Level 2 (Exp 50).
    // Level 1->2 cost 100.
    // Total Current Exp (Cumulative) = 100 (lvl1) + 50 (current) = 150.
    // Start Period Exp = 150 - 120 = 30.
    // Level 1 starts at 0. Exp 30 is Level 1.
    // So Start Level = 1.
    // End Level = 2.
    // Level Gain = 1.

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
            startDate: new Date('2023-01-01'),
            completedAt: new Date('2023-01-01'), // Inside period
            reward: { exp: 100, gold: 50, items: [] },
            subtasks: [],
            recurring: { enabled: false, interval: 'daily', endDate: null },
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
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
            startDate: new Date('2023-01-02'),
            completedAt: null,
            reward: { exp: 200, gold: 100, items: [] },
            subtasks: [],
            recurring: { enabled: true, interval: 'daily', endDate: null },
            createdAt: new Date('2023-01-02'), // Inside period
            updatedAt: new Date('2023-01-02'),
        },
        {
            id: 'quest_3',
            characterId: 'char_1',
            title: 'Late Quest',
            description: 'Created after period',
            category: 'one_time',
            difficulty: 'easy',
            status: 'in_progress',
            progress: { current: 0, target: 1, unit: 'pt' },
            deadline: null,
            startDate: new Date('2023-02-01'),
            completedAt: null,
            reward: { exp: 100, gold: 0, items: [] },
            subtasks: [],
            recurring: { enabled: false, interval: 'daily', endDate: null },
            createdAt: new Date('2023-02-01'), // After period
            updatedAt: new Date('2023-02-01'),
        },
        {
            id: 'quest_4',
            characterId: 'char_1',
            title: 'Future Completed Quest',
            description: 'Completed after period',
            category: 'one_time',
            difficulty: 'easy',
            status: 'completed',
            progress: { current: 1, target: 1, unit: 'pt' },
            deadline: null,
            startDate: new Date('2023-01-01'),
            completedAt: new Date('2023-02-01'), // Completed AFTER period
            reward: { exp: 100, gold: 0, items: [] },
            subtasks: [],
            recurring: { enabled: false, interval: 'daily', endDate: null },
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-02-01'),
        }
    ];

    beforeEach(() => {
        reportGenerator = new ReportGenerator(mockLLMManager);
        vi.clearAllMocks();
    });

    describe('generateReport', () => {
        it('should generate a weekly report with correct stats', async () => {
            const report = await reportGenerator.generateReport({
                type: 'weekly',
                startDate: '2023-01-01',
                endDate: '2023-01-07',
                diaries: mockDiaries,
                quests: mockQuests, // Pass all, logic should filter/classify
                character: mockCharacter,
            });

            expect(report).toBeDefined();
            expect(report.type).toBe('weekly');
            expect(report.diaryStats.totalCount).toBe(2);
            expect(report.diaryStats.totalWordsWritten).toBe(150);

            // Character Growth Check
            // Diaries gave 120 EXP.
            // Lvl 1->2 needs 100.
            // Start was (Current 150 - 120 = 30) => Level 1.
            // End is Level 2.
            // Gain should be 1.
            expect(report.characterGrowth.expGained).toBe(120);
            expect(report.characterGrowth.levelsGained).toBe(1);

            // Quest Stats Check
            // quest_1: Completed inside period -> completed
            // quest_2: In progress inside period -> in_progress
            // quest_3: Created after period -> Should be excluded (Wait, confirm logic filters "createdAt")
            //          The implementation logic I wrote in calculateQuestStats does NOT filter by createdAt itself, 
            //          it assumes the caller filtered irrelevant quests OR it checks dates?
            //          My implementation:
            //          if (createdAt <= end) { inProgress++ }
            //          So quest_3 (Feb 1) > Jan 7. strict check.
            //          So quest_3 should NOT count.
            // quest_4: Completed AFTER period.
            //          My implementation:
            //          if (completedAt <= end) { completed++ }
            //          Feb 1 > Jan 7 -> False.
            //          Default: falls through to `createdAt` check.
            //          createdAt (Jan 1) <= end (Jan 7) -> True.
            //          So quest_4 should be counted as 'in_progress'. 

            expect(report.questStats.completed).toBe(1); // quest_1 only
            expect(report.questStats.inProgress).toBe(2); // quest_2 and quest_4
            expect(report.questStats.completionRate).toBe(100); // 1 completed / (1 + 0 failed) * 100?
            // Wait, denominator is total = completed + failed.
            // So 1 / (1 + 0) = 1 = 100%. In Progress is not in denominator usually?
            // Implementation: const total = completed + failed;
            // Yes.
        });

        it('should include character name in LLM prompt', async () => {
            await reportGenerator.generateReport({
                type: 'weekly',
                startDate: '2023-01-01',
                endDate: '2023-01-07',
                diaries: mockDiaries,
                quests: mockQuests,
                character: mockCharacter,
            });

            const generateMock = mockLLMManager.generateForFeature as unknown as ReturnType<typeof vi.fn>;
            const callArgs = generateMock.mock.calls[0];
            const prompt = callArgs[1];
            expect(prompt).toContain('冒険者名: Hero');
            expect(prompt).toContain('レベル上昇: 1');
        });

        it('should include rewards from random events in character growth', async () => {
            const diaryWithEvent: Diary = {
                ...mockDiaries[0],
                id: 'diary_event',
                date: '2023-01-03',
                rewards: { exp: 50, gold: 10, items: [] },
                events: [
                    {
                        id: 'event_1',
                        type: 'exp_bonus',
                        rarity: 'common',
                        triggeredAt: new Date('2023-01-03'),
                        title: 'Found a treasure',
                        description: 'You found a small chest.',
                        rewards: {
                            exp: 100,
                            gold: 50
                        }
                    }
                ]
            };

            const report = await reportGenerator.generateReport({
                type: 'weekly',
                startDate: '2023-01-03',
                endDate: '2023-01-03',
                diaries: [diaryWithEvent],
                quests: [],
                character: mockCharacter,
            });

            // Expected: Diary EXP (50) + Event EXP (100) = 150
            expect(report.characterGrowth.expGained).toBe(150);

            // Expected: Diary Gold (10) + Event Gold (50) = 60
            expect(report.characterGrowth.goldEarned).toBe(60);
        });
    });
});
