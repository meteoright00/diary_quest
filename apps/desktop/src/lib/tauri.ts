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

/**
 * Select world file
 */
export async function selectWorldFile(): Promise<string | null> {
  if (!isTauri()) {
    const confirmed = window.confirm('Mock: Select world file? (OK to use dummy, Cancel to cancel)');
    if (!confirmed) return null;
    return `# 世界観: テストワールド\n\nこれはモックでロードされた世界観です。`;
  }
  return invoke<string | null>('select_world_file');
}

/**
 * Select markdown file
 */
export async function selectMarkdownFile(): Promise<string | null> {
  if (!isTauri()) {
    const confirmed = window.confirm('Mock: Select markdown file? (OK to use dummy, Cancel to cancel)');
    if (!confirmed) return null;
    return `file:///mock/path/to/file.md`;
  }

  try {
    const { open } = await import('@tauri-apps/api/dialog');
    const selected = await open({
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }],
      multiple: false,
    });

    if (selected && typeof selected === 'string') {
      return selected;
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

/**
 * Get app version
 */
export async function getVersion(): Promise<string> {
  if (!isTauri()) {
    return '0.1.0-mock';
  }
  const { getVersion: getTauriVersion } = await import('@tauri-apps/api/app');
  return getTauriVersion();
}

/**
 * Check for updates
 */
export async function checkUpdate(): Promise<any> {
  if (!isTauri()) {
    console.log('Mock checkUpdate');
    return { shouldUpdate: false };
  }
  const { checkUpdate: tauriCheckUpdate } = await import('@tauri-apps/api/updater');
  return tauriCheckUpdate();
}

/**
 * Install update
 */
export async function installUpdate(): Promise<void> {
  if (!isTauri()) {
    console.log('Mock installUpdate');
    return;
  }
  const { installUpdate: tauriInstallUpdate } = await import('@tauri-apps/api/updater');
  return tauriInstallUpdate();
}

/**
 * Relaunch application
 */
export async function relaunch(): Promise<void> {
  if (!isTauri()) {
    console.log('Mock relaunch');
    window.location.reload();
    return;
  }
  const { relaunch: tauriRelaunch } = await import('@tauri-apps/api/process');
  return tauriRelaunch();
}
