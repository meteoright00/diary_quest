import { describe, it, expect, beforeEach } from 'vitest';
import { QuestManager } from './manager';


describe('QuestManager', () => {
    let questManager: QuestManager;
    const characterId = 'char_123';

    beforeEach(() => {
        questManager = new QuestManager();
    });

    describe('createQuest', () => {
        it('should create a quest with default values', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Test Quest',
                description: 'This is a test quest',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            expect(quest.id).toBeDefined();
            expect(quest.characterId).toBe(characterId);
            expect(quest.title).toBe('Test Quest');
            expect(quest.description).toBe('This is a test quest');
            expect(quest.difficulty).toBe('easy');
            expect(quest.status).toBe('not_started');
            expect(quest.progress.current).toBe(0);
            expect(quest.progress.target).toBe(1);
            expect(quest.reward.exp).toBeDefined();
            expect(quest.reward.gold).toBeDefined();
            expect(quest.reward.items).toEqual([]);
            expect(quest.createdAt).toBeInstanceOf(Date);
            expect(quest.updatedAt).toBeInstanceOf(Date);
        });

        it('should create a quest with custom options', () => {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            const quest = questManager.createQuest({
                characterId,
                title: 'Custom Quest',
                description: 'Custom description',
                difficulty: 'legendary',
                rewardExp: 1000,
                rewardGold: 500,
                deadline,
                recurring: { enabled: true, interval: 'daily' },
                targetCount: 10,
                unit: 'pt',
                category: 'daily',
            });

            expect(quest.difficulty).toBe('legendary');
            expect(quest.deadline).toBe(deadline);
            expect(quest.recurring.enabled).toBe(true);
            expect(quest.recurring.interval).toBe('daily');
            expect(quest.progress.target).toBe(10);
        });
    });

    describe('updateProgress', () => {
        it('should update quest progress', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Progress Quest',
                description: 'Test progress',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 10,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'in_progress';
            // Set createdAt to past to ensure update is newer
            quest.createdAt = new Date(Date.now() - 1000);

            const success = questManager.updateProgress(quest, 5);

            expect(success).toBe(false);
            expect(quest.progress.current).toBe(5);
            expect(quest.updatedAt.getTime()).toBeGreaterThan(quest.createdAt.getTime());
        });

        it('should not exceed target progress', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Max Progress Quest',
                description: 'Test max progress',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 10,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'in_progress';
            questManager.updateProgress(quest, 15);

            expect(quest.progress.current).toBe(10);
        });

        it('should automatically complete quest when target reached', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Auto Complete Quest',
                description: 'Test auto complete',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 10,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'in_progress';
            const completed = questManager.updateProgress(quest, 10);

            expect(completed).toBe(true);
            expect(quest.status).toBe('completed');
            expect(quest.completedAt).toBeDefined();
        });
    });

    describe('addSubtask', () => {
        it('should add a subtask to the quest', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Subtask Quest',
                description: 'Test subtask',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            const subtask = questManager.addSubtask(quest, 'Subtask 1', 'Description 1');

            expect(quest.subtasks).toHaveLength(1);
            expect(quest.subtasks[0]).toEqual(subtask);
            expect(subtask.title).toBe('Subtask 1');
            expect(subtask.completed).toBe(false);
        });
    });

    describe('completeSubtask', () => {
        it('should mark subtask as completed', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Complete Subtask Quest',
                description: 'Test completion',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            const subtask = questManager.addSubtask(quest, 'Subtask 1', 'Description 1');

            const result = questManager.completeSubtask(quest, subtask.id);
            expect(result).toBe(true);
            expect(quest.subtasks[0].completed).toBe(true);
            expect(quest.subtasks[0].completedAt).toBeInstanceOf(Date);
        });

        it('should return false for non-existent subtask', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Missing Subtask Quest',
                description: 'Test missing',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            const result = questManager.completeSubtask(quest, 'non-existent-id');
            expect(result).toBe(false);
        });

        it('should return false if subtask is already completed', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Already Completed Subtask Quest',
                description: 'Test already completed',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            const subtask = questManager.addSubtask(quest, 'Subtask 1', 'Description 1');
            questManager.completeSubtask(quest, subtask.id);

            const result = questManager.completeSubtask(quest, subtask.id);
            expect(result).toBe(false);
        });
    });

    describe('completeQuest', () => {
        it('should mark quest as completed', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Complete Quest',
                description: 'Test completion',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'in_progress';
            questManager.completeQuest(quest);

            expect(quest.status).toBe('completed');
            expect(quest.completedAt).toBeInstanceOf(Date);
        });

        it('should not complete if not in progress', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Already Completed Quest',
                description: 'Test error',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'completed';
            const originalCompletedAt = new Date();
            quest.completedAt = originalCompletedAt;

            questManager.completeQuest(quest);

            expect(quest.status).toBe('completed');
            expect(quest.completedAt).toBe(originalCompletedAt);
        });
    });

    describe('failQuest', () => {
        it('should mark quest as failed', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Fail Quest',
                description: 'Test failure',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'in_progress';
            questManager.failQuest(quest);

            expect(quest.status).toBe('failed');
            expect(quest.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('expireQuest', () => {
        it('should mark quest as expired if in progress or not started', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Expire Quest',
                description: 'Test expiration',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            questManager.expireQuest(quest);
            expect(quest.status).toBe('expired');

            quest.status = 'in_progress';
            questManager.expireQuest(quest);
            expect(quest.status).toBe('expired');
        });

        it('should not expire completed or failed quests', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'No Expire Quest',
                description: 'Test no expiration',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            quest.status = 'completed';
            questManager.expireQuest(quest);
            expect(quest.status).toBe('completed');

            quest.status = 'failed';
            questManager.expireQuest(quest);
            expect(quest.status).toBe('failed');
        });
    });

    describe('resetRecurringQuest', () => {
        it('should reset a recurring quest', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Recurring Quest',
                description: 'Test recurring',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                recurring: { enabled: true, interval: 'daily' },
                targetCount: 1,
                unit: 'pt',
                category: 'daily',
            });

            quest.status = 'completed';
            quest.progress.current = 10;
            quest.completedAt = new Date();

            const newQuest = questManager.resetRecurringQuest(quest);

            expect(newQuest.id).not.toBe(quest.id);
            expect(newQuest.status).toBe('not_started');
            expect(newQuest.progress.current).toBe(0);
            expect(newQuest.completedAt).toBeNull();
            expect(newQuest.startDate).toBeNull();
        });

        it('should throw error if quest is not recurring', () => {
            const quest = questManager.createQuest({
                characterId,
                title: 'Non-Recurring Quest',
                description: 'Test error',
                difficulty: 'easy',
                rewardExp: 100,
                rewardGold: 50,
                recurring: { enabled: false, interval: 'daily' },
                targetCount: 1,
                unit: 'pt',
                category: 'one_time',
            });

            expect(() => questManager.resetRecurringQuest(quest)).toThrow('Quest is not recurring');
        });
    });
});
