import { useState, useEffect } from 'react';
import { useStoryStore } from '@/store/storyStore';
import { useCharacterStore } from '@/store/characterStore';
import { useDiaryStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { useQuestStore } from '@/store/questStore';
import { StoryGenerator } from '@diary-quest/core';
import { ExpCalculator } from '@diary-quest/core/character';
import { getLLMManager, isLLMInitialized } from '@/services/llm';
import type { Story, Diary } from '@diary-quest/core/types';

export default function StoryPage() {
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    title: '',
    tone: 'serious' as 'serious' | 'comic' | 'lyrical',
    includeEmotions: true,
    includeStats: true,
  });

  const { stories, isLoading, loadStoriesByCharacter, createStory, removeStory } = useStoryStore();
  const { currentCharacter } = useCharacterStore();
  const { loadDiariesByDateRange } = useDiaryStore();
  const { worldSettings } = useSettingsStore();
  const { quests } = useQuestStore();

  // Load stories when page is opened or character changes
  useEffect(() => {
    if (currentCharacter) {
      loadStoriesByCharacter(currentCharacter.id);
    }
  }, [currentCharacter, loadStoriesByCharacter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGenerateStory = async () => {
    if (!currentCharacter) {
      setGenerationError('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    if (!worldSettings) {
      setGenerationError('世界観設定が読み込まれていません。設定ページで世界観を選択してください。');
      return;
    }

    if (!isLLMInitialized()) {
      setGenerationError('LLM設定がまだ完了していません。設定ページでAPIキーを設定してください。');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setGenerationError('期間を選択してください。');
      return;
    }

    // Validate date range
    if (formData.startDate > formData.endDate) {
      setGenerationError('開始日は終了日より前である必要があります。');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');

    try {
      // Load diaries for the selected period
      await loadDiariesByDateRange(currentCharacter.id, formData.startDate, formData.endDate);

      // Get diaries from store
      const periodDiaries = useDiaryStore.getState().diaries.filter(
        (d: Diary) => d.date >= formData.startDate && d.date <= formData.endDate
      );

      if (periodDiaries.length === 0) {
        setGenerationError('指定された期間に日記が見つかりません。');
        setIsGenerating(false);
        return;
      }

      // Generate story using StoryGenerator
      const llmManager = getLLMManager();
      const storyGenerator = new StoryGenerator(llmManager);

      // Create a minimal World object for story generation
      const world = {
        id: currentCharacter.worldId,
        name: worldSettings.worldInfo.name,
        description: worldSettings.worldInfo.characteristics,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'fantasy' as const,
        settingsFilePath: '',
        settings: worldSettings,
        isBuiltIn: false,
        createdBy: null,
        usageCount: 0,
        lastUsedAt: null,
      };

      const story = await storyGenerator.generateStory({
        diaries: periodDiaries,
        character: currentCharacter,
        world,
        title: formData.title,
        tone: formData.tone,
        includeEmotions: formData.includeEmotions,
        includeStats: formData.includeStats,
      });

      // Calculate character growth statistics
      // 1. Count completed quests in the period
      const completedQuestsInPeriod = quests.filter(
        (quest) =>
          quest.status === 'completed' &&
          quest.completedAt &&
          new Date(quest.completedAt) >= new Date(formData.startDate) &&
          new Date(quest.completedAt) <= new Date(formData.endDate)
      );

      // 2. Calculate approximate level gained from EXP
      // Use the current level as a baseline to estimate level progression
      const expCalculator = new ExpCalculator();
      const totalExpGained = story.characterGrowth.expGained;
      let levelGained = 0;
      let remainingExp = totalExpGained;
      let estimatedLevel = currentCharacter.level.current;

      // Simulate level progression based on gained EXP
      while (remainingExp > 0 && levelGained < 100) { // Safety limit
        const expForNextLevel = expCalculator.calculateExpForNextLevel(estimatedLevel);
        if (remainingExp >= expForNextLevel) {
          remainingExp -= expForNextLevel;
          estimatedLevel++;
          levelGained++;
        } else {
          break;
        }
      }

      // Update story with calculated growth
      story.characterGrowth.questsCompleted = completedQuestsInPeriod.length;
      story.characterGrowth.levelGained = levelGained;

      // Save story to database
      await createStory(story);

      // Show generated story
      setSelectedStory(story);
      setShowGenerateForm(false);

      // Reset form
      setFormData({
        startDate: '',
        endDate: '',
        title: '',
        tone: 'serious',
        includeEmotions: true,
        includeStats: true,
      });

      alert('ストーリーを生成しました！');
    } catch (error) {
      console.error('Story generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'ストーリー生成中にエラーが発生しました。'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      // Tauriのdialog APIを使用
      const { ask } = await import('@tauri-apps/api/dialog');
      const confirmed = await ask('このストーリーを削除してもよろしいですか？', {
        title: '確認',
        type: 'warning',
      });

      if (!confirmed) {
        return;
      }

      await removeStory(storyId);
      if (selectedStory?.id === storyId) {
        setSelectedStory(null);
      }
      alert('ストーリーを削除しました');
    } catch (error) {
      console.error('Failed to delete story:', error);
      alert('ストーリーの削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">ストーリー</h2>
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">ストーリー</h2>

      {/* Generate Story Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">冒険の記録</h3>
            <p className="text-gray-400 mt-1">
              日記からストーリーを生成します。期間を指定して、あなたの冒険を物語として読み返しましょう。
            </p>
          </div>
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap"
            disabled={isGenerating}
          >
            📖 新しいストーリーを生成
          </button>
        </div>

        {/* Generate Form */}
        {showGenerateForm && (
          <div className="mt-6 border-t border-gray-700 pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    開始日
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    終了日
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  ストーリータイトル（任意）
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="空欄の場合は自動生成されます"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  トーン
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="serious">シリアス</option>
                  <option value="comic">コミカル</option>
                  <option value="lyrical">叙情的</option>
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    name="includeEmotions"
                    checked={formData.includeEmotions}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                  />
                  感情を含める
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    name="includeStats"
                    checked={formData.includeStats}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                  />
                  ステータスを含める
                </label>
              </div>

              {generationError && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200">
                  {generationError}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleGenerateStory}
                  disabled={isGenerating}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {isGenerating ? '📖 生成中...' : '✨ ストーリーを生成'}
                </button>
                <button
                  onClick={() => setShowGenerateForm(false)}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 font-bold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Story Detail View */}
      {selectedStory && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">{selectedStory.title}</h3>
              <p className="text-gray-400">
                期間: {selectedStory.period.start} 〜 {selectedStory.period.end}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedStory.chapters.length}章 | {selectedStory.includedDiaries.length}件の日記
              </p>
            </div>
            <button
              onClick={() => setSelectedStory(null)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Highlights */}
          {selectedStory.highlights.length > 0 && (
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-amber-400 mb-2">✨ ハイライト</h4>
              <div className="space-y-1">
                {selectedStory.highlights.slice(0, 3).map((highlight, i) => (
                  <p key={i} className="text-sm text-gray-300">
                    • {highlight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Character Growth */}
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h4 className="text-sm font-bold text-blue-400 mb-2">📈 キャラクター成長</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">獲得EXP: </span>
                <span className="font-bold text-blue-300">{selectedStory.characterGrowth.expGained}</span>
              </div>
              <div>
                <span className="text-gray-400">達成クエスト: </span>
                <span className="font-bold text-green-300">{selectedStory.characterGrowth.questsCompleted}</span>
              </div>
              <div>
                <span className="text-gray-400">レベル上昇: </span>
                <span className="font-bold text-amber-300">+{selectedStory.characterGrowth.levelGained}</span>
              </div>
            </div>
          </div>

          {/* Chapters */}
          <div className="space-y-6">
            {selectedStory.chapters.map((chapter) => (
              <div key={chapter.chapterNumber} className="border-l-4 border-amber-500 pl-4">
                <h4 className="text-lg font-bold mb-2">
                  第{chapter.chapterNumber}章: {chapter.title}
                </h4>
                <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                  {chapter.content}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {chapter.wordCount}文字 | {chapter.includedDiaries.length}件の日記
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Story List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">生成済みストーリー</h3>

        {stories.length === 0 ? (
          <p className="text-gray-400">まだストーリーが生成されていません。</p>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => setSelectedStory(story)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{story.title}</h4>
                    <p className="text-sm text-gray-400">
                      {story.period.start} 〜 {story.period.end}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{story.chapters.length}章</span>
                      <span>{story.includedDiaries.length}件の日記</span>
                      <span>EXP +{story.characterGrowth.expGained}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDeleteStory(story.id);
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
