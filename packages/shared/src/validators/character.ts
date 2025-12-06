/**
 * Character validation schemas
 */

import { z } from 'zod';
import { VALIDATION_LIMITS } from '../constants';

export const characterCreateSchema = z.object({
  worldId: z.string().uuid(),
  basicInfo: z.object({
    name: z.string().min(1).max(VALIDATION_LIMITS.CHARACTER_NAME_MAX_LENGTH),
    class: z.string().min(1),
    title: z.string().min(1),
    guild: z.string().min(1),
  }),
});

export const characterUpdateSchema = z.object({
  basicInfo: z
    .object({
      name: z.string().min(1).max(VALIDATION_LIMITS.CHARACTER_NAME_MAX_LENGTH).optional(),
      class: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      guild: z.string().min(1).optional(),
    })
    .optional(),
  level: z
    .object({
      current: z.number().int().min(1),
      exp: z.number().int().min(0),
      expToNextLevel: z.number().int().min(0),
    })
    .optional(),
  stats: z
    .object({
      hp: z.object({ current: z.number().min(0), max: z.number().min(1) }).optional(),
      mp: z.object({ current: z.number().min(0), max: z.number().min(1) }).optional(),
      stamina: z.object({ current: z.number().min(0), max: z.number().min(1) }).optional(),
      attack: z.number().min(0).optional(),
      defense: z.number().min(0).optional(),
      magic: z.number().min(0).optional(),
      magicDefense: z.number().min(0).optional(),
      agility: z.number().min(0).optional(),
      luck: z.number().min(0).optional(),
    })
    .optional(),
});

export const equipmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['weapon', 'armor', 'accessory']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  description: z.string(),
  icon: z.string().optional(),
  stats: z
    .object({
      attack: z.number().optional(),
      defense: z.number().optional(),
      magic: z.number().optional(),
      magicDefense: z.number().optional(),
      agility: z.number().optional(),
      luck: z.number().optional(),
      hp: z.number().optional(),
      mp: z.number().optional(),
    })
    .optional(),
  requiredLevel: z.number().int().min(1),
});

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
export type CharacterUpdateInput = z.infer<typeof characterUpdateSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
