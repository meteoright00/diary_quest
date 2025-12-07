import { useState, useEffect } from 'react';
import { useStoryStore } from '@/store/storyStore';
import { useCharacterStore } from '@/store/characterStore';
import { useDiaryStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { useQuestStore } from '@/store/questStore';
import { toast } from 'sonner';
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
import { StoryGenerator } from '@diary-quest/core';
import { ExpCalculator } from '@diary-quest/core/character';
import { getLLMManager, isLLMInitialized } from '@/services/llm';
import type { Story, Diary } from '@diary-quest/core/types';

export default function StoryPage() {
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyToDeleteId, setStoryToDeleteId] = useState<string | null>(null);
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
      toast.error('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    if (!worldSettings) {
      toast.error('世界観設定が読み込まれていません。設定ページで世界観を選択してください。');
      return;
    }

    if (!isLLMInitialized()) {
      toast.error('LLM設定がまだ完了していません。設定ページでAPIキーを設定してください。');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.warning('期間を選択してください。');
      return;
    }

    // Validate date range
    if (formData.startDate > formData.endDate) {
      toast.warning('開始日は終了日より前である必要があります。');
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
        toast.warning('指定された期間に日記が見つかりません。');
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



      toast.success('ストーリーを生成しました！');
    } catch (error) {
      console.error('Story generation error:', error);
      toast.error('ストーリー生成中にエラーが発生しました。');
      setGenerationError(
        error instanceof Error ? error.message : 'ストーリー生成中にエラーが発生しました。'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!storyToDeleteId) return;

    try {
      await removeStory(storyToDeleteId);
      if (selectedStory?.id === storyToDeleteId) {
        setSelectedStory(null);
      }
      setStoryToDeleteId(null);
      toast.success('ストーリーを削除しました');
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error('ストーリーの削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">ストーリー</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-magic-cyan border-t-transparent rounded-full animate-spin"></div>
          <p className="text-magic-cyan font-bold animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-panel rounded-2xl p-8 border-magic-cyan/20">
        <h2 className="text-3xl font-bold mb-8 text-white drop-shadow-md flex items-center gap-3">
          <span className="text-4xl drop-shadow-glow">📖</span> ストーリー
        </h2>

        {/* Generate Story Section */}
        <div className="mb-8 p-6 bg-midnight-900/60 rounded-2xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-magic-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-magic-gold/10 transition-colors duration-700" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-magic-gold">✨</span> 冒険の記録
                </h3>
                <p className="text-slate-400 mt-1 text-sm">
                  日記からストーリーを生成します。期間を指定して、あなたの冒険を物語として読み返しましょう。
                </p>
              </div>
              <button
                onClick={() => setShowGenerateForm(!showGenerateForm)}
                className="bg-gradient-to-r from-magic-gold to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-glow-gold hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <span>📖</span> 新しいストーリーを生成
                  </>
                )}
              </button>
            </div>

            {/* Generate Form */}
            {showGenerateForm && (
              <div className="mt-6 border-t border-white/10 pt-6 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">開始日</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">終了日</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">ストーリータイトル（任意）</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="空欄の場合は自動生成されます"
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white placeholder-slate-600 transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">トーン</label>
                    <select
                      name="tone"
                      value={formData.tone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="serious">⚔️ シリアス (重厚な物語)</option>
                      <option value="comic">🎭 コミカル (明るい冒険)</option>
                      <option value="lyrical">📜 叙情的 (詩的な表現)</option>
                    </select>
                  </div>

                  <div className="flex gap-6 p-4 bg-black/20 rounded-xl border border-white/5">
                    <label className="flex items-center gap-3 text-slate-300 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          name="includeEmotions"
                          checked={formData.includeEmotions}
                          onChange={handleInputChange}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-slate-500 rounded peer-checked:bg-magic-gold peer-checked:border-magic-gold transition-colors" />
                        <span className="absolute text-midnight-900 text-xs font-bold left-0.5 opacity-0 peer-checked:opacity-100">✓</span>
                      </div>
                      <span className="group-hover:text-white transition-colors">感情を含める</span>
                    </label>
                    <label className="flex items-center gap-3 text-slate-300 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          name="includeStats"
                          checked={formData.includeStats}
                          onChange={handleInputChange}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-slate-500 rounded peer-checked:bg-magic-gold peer-checked:border-magic-gold transition-colors" />
                        <span className="absolute text-midnight-900 text-xs font-bold left-0.5 opacity-0 peer-checked:opacity-100">✓</span>
                      </div>
                      <span className="group-hover:text-white transition-colors">ステータスを含める</span>
                    </label>
                  </div>

                  {generationError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 flex items-center gap-3">
                      <span className="text-xl">⚠️</span>
                      {generationError}
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => setShowGenerateForm(false)}
                      disabled={isGenerating}
                      className="px-6 py-3 bg-transparent hover:bg-white/5 disabled:opacity-50 text-slate-400 font-bold rounded-xl transition-colors border border-white/10"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleGenerateStory}
                      disabled={isGenerating}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 disabled:shadow-none items-center justify-center gap-2 flex"
                    >
                      {isGenerating ? (
                        <>生成中...</>
                      ) : (
                        <>
                          <span className="text-xl">✨</span> ストーリーを生成開始
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Story Detail View */}
        {selectedStory && (
          <div className="bg-midnight-900/80 backdrop-blur-md rounded-2xl p-8 mb-8 border border-magic-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 relative">
            {/* Decorative Corner */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-magic-gold/30 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-magic-gold/30 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-magic-gold/30 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-magic-gold/30 rounded-br-2xl" />

            <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h3 className="text-3xl font-bold mb-2 text-magic-gold font-serif tracking-wide">{selectedStory.title}</h3>
                <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                  <span>📅</span> {selectedStory.period.start} 〜 {selectedStory.period.end}
                </p>
                <p className="text-xs text-slate-500 mt-2 flex gap-4">
                  <span>📜 {selectedStory.chapters.length}章</span>
                  <span>📝 {selectedStory.includedDiaries.length}件の日記</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedStory(null)}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                title="閉じる"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Highlights */}
            {selectedStory.highlights.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-r from-amber-900/20 to-transparent rounded-xl border-l-4 border-amber-500">
                <h4 className="text-sm font-bold text-amber-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">✨</span> ハイライト
                </h4>
                <div className="space-y-2">
                  {selectedStory.highlights.slice(0, 3).map((highlight, i) => (
                    <p key={i} className="text-slate-300 italic flex items-start gap-2">
                      <span className="text-amber-500/50 mt-1">❝</span> {highlight}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Character Growth */}
            <div className="mb-8 p-6 bg-blue-900/10 border border-blue-500/20 rounded-xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
              <h4 className="text-sm font-bold text-blue-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="text-lg">📈</span> キャラクター成長
              </h4>
              <div className="grid grid-cols-3 gap-8 text-center relative z-10">
                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1">獲得EXP</span>
                  <span className="font-bold text-blue-300 text-xl font-mono">+{selectedStory.characterGrowth.expGained}</span>
                </div>
                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1">達成クエスト</span>
                  <span className="font-bold text-green-300 text-xl font-mono">{selectedStory.characterGrowth.questsCompleted}</span>
                </div>
                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1">レベル上昇</span>
                  <span className="font-bold text-amber-300 text-xl font-mono">+{selectedStory.characterGrowth.levelGained}</span>
                </div>
              </div>
            </div>

            {/* Chapters */}
            <div className="space-y-8">
              {selectedStory.chapters.map((chapter) => (
                <div key={chapter.chapterNumber} className="relative pl-8 border-l-2 border-white/10 pb-8 last:pb-0 last:border-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-midnight-900 border-2 border-magic-gold shadow-[0_0_10px_var(--color-magic-gold)]" />
                  <h4 className="text-xl font-bold mb-4 text-slate-200">
                    <span className="text-magic-gold mr-2">Chapter {chapter.chapterNumber}</span>
                    {chapter.title}
                  </h4>
                  <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed font-serif text-lg">
                    {chapter.content}
                  </div>
                  <p className="text-xs text-slate-500 mt-4 font-mono text-right border-t border-white/5 pt-2">
                    {chapter.wordCount}文字 | {chapter.includedDiaries.length}件の日記
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story List */}
        <div>
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <span className="text-2xl">📚</span> 生成済みストーリー
          </h3>

          {stories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-midnight-900/30 rounded-xl border border-dashed border-white/5">
              <p>まだストーリーが生成されていません。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className={`bg-midnight-900/40 border border-white/5 rounded-xl p-5 hover:bg-midnight-800/60 hover:border-magic-gold/30 transition-all cursor-pointer group relative overflow-hidden ${selectedStory?.id === story.id ? 'ring-2 ring-magic-gold bg-midnight-800' : ''}`}
                  onClick={() => setSelectedStory(story)}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-2 text-slate-200 group-hover:text-magic-gold transition-colors">{story.title}</h4>
                      <p className="text-sm text-slate-400 font-mono mb-3">
                        {story.period.start} 〜 {story.period.end}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs font-bold">
                        <span className="px-2 py-1 bg-white/5 rounded text-slate-300 border border-white/5">{story.chapters.length}章</span>
                        <span className="px-2 py-1 bg-white/5 rounded text-slate-300 border border-white/5">{story.includedDiaries.length}件の日記</span>
                        <span className="px-2 py-1 bg-magic-gold/10 rounded text-magic-gold border border-magic-gold/20">EXP +{story.characterGrowth.expGained}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pl-4">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setStoryToDeleteId(story.id);
                        }}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg transition-colors text-sm font-bold"
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

      <AlertDialog open={!!storyToDeleteId} onOpenChange={(open) => !open && setStoryToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ストーリーの削除</AlertDialogTitle>
            <AlertDialogDescription>
              このストーリーを削除してもよろしいですか？<br />
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStory}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}
