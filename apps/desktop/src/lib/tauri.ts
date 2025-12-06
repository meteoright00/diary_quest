import { invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';

// Check if running in Tauri environment
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_IPC__' in window;

/**
 * Get the application data directory path
 */
export async function getAppDataDir(): Promise<string> {
  if (!isTauri()) return 'mock-app-data-dir';
  return invoke<string>('get_app_data_dir');
}

/**
 * Get the database file path
 */
export async function getDatabasePath(): Promise<string> {
  if (!isTauri()) return 'mock-database-path';
  return invoke<string>('get_database_path');
}

/**
 * Read world settings from file
 */
export async function readWorldSettings(path: string): Promise<string> {
  if (!isTauri()) return '';
  return invoke<string>('read_world_settings', { path });
}

/**
 * Write world settings to file
 */
export async function writeWorldSettings(
  path: string,
  content: string
): Promise<void> {
  if (!isTauri()) {
    console.log('Mock writeWorldSettings:', path, content);
    return;
  }
  return invoke<void>('write_world_settings', { path, content });
}

/**
 * Show a confirmation dialog
 */
export async function confirm(message: string, options?: any): Promise<boolean> {
  if (!isTauri()) {
    return window.confirm(message);
  }
  return dialog.confirm(message, options);
}

/**
 * Show a message dialog
 */
export async function message(content: string, options?: any): Promise<void> {
  if (!isTauri()) {
    return alert(content);
  }
  return dialog.message(content, options);
}
