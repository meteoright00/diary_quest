/**
 * Emotion-related constants
 */

export const EMOTION_TYPES = [
  'joy',
  'sadness',
  'anger',
  'anxiety',
  'calm',
  'excitement',
  'fatigue',
] as const;

export const POSITIVE_EMOTIONS = ['joy', 'calm', 'excitement'] as const;
export const NEGATIVE_EMOTIONS = ['sadness', 'anger', 'anxiety', 'fatigue'] as const;

// Sentiment score thresholds
export const SENTIMENT_THRESHOLDS = {
  POSITIVE_MIN: 20,
  NEGATIVE_MAX: -20,
} as const;

// Emotion icons/emojis (for UI)
export const EMOTION_ICONS = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  anxiety: '😰',
  calm: '😌',
  excitement: '🤩',
  fatigue: '😴',
} as const;

// Emotion colors (for charts)
export const EMOTION_COLORS = {
  joy: '#FFD700',
  sadness: '#4682B4',
  anger: '#DC143C',
  anxiety: '#9370DB',
  calm: '#90EE90',
  excitement: '#FF69B4',
  fatigue: '#808080',
} as const;
