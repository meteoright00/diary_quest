/**
 * Date utilities
 */

import { format, parse, isValid, differenceInDays, addDays, startOfDay } from 'date-fns';
import { DATE_FORMAT, DATETIME_FORMAT, TIME_FORMAT } from '../constants';

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return format(date, DATE_FORMAT);
}

/**
 * Format date to YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: Date): string {
  return format(date, DATETIME_FORMAT);
}

/**
 * Format time to HH:mm
 */
export function formatTime(date: Date): string {
  return format(date, TIME_FORMAT);
}

/**
 * Parse date string (YYYY-MM-DD)
 */
export function parseDate(dateString: string): Date {
  return parse(dateString, DATE_FORMAT, new Date());
}

/**
 * Parse datetime string (YYYY-MM-DD HH:mm:ss)
 */
export function parseDateTime(dateTimeString: string): Date {
  return parse(dateTimeString, DATETIME_FORMAT, new Date());
}

/**
 * Check if date string is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = parseDate(dateString);
  return isValid(date);
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return differenceInDays(end, start);
}

/**
 * Add days to a date string
 */
export function addDaysToDate(dateString: string, days: number): string {
  const date = parseDate(dateString);
  const newDate = addDays(date, days);
  return formatDate(newDate);
}

/**
 * Check if date is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getToday();
}

/**
 * Check if date is in the past
 */
export function isPast(dateString: string): boolean {
  const date = parseDate(dateString);
  const today = startOfDay(new Date());
  return date < today;
}

/**
 * Check if date is in the future
 */
export function isFuture(dateString: string): boolean {
  const date = parseDate(dateString);
  const today = startOfDay(new Date());
  return date > today;
}
