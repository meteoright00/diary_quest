/**
 * World validation schemas
 */

import { z } from 'zod';
import { VALIDATION_LIMITS } from '../constants';

export const worldCategorySchema = z.enum(['fantasy', 'scifi', 'historical', 'modern', 'custom']);

export const worldCreateSchema = z.object({
  name: z.string().min(1).max(VALIDATION_LIMITS.WORLD_NAME_MAX_LENGTH),
  description: z.string().min(1),
  category: worldCategorySchema,
  settingsFilePath: z.string().min(1),
});

export const worldUpdateSchema = z.object({
  name: z.string().min(1).max(VALIDATION_LIMITS.WORLD_NAME_MAX_LENGTH).optional(),
  description: z.string().min(1).optional(),
  category: worldCategorySchema.optional(),
  settingsFilePath: z.string().min(1).optional(),
});

export const worldSettingsSchema = z.object({
  worldInfo: z.object({
    name: z.string(),
    era: z.string(),
    characteristics: z.string(),
    magic: z.string(),
  }),
  protagonist: z.object({
    defaultName: z.string(),
    occupation: z.string(),
    affiliation: z.string(),
    specialties: z.array(z.string()),
    goal: z.string(),
  }),
  termMappings: z.object({
    places: z.record(z.string()),
    people: z.record(z.string()),
    activities: z.record(z.string()),
    objects: z.record(z.string()),
    emotions: z.record(z.string()),
  }),
  conversionRules: z.object({
    writingStyle: z.string(),
    tone: z.array(z.string()),
    guidelines: z.array(z.string()),
  }),
  promptTemplate: z.string(),
});

export type WorldCreateInput = z.infer<typeof worldCreateSchema>;
export type WorldUpdateInput = z.infer<typeof worldUpdateSchema>;
export type WorldSettingsInput = z.infer<typeof worldSettingsSchema>;
