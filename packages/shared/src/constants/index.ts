/**
 * Constants export
 */

export * from './game';
export * from './emotions';

// App version
export const APP_VERSION = '0.1.0';

// Date formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const TIME_FORMAT = 'HH:mm';

// Validation limits
export const VALIDATION_LIMITS = {
  DIARY_MIN_LENGTH: 10,
  DIARY_MAX_LENGTH: 50000,
  QUEST_TITLE_MAX_LENGTH: 100,
  QUEST_DESCRIPTION_MAX_LENGTH: 1000,
  CHARACTER_NAME_MAX_LENGTH: 50,
  WORLD_NAME_MAX_LENGTH: 100,
  TAG_MAX_LENGTH: 30,
  MAX_TAGS_PER_DIARY: 10,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  APP_CONFIG: 'app_config',
  CURRENT_CHARACTER: 'current_character',
  CURRENT_WORLD: 'current_world',
  LAST_BACKUP: 'last_backup',
} as const;
