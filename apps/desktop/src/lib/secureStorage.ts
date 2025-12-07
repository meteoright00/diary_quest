import { writeTextFile, readTextFile, createDir, exists, BaseDirectory } from '@tauri-apps/api/fs';

const SECRETS_FILE = 'secrets.json';

interface Secrets {
    apiKey?: string;
}

async function ensureConfigDir(): Promise<void> {
    try {
        await createDir('', { dir: BaseDirectory.AppConfig, recursive: true });
    } catch (error) {
        // Ignore error (e.g. directory already exists or permission denied but write might still work)
        console.warn('Note: ensureConfigDir failed, but proceeding:', error);
    }
}

/**
 * Save API key to secure storage
 */
export async function saveApiKey(apiKey: string): Promise<void> {
    try {
        if (typeof window !== 'undefined' && !('__TAURI_IPC__' in window)) {
            // Mock mode: save to localStorage
            const secrets: Secrets = { apiKey };
            localStorage.setItem('dq_secrets', JSON.stringify(secrets));
            return;
        }

        await ensureConfigDir();

        // Load existing secrets to preserve other data if any
        let secrets: Secrets = {};
        try {
            const content = await readTextFile(SECRETS_FILE, { dir: BaseDirectory.AppConfig });
            secrets = JSON.parse(content);
        } catch (e) {
            // File might not exist yet, ignore
        }

        secrets.apiKey = apiKey;

        await writeTextFile(SECRETS_FILE, JSON.stringify(secrets, null, 2), {
            dir: BaseDirectory.AppConfig,
        });
    } catch (error) {
        console.error('Failed to save API key:', error);
        throw error;
    }
}

/**
 * Load API key from secure storage
 */
export async function loadApiKey(): Promise<string | null> {
    try {
        if (typeof window !== 'undefined' && !('__TAURI_IPC__' in window)) {
            // Mock mode: load from localStorage
            const content = localStorage.getItem('dq_secrets');
            if (content) {
                const secrets: Secrets = JSON.parse(content);
                return secrets.apiKey || null;
            }
            return null;
        }

        if (!(await exists(SECRETS_FILE, { dir: BaseDirectory.AppConfig }))) {
            return null;
        }

        const content = await readTextFile(SECRETS_FILE, { dir: BaseDirectory.AppConfig });
        const secrets: Secrets = JSON.parse(content);
        return secrets.apiKey || null;
    } catch (error) {
        console.error('Failed to load API key:', error);
        return null;
    }
}
