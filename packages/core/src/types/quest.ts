/**
 * Quest related types
 */

export interface Quest {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time';
  difficulty: 'easy' | 'normal' | 'hard' | 'expert' | 'legendary';

  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';

  progress: {
    current: number;
    target: number;
    unit: string;
  };

  deadline: Date | null;
  startDate: Date | null;
  completedAt: Date | null;

  reward: {
    exp: number;
    gold: number;
    items: string[];
    title?: string;
    skill?: string;
  };

  subtasks: SubTask[];

  characterId: string;

  recurring: {
    enabled: boolean;
    interval: 'daily' | 'weekly' | 'monthly';
    endDate: Date | null;
  };
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt: Date | null;
  order: number;
}
