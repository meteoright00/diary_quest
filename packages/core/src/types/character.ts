/**
 * Character related types
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Name mapping for maintaining consistency in diary conversion
 * Maps real-world terms to fantasy world equivalents
 */
export interface NameMapping {
  id: string;
  realWorld: string;      // Real-world term (e.g., "会社", "田中さん")
  fantasyWorld: string;   // Fantasy world equivalent (e.g., "ギルド本部", "戦士タナカ")
  category: 'location' | 'person' | 'organization' | 'item';
  status: 'pending' | 'confirmed' | 'rejected';
  frequency: number;      // How many times this mapping has been used
  firstAppeared: string;  // Date when first appeared (YYYY-MM-DD)
  lastUsed: string;       // Date when last used (YYYY-MM-DD)
  notes?: string;         // User notes
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  icon?: string;
  baseStats?: {
    hp?: number;
    mp?: number;
    stamina?: number;
    attack?: number;
    defense?: number;
    magic?: number;
    magicDefense?: number;
    agility?: number;
    luck?: number;
  };
  specialties: string[];
  startingSkills?: string[];
}

export interface Character {
  id: string;
  worldId: string;
  createdAt: Date;
  updatedAt: Date;

  basicInfo: {
    name: string;
    class: string;
    title: string;
    guild: string;
  };

  level: {
    current: number;
    exp: number;
    expToNextLevel: number;
  };

  stats: {
    hp: { current: number; max: number };
    mp: { current: number; max: number };
    stamina: { current: number; max: number };
    attack: number;
    defense: number;
    magic: number;
    magicDefense: number;
    agility: number;
    luck: number;
  };

  skills: Skill[];

  equipment: {
    weapon: Equipment | null;
    armor: Equipment | null;
    accessory: Equipment | null;
  };

  inventory: InventoryItem[];

  titles: Title[];

  achievements: Achievement[];

  currency: {
    gold: number;
    silver: number;
  };

  statistics: {
    totalDiaries: number;
    consecutiveDays: number;
    longestStreak: number;
    totalWordsWritten: number;
    totalExpEarned: number;
    timesLeveledUp: number;
    skillsUnlocked: number;
    achievementsUnlocked: number;
  };

  questLog: QuestReference[];

  // Name mappings for diary conversion consistency
  nameMappings: NameMapping[];
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  description: string;
  icon?: string;
  unlockedAt: Date;

  effects: {
    type: 'passive' | 'active';
    stat?: keyof Character['stats'];
    value?: number;
    description: string;
  }[];
}

export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  icon?: string;

  stats: Partial<{
    attack: number;
    defense: number;
    magic: number;
    magicDefense: number;
    agility: number;
    luck: number;
    hp: number;
    mp: number;
    stamina: number;
  }>;

  requiredLevel: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'consumable' | 'material' | 'key_item';
  quantity: number;
  description: string;
  icon?: string;

  effect?: {
    type: 'heal_hp' | 'restore_mp' | 'buff';
    value: number;
    description: string;
  };
}

export interface Title {
  id: string;
  name: string;
  description: string;
  icon?: string;
  earnedAt: Date;
  active: boolean;

  bonuses?: Partial<{
    expBonus: number;
    goldBonus: number;
  }>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'diary' | 'quest' | 'character' | 'special';
  icon?: string;
  earnedAt: Date;

  reward: {
    exp: number;
    gold: number;
    items?: string[];
    title?: string;
  };

  progress?: {
    current: number;
    target: number;
  };
}

export interface QuestReference {
  questId: string;
  addedAt: Date;
  pinned: boolean;
}
