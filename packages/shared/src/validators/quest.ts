/**
 * Quest validation schemas
 */

import { z } from 'zod';
import { VALIDATION_LIMITS } from '../constants';

export const questCategorySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly', 'one_time']);

export const questDifficultySchema = z.enum(['easy', 'normal', 'hard', 'expert', 'legendary']);

export const questStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'failed',
  'expired',
]);

export const subTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(VALIDATION_LIMITS.QUEST_TITLE_MAX_LENGTH),
  description: z.string().max(VALIDATION_LIMITS.QUEST_DESCRIPTION_MAX_LENGTH),
  completed: z.boolean(),
  completedAt: z.date().nullable(),
  order: z.number().int().min(0),
});

export const questCreateSchema = z.object({
  title: z.string().min(1).max(VALIDATION_LIMITS.QUEST_TITLE_MAX_LENGTH),
  description: z.string().max(VALIDATION_LIMITS.QUEST_DESCRIPTION_MAX_LENGTH),
  category: questCategorySchema,
  difficulty: questDifficultySchema,
  characterId: z.string().uuid(),
  progress: z.object({
    current: z.number().min(0).default(0),
    target: z.number().min(1),
    unit: z.string().min(1),
  }),
  deadline: z.date().nullable().optional(),
  reward: z
    .object({
      exp: z.number().min(0),
      gold: z.number().min(0),
      items: z.array(z.string()).default([]),
      title: z.string().optional(),
      skill: z.string().optional(),
    })
    .optional(),
  subtasks: z.array(subTaskSchema).default([]),
  recurring: z
    .object({
      enabled: z.boolean().default(false),
      interval: z.enum(['daily', 'weekly', 'monthly']),
      endDate: z.date().nullable(),
    })
    .optional(),
});

export const questUpdateSchema = z.object({
  title: z.string().min(1).max(VALIDATION_LIMITS.QUEST_TITLE_MAX_LENGTH).optional(),
  description: z.string().max(VALIDATION_LIMITS.QUEST_DESCRIPTION_MAX_LENGTH).optional(),
  status: questStatusSchema.optional(),
  progress: z
    .object({
      current: z.number().min(0),
      target: z.number().min(1),
      unit: z.string().min(1),
    })
    .optional(),
  deadline: z.date().nullable().optional(),
  subtasks: z.array(subTaskSchema).optional(),
});

export type QuestCreateInput = z.infer<typeof questCreateSchema>;
export type QuestUpdateInput = z.infer<typeof questUpdateSchema>;
export type SubTaskInput = z.infer<typeof subTaskSchema>;
