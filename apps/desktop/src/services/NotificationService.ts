import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
import { appWindow } from '@tauri-apps/api/window';
import { useSettingsStore } from '@/store/settingsStore';
import { useCharacterStore } from '@/store/characterStore';
import { diaryRepository } from '@/repositories';

class NotificationService {
    private static instance: NotificationService;
    private intervalId: NodeJS.Timeout | null = null;
    private lastCheckedMinute: string | null = null;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    public async start() {
        if (this.intervalId) return;

        // Check permission on start if enabled
        const { appSettings } = useSettingsStore.getState();
        if (appSettings.enableNotifications) {
            await this.checkPermission();
        }

        // Poll every minute
        this.intervalId = setInterval(() => this.checkAndNotify(), 60000);
        console.log('NotificationService started');
    }

    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async checkPermission(): Promise<boolean> {
        if (!('__TAURI_IPC__' in window)) {
            console.log('Mock checkPermission: granted');
            return true;
        }

        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }
        return permissionGranted;
    }

    private async checkAndNotify() {
        const { appSettings, worldSettings } = useSettingsStore.getState();
        const { currentCharacter } = useCharacterStore.getState();

        if (!appSettings.enableNotifications || !currentCharacter) return;

        const now = new Date();
        const currentMinute = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Avoid multiple checks in the same minute
        if (this.lastCheckedMinute === currentMinute) return;
        this.lastCheckedMinute = currentMinute;

        if (currentMinute === appSettings.notificationTime) {
            // Check if diary already exists for today
            const today = now.toISOString().split('T')[0];
            const existingDiary = await diaryRepository.findByDate(currentCharacter.id, today);

            if (!existingDiary) {
                // Infer genre from world info
                const genreText = (worldSettings?.worldInfo.name || '') + (worldSettings?.worldInfo.characteristics || '');
                await this.sendNotification(genreText);
            }
        }
    }

    private async sendNotification(genreText: string) {
        const hasPermission = await this.checkPermission();
        if (!hasPermission) return;

        const title = 'Diary Quest';
        let body = '日記を書く時間です。今日の出来事を記録しましょう。';

        // Select message based on genre
        // Genres: 'fantasy', 'cyberpunk', 'detective' (mapped from defaultWorlds.ts or custom)
        // Note: worldSettings.genre might be Japanese text or ID depending on how it's stored.
        // Assuming it matches the keys in DEFAULT_WORLDS or similar.
        // Let's check against the known keywords.

        const textLower = genreText.toLowerCase();

        if (textLower.includes('fantasy') || textLower.includes('ファンタジー') || textLower.includes('冒険') || textLower.includes('魔法')) {
            body = '冒険の記録を残す時間だ。今日の旅路を記そう。';
        } else if (textLower.includes('cyberpunk') || textLower.includes('sf') || textLower.includes('サイバーパンク') || textLower.includes('ネオトーキョー')) {
            body = 'ログの更新時刻です。本日の観測データを入力してください。';
        } else if (textLower.includes('detective') || textLower.includes('mystery') || textLower.includes('探偵') || textLower.includes('事件')) {
            body = '今日の一日を振り返ろう。事件の手がかりが見つかるかもしれない。';
        }

        if (!('__TAURI_IPC__' in window)) {
            console.log('Mock Notification:', title, body);
            return;
        }

        sendNotification({
            title,
            body,
        });

        // Note: Tauri's notification click handling is global, usually handled in Rust or via event listener.
        // For simple "focus on click", standard OS notifications usually focus the app.
        // If we need specific routing, we might need to listen to 'tauri://notification-click' event if available or configured.
        // For MVP, just focusing the app (which happens by default on click) is sufficient.
        // We can ensure window is shown if it was hidden.
        await appWindow.show();
        await appWindow.setFocus();
    }
}

export const notificationService = NotificationService.getInstance();
