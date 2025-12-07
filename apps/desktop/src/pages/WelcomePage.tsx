import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCharacterStore } from '@/store/characterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorldStore } from '@/store/worldStore';
import { DEFAULT_WORLDS, WORLD_METADATA, WorldParser } from '@diary-quest/core';
import { selectWorldFile } from '@/lib/tauri';

interface WelcomePageProps {
  onComplete: () => void;
  onNavigate: (page: 'character' | 'settings') => void;
}

export default function WelcomePage({ onComplete, onNavigate }: WelcomePageProps) {
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [isEditingWorld, setIsEditingWorld] = useState<boolean>(false);
  const [isUploadingCustomWorld, setIsUploadingCustomWorld] = useState<boolean>(false);

  const { characters } = useCharacterStore();
  const { llmSettings, worldSettings, setWorldSettings } = useSettingsStore();
  const { initializeWorld } = useWorldStore();

  const hasWorldSettings = !!worldSettings;
  const hasCharacter = characters.length > 0;
  const hasLLMSettings = !!llmSettings?.apiKey;
  const isComplete = hasWorldSettings && hasCharacter && hasLLMSettings;

  // Initialize selectedWorldId from existing worldSettings
  useEffect(() => {
    if (worldSettings && !selectedWorldId) {
      // Find which preset world matches the current settings
      const matchingWorld = WORLD_METADATA.find(
        (w) => DEFAULT_WORLDS[w.id as keyof typeof DEFAULT_WORLDS].worldInfo.name === worldSettings.worldInfo.name
      );
      if (matchingWorld) {
        setSelectedWorldId(matchingWorld.id);
      }
    }
  }, [worldSettings, selectedWorldId]);

  const handleWorldSelect = async (worldId: string) => {
    setSelectedWorldId(worldId);
    // Save selected world to settings
    const worldKey = worldId as keyof typeof DEFAULT_WORLDS;
    const settings = DEFAULT_WORLDS[worldKey];
    setWorldSettings(settings);

    // Initialize world in DB to ensure it exists for FK
    await initializeWorld(settings, worldId);

    setIsEditingWorld(false);
  };

  const handleEditWorld = () => {
    setIsEditingWorld(true);
  };

  const handleCustomWorldUpload = async () => {
    try {
      setIsUploadingCustomWorld(true);

      // Open file dialog and read MD file
      const fileContent = await selectWorldFile();

      if (!fileContent) {
        // User cancelled
        return;
      }

      // Parse markdown using WorldParser
      const parser = new WorldParser();
      const worldSettings = parser.parseMarkdown(fileContent);

      // Validate settings
      const validation = parser.validateSettings(worldSettings);

      if (!validation.valid) {
        toast.error(`世界観ファイルのバリデーションエラー:\n${validation.errors.join('\n')}`);
        return;
      }

      // Save to settings
      setWorldSettings(worldSettings);
      setSelectedWorldId('custom');

      // Initialize custom world in DB
      // We don't have a stable ID for custom worlds from file unless generated or stored in file
      // For now generate a new one or use 'custom' if singular
      // Better to let generateId() handle it in store, but we need to track it?
      // For simplicity, just let store generate an ID if we don't pass one, 
      // BUT we need to pass it to CharacterPage later?
      // Actually `initializeWorld` updates `currentWorld` in store, so we can check that.
      await initializeWorld(worldSettings);

      setIsEditingWorld(false);

      toast.success('カスタム世界観を読み込みました！');
    } catch (error) {
      console.error('Failed to upload custom world:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`世界観ファイルの読み込みに失敗しました:\n${errorMessage}`);
    } finally {
      setIsUploadingCustomWorld(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-4">⚔️ Diary Quest</h1>
        <p className="text-xl text-gray-400">
          日常の日記を、冒険の物語に変える
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-bold mb-6">ようこそ！</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Diary Questは、あなたの日記を自動的にRPG風の冒険物語に変換するアプリケーションです。
          日記を書くことで、キャラクターが成長し、クエストを達成し、冒険の記録が生成されます。
        </p>
        <p className="text-gray-300 leading-relaxed">
          はじめるには、以下のセットアップを完了させてください：
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {/* Step 0: World Selection */}
        <div
          className={`bg-gray-800 rounded-lg p-6 border-2 ${hasWorldSettings ? 'border-green-500' : 'border-gray-600'
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">
                  {hasWorldSettings ? '✅' : '0️⃣'}
                </span>
                <h3 className="text-xl font-bold">世界観選択</h3>
              </div>
              <p className="text-gray-400 ml-11">
                日記を変換する世界観を選んでください
              </p>
            </div>
          </div>

          {hasWorldSettings && worldSettings && !isEditingWorld ? (
            <div className="ml-11 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-green-400">
                  ✓ 「{worldSettings.worldInfo.name}」を選択中
                </span>
                {!isComplete && (
                  <button
                    onClick={handleEditWorld}
                    className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    変更
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="ml-11 mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {WORLD_METADATA.map((world) => (
                  <button
                    key={world.id}
                    onClick={() => handleWorldSelect(world.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${selectedWorldId === world.id
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                  >
                    <div className="text-4xl mb-2">{world.icon}</div>
                    <h4 className="font-bold text-lg mb-1">{world.name}</h4>
                    <p className="text-sm text-gray-400 mb-2">{world.description}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {world.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">例: {world.example}</p>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={handleCustomWorldUpload}
                  disabled={isUploadingCustomWorld}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-gray-600 bg-gray-700/20 hover:border-amber-500 hover:bg-gray-700/30 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-4xl mb-2">📁</div>
                  <h4 className="font-bold text-lg mb-1">カスタム世界観</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    {isUploadingCustomWorld ? '読み込み中...' : 'MDファイルから独自の世界観を読み込む'}
                  </p>
                  <div className="text-xs text-gray-500">
                    *.md ファイルをアップロード
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Character Creation */}
        <div
          className={`bg-gray-800 rounded-lg p-6 border-2 ${hasCharacter ? 'border-green-500' : !hasWorldSettings ? 'border-gray-700' : 'border-gray-600'
            } ${!hasWorldSettings ? 'opacity-50' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">
                  {hasCharacter ? '✅' : '1️⃣'}
                </span>
                <h3 className="text-xl font-bold">キャラクター作成</h3>
              </div>
              <p className="text-gray-400 ml-11">
                あなたの分身となるキャラクターを作成します
              </p>
            </div>
            {!hasCharacter && hasWorldSettings && (
              <button
                onClick={() => onNavigate('character')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors ml-4"
              >
                作成する
              </button>
            )}
          </div>
          {hasCharacter && (
            <div className="ml-11 mt-2 text-green-400">
              ✓ キャラクター「{characters[0].basicInfo.name}」が作成されています
            </div>
          )}
          {!hasWorldSettings && (
            <div className="ml-11 mt-2 text-gray-500">
              ⚠ まず世界観を選択してください
            </div>
          )}
        </div>

        {/* Step 2: LLM Settings */}
        <div
          className={`bg-gray-800 rounded-lg p-6 border-2 ${hasLLMSettings ? 'border-green-500' : 'border-gray-600'
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">
                  {hasLLMSettings ? '✅' : '2️⃣'}
                </span>
                <h3 className="text-xl font-bold">LLM API設定</h3>
              </div>
              <p className="text-gray-400 ml-11">
                日記変換に使用するAI（OpenAI/Claude/Gemini）のAPIキーを設定します
              </p>
            </div>
            {!hasLLMSettings && (
              <button
                onClick={() => onNavigate('settings')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors ml-4"
              >
                設定する
              </button>
            )}
          </div>
          {hasLLMSettings && (
            <div className="ml-11 mt-2 text-green-400">
              ✓ {llmSettings.provider} APIが設定されています
            </div>
          )}
        </div>
      </div>

      {isComplete && (
        <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-6 text-center">
          <p className="text-green-400 text-lg mb-4">
            🎉 セットアップ完了！冒険を始める準備ができました
          </p>
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-lg"
          >
            冒険を始める
          </button>
        </div>
      )}

      {!isComplete && (
        <div className="text-center text-gray-500 text-sm">
          上記のステップを完了させてから、「冒険を始める」ボタンをクリックしてください
        </div>
      )}
    </div>
  );
}
