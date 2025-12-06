/**
 * Text processing utilities
 */

/**
 * Count words in text
 */
export function countWords(text: string): number {
  // Remove extra whitespace and split by whitespace
  const words = text.trim().split(/\s+/);
  return words.filter((word) => word.length > 0).length;
}

/**
 * Count characters in text (excluding whitespace)
 */
export function countCharacters(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Extract tags from text (e.g., #tag)
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([^\s#]+)/g;
  const matches = text.match(hashtagRegex);
  if (!matches) return [];

  return matches.map((tag) => tag.substring(1).toLowerCase());
}

/**
 * Remove markdown formatting
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/[*_~`]/g, '') // Remove basic markdown characters
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to plain text
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .trim();
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces
    .toLowerCase();
}

/**
 * Generate excerpt from text
 */
export function generateExcerpt(text: string, maxLength: number = 200): string {
  const plain = stripMarkdown(text);
  return truncate(plain, maxLength);
}
