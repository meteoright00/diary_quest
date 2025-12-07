import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { LLMManager, LLMConfig } from '@diary-quest/core';
import { toast } from 'sonner';
import { checkUpdate, installUpdate, type UpdateManifest } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';
import { getVersion } from '@tauri-apps/api/app';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const RECOMMENDED_MODELS: Record<string, { id: string; name: string; description: string }[]> = {
  openai: [
    { id: 'gpt-5', name: 'GPT-5', description: '最新フラッグシップ (推奨)' },
    { id: 'gpt-5.1-pro', name: 'GPT-5.1 Pro', description: '複雑な推論・コーディング向け' },
    { id: 'gpt-4o', name: 'GPT-4o', description: '高速・安定 (旧世代)' },
  ],
  claude: [
    { id: 'claude-4.5-sonnet', name: 'Claude Sonnet 4.5', description: 'バランス型 (推奨)' },
    { id: 'claude-4.5-opus', name: 'Claude Opus 4.5', description: '最高性能' },
    { id: 'claude-4.5-haiku', name: 'Claude Haiku 4.5', description: '高速・低コスト' },
  ],
  gemini: [
    { id: 'gemini-3.0-pro', name: 'Gemini 3 Pro', description: '最高性能・マルチモーダル (推奨)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '超長文コンテキスト対応' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '高速・低コスト' },
  ],
};

export default function SettingsPage() {
  const { llmSettings, worldSettings, appSettings, setLLMSettings, setWorldSettings, setAppSettings } = useSettingsStore();
  const [formData, setFormData] = useState<{
    provider: 'openai' | 'claude' | 'gemini';
    apiKey: string;
    model: string;
  }>({
    provider: (llmSettings?.provider as 'openai' | 'claude' | 'gemini') || 'openai',
    apiKey: llmSettings?.apiKey || '',
    model: llmSettings?.model || 'gpt-5',
  });
  const [worldContent, setWorldContent] = useState('');
  const [worldFilePath, setWorldFilePath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('20:00');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [appVersion, setAppVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);

  // Load settings on mount
  useEffect(() => {
    if (worldSettings) {
      setWorldContent(JSON.stringify(worldSettings, null, 2));
    }
    if (appSettings) {
      setNotificationEnabled(appSettings.enableNotifications);
      setNotificationTime(appSettings.notificationTime);
    }
    // Get app version
    getVersion().then(setAppVersion).catch(console.error);
  }, [worldSettings, appSettings]);

  // Check if form has unsaved changes
  const isDirty = useMemo(() => {
    const isLlmDirty =
      formData.provider !== llmSettings?.provider ||
      formData.apiKey !== llmSettings?.apiKey ||
      formData.model !== llmSettings?.model;

    const isAppDirty =
      notificationEnabled !== appSettings?.enableNotifications ||
      notificationTime !== appSettings?.notificationTime;

    return isLlmDirty || isAppDirty;
  }, [formData, llmSettings, notificationEnabled, notificationTime, appSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'provider') {
      // When provider changes, set default model
      const defaultModel = RECOMMENDED_MODELS[value]?.[0]?.id || '';
      setFormData(prev => ({ ...prev, provider: value as 'openai' | 'claude' | 'gemini', model: defaultModel }));
    } else if (name === 'modelSelect') {
      if (value === 'other') {
        // Keep current model or clear it? Let's clear it to force entry
        setFormData(prev => ({ ...prev, model: '' }));
      } else {
        setFormData(prev => ({ ...prev, model: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    // Validate
    if (!formData.apiKey) {
      toast.error('APIキーを入力してください');
      return;
    }
    if (!formData.model) {
      toast.error('モデルを選択または入力してください');
      return;
    }

    setIsSaving(true);

    try {
      // Save LLM settings
      await setLLMSettings({
        provider: formData.provider,
        apiKey: formData.apiKey,
        model: formData.model,
      });

      // Save App settings
      // If notification is enabled, force minimizeToTray to true. If disabled, force false (exit on close).
      const minimizeToTray = notificationEnabled;

      setAppSettings({
        enableNotifications: notificationEnabled,
        notificationTime: notificationTime,
        minimizeToTray: minimizeToTray,
      });

      toast.success('設定を保存しました');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.apiKey) {
      setTestStatus('error');
      setTestMessage('APIキーを入力してください');
      return;
    }

    setTestStatus('testing');
    setTestMessage('接続テスト中...');

    try {
      // Create temporary config for testing
      const config: LLMConfig = {
        providers: [{
          id: formData.provider,
          name: formData.provider,
          apiKey: formData.apiKey,
          enabled: true,
          models: [],
          usage: { totalTokens: 0, totalCost: 0, lastResetAt: new Date() }
        }],
        defaultProvider: formData.provider,
        fallbackEnabled: false,
        usageTracking: false,
        features: {
          diaryConversion: { provider: formData.provider, model: formData.model },
          emotionAnalysis: { provider: formData.provider, model: formData.model },
          storyGeneration: { provider: formData.provider, model: formData.model },
          reportGeneration: { provider: formData.provider, model: formData.model },
        },
        costManagement: { monthlyLimit: 0, alertThreshold: 0 }
      };

      const llmManager = new LLMManager(config);
      const response = await llmManager.generateText('Hello, this is a test connection.', {
        model: formData.model,
        maxTokens: 1024
      });

      setTestStatus('success');
      setTestMessage(`接続成功 (${response.model}): ${response.text.slice(0, 50)}...`);
    } catch (error) {
      console.error('Connection test error:', error);
      setTestStatus('error');
      setTestMessage(`接続失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const handleLoadWorldFile = async () => {
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
        const { readWorldSettings } = await import('@/lib/tauri');
        const content = await readWorldSettings(selected);

        setWorldFilePath(selected);
        setWorldContent(content);

        // Parse markdown to world settings
        // For now, use default structure
        // Note: promptTemplate is intentionally set to undefined to use DiaryConverter's default prompt
        setWorldSettings({
          worldInfo: {
            name: 'エルデンワールド',
            era: '剣と魔法の中世ファンタジー',
            characteristics: '冒険者ギルドが存在し、モンスター討伐や依頼をこなして生計を立てる世界',
            magic: '魔力を使った魔法が一般的に存在する',
          },
          protagonist: {
            defaultName: '冒険者',
            occupation: '駆け出しの冒険者',
            affiliation: '王都のギルド「銀の月」',
            specialties: ['基礎的な剣術', '回復魔法'],
            goal: '一人前の冒険者になり、伝説の遺跡を探索すること',
          },
          termMappings: {
            places: {
              '会社': 'ギルド',
              '職場': 'ギルド',
              'オフィス': 'ギルドホール',
              '会議室': '作戦会議室',
              '自宅': '宿屋の自室',
              '通勤電車': '馬車',
              'カフェ': '酒場',
            },
            people: {
              '上司': 'ギルドマスター',
              '同僚': '仲間の冒険者',
              '部下': '後輩冒険者',
            },
            activities: {
              '仕事': '依頼',
              '会議': '作戦会議',
              'プロジェクト': '大規模討伐任務',
              '残業': '長時間の探索',
            },
            objects: {
              'パソコン': '依頼書',
              '携帯電話': '魔法の通信石',
              'お金': '金貨',
            },
            emotions: {
              '疲れた': '魔力を消耗した',
              'ストレス': '冒険の重圧',
              '達成感': '依頼達成の喜び',
            },
          },
          conversionRules: {
            writingStyle: '一人称視点の冒険日誌',
            tone: ['epic', 'adventure'],
            guidelines: [
              '元の日記の感情や出来事の本質は維持する',
              '固有名詞は適切にファンタジー風にアレンジ',
              '時間経過や天候などの描写を追加してリアリティを出す',
              '過度に大げさにせず、日常的な冒険の記録として描く',
            ],
          },
          promptTemplate: '',
        });

        toast.info('世界観ファイルを読み込みました');
      }
    } catch (error) {
      console.error('Load world file error:', error);
      toast.error('ファイルの読み込みに失敗しました');
    }
  };

  const handleCheckForUpdates = async () => {
    setIsUpdating(true);
    try {
      const { shouldUpdate, manifest } = await checkUpdate();

      if (shouldUpdate && manifest) {
        setUpdateManifest(manifest);
        setShowUpdateConfirm(true);
      } else {
        toast.info(`お使いのバージョン (${appVersion}) は最新です。`);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      toast.error(`アップデートの確認に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateManifest) return;

    setShowUpdateConfirm(false);
    toast.info('バックグラウンドでアップデートをダウンロード・インストールします。完了後、自動的に再起動します。');

    try {
      await installUpdate();
      await relaunch();
    } catch (error) {
      console.error('Update install failed:', error);
      toast.error('アップデートのインストールに失敗しました');
    }
  };

  // Helper for render
  const currentProviderModels = RECOMMENDED_MODELS[formData.provider] || [];
  const isKnownModel = currentProviderModels.some(m => m.id === formData.model);
  const selectValue = isKnownModel ? formData.model : 'other';

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">設定</h2>

      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">世界観設定</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                世界観ファイル
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="world_settings.md"
                  value={worldFilePath || '未選択'}
                  readOnly
                />
                <button
                  onClick={handleLoadWorldFile}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  📁 選択
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Markdownファイルで世界観を設定できます
              </p>
            </div>

            {worldContent && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  プレビュー
                </label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                  rows={6}
                  value={worldContent}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">アプリケーション情報</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">現在のバージョン</p>
                <p className="text-lg font-mono">v{appVersion || '...'}</p>
              </div>
              <button
                onClick={handleCheckForUpdates}
                disabled={isUpdating}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <span className="animate-spin">⏳</span> 確認中...
                  </>
                ) : (
                  <>
                    <span>🔄</span> アップデートを確認
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              ※アップデートにはインターネット接続が必要です。
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">通知設定</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-400">
                日記の投稿を催促する通知を出す
              </label>
              <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  name="notificationEnabled"
                  id="notificationEnabled"
                  checked={notificationEnabled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setNotificationEnabled(isChecked);
                    if (isChecked) {
                      // Show guidance when turning ON
                      toast.info('アプリを閉じても通知を受け取るために、トレイに最小化されるようになります。');
                    }
                  }}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-amber-500"
                />
                <label
                  htmlFor="notificationEnabled"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${notificationEnabled ? 'bg-amber-500' : 'bg-gray-600'}`}
                ></label>
              </div>
            </div>

            {notificationEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  通知時刻
                </label>
                <input
                  type="time"
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-sm text-gray-400 mt-2">
                  ※指定した時刻に日記が書かれていない場合、通知が届きます。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">LLM API設定</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                プロバイダー
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="openai">OpenAI</option>
                <option value="claude">Anthropic Claude</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                APIキー
              </label>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                モデル
              </label>
              <select
                name="modelSelect"
                value={selectValue}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
              >
                {currentProviderModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
                <option value="other">その他 (手動入力)</option>
              </select>

              {selectValue === 'other' && (
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="モデルIDを入力 (例: gpt-4-32k)"
                />
              )}
              <p className="text-sm text-gray-400 mt-2">
                ※推奨モデル以外を使用する場合は「その他」を選択してモデルIDを入力してください。
              </p>
            </div>

            {/* Connection Test UI */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || !formData.apiKey}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                >
                  {testStatus === 'testing' ? 'テスト中...' : '📡 接続テスト'}
                </button>

                {testMessage && (
                  <span className={`text-sm ${testStatus === 'success' ? 'text-green-400' :
                    testStatus === 'error' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add padding to bottom to prevent content from being hidden behind footer */}
        <div className="h-24"></div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-64 right-0 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 z-10">
        <div className="max-w-4xl mx-auto flex justify-end items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
          >
            {isSaving ? '💾 保存中...' : '💾 設定を保存'}
          </button>
        </div>
      </div>


      <AlertDialog open={showUpdateConfirm} onOpenChange={setShowUpdateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アップデート確認</AlertDialogTitle>
            <AlertDialogDescription>
              新しいバージョン {updateManifest?.version} が利用可能です。<br />
              <br />
              <div className="max-h-32 overflow-y-auto bg-black/20 p-2 rounded text-xs whitespace-pre-wrap">
                {updateManifest?.body}
              </div>
              <br />
              今すぐ更新しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdate}>
              更新する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
