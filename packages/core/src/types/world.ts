/**
 * World and world settings related types
 */

import { CharacterClass } from './character';

export interface World {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  name: string;
  description: string;
  category: 'fantasy' | 'scifi' | 'historical' | 'modern' | 'custom';

  settingsFilePath: string;
  settings: WorldSettings;

  isBuiltIn: boolean;
  createdBy: string | null;

  usageCount: number;
  lastUsedAt: Date | null;
}

export interface WorldSettings {
  worldInfo: {
    name: string;
    era: string;
    characteristics: string;
    magic: string;
  };

  protagonist: {
    defaultName: string;
    occupation: string;
    affiliation: string;
    specialties: string[];
    goal: string;
  };

  availableClasses?: CharacterClass[];

  termMappings: {
    places: Record<string, string>;
    people: Record<string, string>;
    activities: Record<string, string>;
    objects: Record<string, string>;
    emotions: Record<string, string>;
  };

  conversionRules: {
    writingStyle: string;
    tone: string[];
    guidelines: string[];
  };

  promptTemplate: string;
}
