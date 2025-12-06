/**
 * Diary validation schemas
 */

import { z } from 'zod';
import { VALIDATION_LIMITS } from '../constants';

export const emotionTypeSchema = z.enum([
  'joy',
  'sadness',
  'anger',
  'anxiety',
  'calm',
  'excitement',
  'fatigue',
]);

export const diaryCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  originalContent: z
    .string()
    .min(VALIDATION_LIMITS.DIARY_MIN_LENGTH, 'Diary is too short')
    .max(VALIDATION_LIMITS.DIARY_MAX_LENGTH, 'Diary is too long'),
  characterId: z.string().uuid(),
  worldId: z.string().uuid(),
  tags: z
    .array(z.string().max(VALIDATION_LIMITS.TAG_MAX_LENGTH))
    .max(VALIDATION_LIMITS.MAX_TAGS_PER_DIARY)
    .optional()
    .default([]),
});

export const diaryUpdateSchema = z.object({
  originalContent: z
    .string()
    .min(VALIDATION_LIMITS.DIARY_MIN_LENGTH)
    .max(VALIDATION_LIMITS.DIARY_MAX_LENGTH)
    .optional(),
  convertedContent: z.string().optional(),
  tags: z
    .array(z.string().max(VALIDATION_LIMITS.TAG_MAX_LENGTH))
    .max(VALIDATION_LIMITS.MAX_TAGS_PER_DIARY)
    .optional(),
  isFavorite: z.boolean().optional(),
});

export const emotionAnalysisSchema = z.object({
  primary: emotionTypeSchema,
  secondary: emotionTypeSchema.nullable(),
  scores: z.object({
    joy: z.number().min(0).max(100),
    sadness: z.number().min(0).max(100),
    anger: z.number().min(0).max(100),
    anxiety: z.number().min(0).max(100),
    calm: z.number().min(0).max(100),
    excitement: z.number().min(0).max(100),
    fatigue: z.number().min(0).max(100),
  }),
  overallSentiment: z.enum(['positive', 'neutral', 'negative']),
  sentimentScore: z.number().min(-100).max(100),
  encouragementMessage: z.string().nullable(),
  recommendedDiaries: z.array(z.string().uuid()),
});

export type DiaryCreateInput = z.infer<typeof diaryCreateSchema>;
export type DiaryUpdateInput = z.infer<typeof diaryUpdateSchema>;
export type EmotionAnalysisInput = z.infer<typeof emotionAnalysisSchema>;
