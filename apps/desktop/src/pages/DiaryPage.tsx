import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { diaryFormSchema, type DiaryFormData } from '@/schemas/diarySchema';
import { useDiaryStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
import { getDiaryConverter, isLLMInitialized, getLLMManager } from '@/services/llm';
import { CharacterManager } from '@diary-quest/core/character';
import { QuestManager } from '@diary-quest/core/quest';
import { EmotionAnalyzer } from '@diary-quest/core/diary';
import { EventGenerator } from '@diary-quest/core';
import { EquipmentGenerator } from '@diary-quest/core';
import { generateId } from '@diary-quest/shared';
import type { Diary, EmotionAnalysis, StoryMetadata, Equipment, RandomEvent } from '@diary-quest/core/types';
import { diaryRepository } from '@/repositories/diaryRepository';
import EquipmentFoundModal from '@/components/EquipmentFoundModal';


import SaveResultModal from '@/components/SaveResultModal';

export default function DiaryPage() {
  const [isConverting, setIsConverting] = useState(false);
  const [convertedContent, setConvertedContent] = useState<string>('');
  const [conversionError, setConversionError] = useState<string>('');
  const [emotionAnalysis, setEmotionAnalysis] = useState<EmotionAnalysis | null>(null);
  const [storyMetadata, setStoryMetadata] = useState<StoryMetadata | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string>('');
  const [foundEquipment, setFoundEquipment] = useState<Equipment | null>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [currentEquipmentSlot, setCurrentEquipmentSlot] = useState<'weapon' | 'armor' | 'accessory' | null>(null);

  // Save Result Modal State
  const [showSaveResultModal, setShowSaveResultModal] = useState(false);
  const [saveResults, setSaveResults] = useState<{
    expGained: number;
    goldGained: number;
    leveledUp: boolean;
    newLevel: number;
    levelsGained: number;
    questCompleted: boolean;
    questRewards: { exp: number; gold: number };
    randomEvent: RandomEvent | null;
    encouragementMessage: string;
  } | null>(null);

  const { createDiary, loadDiariesByCharacter } = useDiaryStore();
  const { worldSettings } = useSettingsStore();
  const { currentCharacter, saveCharacter } = useCharacterStore();
  const { quests, loadQuestsByCharacter, saveQuest } = useQuestStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DiaryFormData>({
    resolver: zodResolver(diaryFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      title: '',
      originalContent: '',
    },
  });



  // Load recent diaries and quests when page is opened or character changes
  useEffect(() => {
    if (currentCharacter) {
      loadDiariesByCharacter(currentCharacter.id);
      loadQuestsByCharacter(currentCharacter.id);
    }
  }, [currentCharacter, loadDiariesByCharacter, loadQuestsByCharacter]);

  // Get active quests (in_progress or not_started)
  const activeQuests = quests.filter(
    (quest) => quest.status === 'in_progress' || quest.status === 'not_started'
  );

  const onConvert = async (data: DiaryFormData) => {
    if (!isLLMInitialized()) {
      setConversionError('LLM設定がまだ完了していません。設定ページでAPIキーを設定してください。');
      return;
    }

    if (!worldSettings) {
      setConversionError('世界観設定が読み込まれていません。設定ページで世界観を選択してください。');
      return;
    }

    if (!currentCharacter) {
      setConversionError('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    setIsConverting(true);
    setConversionError('');
    setConvertedContent('');
    setEmotionAnalysis(null);
    setStoryMetadata(undefined);

    try {
      // Get previous diaries for context (including same-day diaries created earlier)
      const allDiaries = await diaryRepository.findByCharacterId(currentCharacter.id);
      const previousDiaries = allDiaries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);

      const converter = getDiaryConverter();

      // Prepare confirmed name mappings for LLM
      const confirmedMappings = currentCharacter.nameMappings
        .filter((m) => m.status === 'confirmed')
        .map((m) => ({
          realWorld: m.realWorld,
          fantasyWorld: m.fantasyWorld,
          category: m.category,
        }));

      // Convert with metadata for continuity
      const result = await converter.convertWithMetadata({
        originalContent: data.originalContent,
        worldSettings,
        characterName: currentCharacter.basicInfo.name,
        characterClass: currentCharacter.basicInfo.class,
        date: data.date,
        previousDiaries: previousDiaries.map((d) => ({
          date: d.date,
          convertedContent: d.convertedContent,
          storyMetadata: d.storyMetadata,
        })),
        nameMappings: confirmedMappings,
      });

      setConvertedContent(result.convertedContent);
      setStoryMetadata(result.storyMetadata);

      // Process new name mappings
      if (result.newMappings && result.newMappings.length > 0) {
        for (const mapping of result.newMappings) {
          // Check if mapping already exists
          const existingMapping = currentCharacter.nameMappings.find(
            (m) => m.realWorld === mapping.realWorld
          );

          if (!existingMapping) {
            // Add as pending mapping
            currentCharacter.nameMappings.push({
              id: generateId(),
              realWorld: mapping.realWorld,
              fantasyWorld: mapping.fantasyWorld,
              category: mapping.category,
              status: 'pending',
              frequency: 1,
              firstAppeared: data.date,
              lastUsed: data.date,
            });
          } else if (existingMapping.status === 'confirmed') {
            // Update frequency and last used date
            existingMapping.frequency++;
            existingMapping.lastUsed = data.date;
          }
        }

        // Save updated character
        await saveCharacter(currentCharacter);
      }

      // Perform emotion analysis
      const llmManager = getLLMManager();
      const emotionAnalyzer = new EmotionAnalyzer(llmManager);
      const analysis = await emotionAnalyzer.analyze(data.originalContent);
      setEmotionAnalysis(analysis);
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionError(
        error instanceof Error ? error.message : '日記の変換中にエラーが発生しました。'
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleEquipItem = async () => {
    if (!foundEquipment || !currentCharacter || !currentEquipmentSlot) return;

    try {
      const manager = new CharacterManager();
      const success = manager.equipItem(currentCharacter, foundEquipment);

      if (success) {
        await saveCharacter(currentCharacter);
        toast.success(`✨ ${foundEquipment.name}を装備しました！`);
      } else {
        toast.error('装備できませんでした。レベル不足かもしれません。');
      }
    } catch (error) {
      console.error('Failed to equip item:', error);
      toast.error('装備に失敗しました。');
    } finally {
      setShowEquipmentModal(false);
      setFoundEquipment(null);
      setCurrentEquipmentSlot(null);
    }
  };

  const handleDiscardEquipment = () => {
    setShowEquipmentModal(false);
    setFoundEquipment(null);
    setCurrentEquipmentSlot(null);
    toast.info('装備を捨てました。');
  };

  const onSave = async (data: DiaryFormData) => {
    if (!convertedContent) {
      toast.warning('まず日記をRPG風に変換してください。');
      return;
    }

    if (!currentCharacter) {
      toast.error('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    if (!emotionAnalysis) {
      toast.warning('感情分析が完了していません。もう一度変換してください。');
      return;
    }

    setIsSaving(true);

    try {
      const diary: Diary = {
        id: generateId(),
        characterId: currentCharacter.id,
        worldId: currentCharacter.worldId,
        date: data.date,
        title: data.title,
        originalContent: data.originalContent,
        convertedContent,
        emotionAnalysis,
        rewards: {
          exp: 100,
          gold: 50,
          items: [],
        },
        metadata: {
          wordCount: data.originalContent.length,
          characterCount: data.originalContent.length,
          isStreak: false,
          streakCount: 0,
        },
        storyMetadata,
        tags: [],
        isFavorite: false,
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save diary first
      await createDiary(diary);

      // Add EXP reward to character
      const manager = new CharacterManager();
      const result = manager.addExperience(currentCharacter, diary.rewards.exp);

      // Add gold reward
      currentCharacter.currency.gold += diary.rewards.gold;
      currentCharacter.statistics.totalDiaries += 1;

      // Save updated character
      await saveCharacter(currentCharacter);

      // Update quest progress if a quest was selected
      let questCompleted = false;
      let questRewards = { exp: 0, gold: 0 };
      if (selectedQuestId) {
        const selectedQuest = quests.find((q) => q.id === selectedQuestId);
        if (selectedQuest) {
          const questManager = new QuestManager();

          // Start quest if not started
          if (selectedQuest.status === 'not_started') {
            questManager.startQuest(selectedQuest);
          }

          // Increment progress
          if (selectedQuest.status === 'in_progress' || selectedQuest.status === 'not_started') {
            questManager.incrementProgress(selectedQuest);

            // Check if quest is complete
            if (selectedQuest.progress.current >= selectedQuest.progress.target) {
              questManager.completeQuest(selectedQuest);
              questCompleted = true;
              questRewards = selectedQuest.reward;

              // Add quest rewards to character
              currentCharacter.level.exp += questRewards.exp;
              currentCharacter.currency.gold += questRewards.gold;
              await saveCharacter(currentCharacter);
            }

            await saveQuest(selectedQuest);
          }
        }
      }

      // Generate random event
      let randomEvent: RandomEvent | null = null;
      try {
        const llmManager = getLLMManager();
        const equipmentGenerator = new EquipmentGenerator(llmManager);
        const eventGenerator = new EventGenerator(equipmentGenerator);

        if (eventGenerator.shouldGenerateEvent(currentCharacter.stats.luck)) {
          randomEvent = await eventGenerator.generateEvent(
            currentCharacter.level.current,
            currentCharacter.stats.luck,
            worldSettings || undefined
          );

          // Save event to diary
          diary.events = [randomEvent];
          await diaryRepository.update(diary);

          // If equipment found event, show modal instead of alert
          if (randomEvent.type === 'equipment_found' && randomEvent.rewards.equipment) {
            // Store found equipment and show modal
            setFoundEquipment(randomEvent.rewards.equipment);
            setCurrentEquipmentSlot(randomEvent.rewards.equipment.type);
            setShowEquipmentModal(true);

            // Reset form but keep success message for later
            reset();
            setConvertedContent('');
            setSelectedQuestId('');
            setEmotionAnalysis(null);

            // Don't show alert, modal will be shown instead
            return;
          }
        }
      } catch (error) {
        console.error('Failed to generate random event:', error);
        // Continue with normal flow if event generation fails
      }

      // Reset form and converted content
      reset();
      setConvertedContent('');
      setSelectedQuestId('');
      setEmotionAnalysis(null);

      // Show Save Result Modal
      setSaveResults({
        expGained: diary.rewards.exp,
        goldGained: diary.rewards.gold,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
        levelsGained: result.levelsGained,
        questCompleted,
        questRewards,
        randomEvent,
        encouragementMessage: emotionAnalysis.encouragementMessage || '',
      });
      setShowSaveResultModal(true);

    } catch (error) {
      console.error('Save error:', error);
      toast.error('日記の保存中にエラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">今日の冒険日記</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Input Form */}
        <div className="glass-panel rounded-2xl p-8 border-magic-cyan/20 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-magic-cyan to-magic-purple opacity-20 blur pointer-events-none rounded-2xl group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <span className="text-2xl drop-shadow-glow">📝</span> 日記を書く
            </h3>

            <form onSubmit={handleSubmit(onConvert)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  日付
                </label>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-4 py-3 bg-midnight-900/60 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white transition-all shadow-inner"
                />
                {errors.date && (
                  <p className="text-red-400 text-sm mt-1">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  {...register('title')}
                  className="w-full px-4 py-3 bg-midnight-900/60 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="今日の出来事を一言で..."
                />
                {errors.title && (
                  <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  本文
                </label>
                <textarea
                  {...register('originalContent')}
                  rows={12}
                  className="w-full px-4 py-3 bg-midnight-900/60 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white transition-all shadow-inner resize-none placeholder:text-slate-600 leading-relaxed"
                  placeholder="今日あったことを書いてみましょう..."
                />
                {errors.originalContent && (
                  <p className="text-red-400 text-sm mt-1">{errors.originalContent.message}</p>
                )}
              </div>

              {conversionError && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-red-200 text-sm flex items-center gap-2">
                    <span>⚠️</span> {conversionError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isConverting}
                className="w-full bg-gradient-to-r from-magic-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-glow-cyan transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isConverting ? '🪄 運命を紡いでいます...' : '🪄 RPG風に変換する'}
              </button>
            </form>
          </div>
        </div>

        {/* Converted Result */}
        <div className="glass-panel rounded-2xl p-8 border-magic-purple/30 relative">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">⚔️</span> 冒険記
          </h3>

          {convertedContent ? (
            <div className="space-y-6">
              <div className="bg-midnight-900/40 rounded-xl p-6 min-h-[400px] max-h-[600px] overflow-y-auto border border-white/5 custom-scrollbar">
                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                  {convertedContent}
                </p>
              </div>

              {/* Emotion Analysis */}
              {emotionAnalysis && (
                <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-5 border border-purple-500/30 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-4 text-purple-200 flex items-center gap-2">
                    <span>💭</span> 感情分析
                  </h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-midnight-900/60 rounded-lg px-4 py-3 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">主要な感情</span>
                      <span className="font-bold text-purple-300 text-lg">
                        {(() => {
                          const emotionMap: Record<string, string> = {
                            joy: '喜び',
                            sadness: '悲しみ',
                            anger: '怒り',
                            anxiety: '不安',
                            calm: '穏やか',
                            excitement: '興奮',
                            fatigue: '疲労',
                          };
                          return emotionMap[emotionAnalysis.primary] || emotionAnalysis.primary;
                        })()}
                      </span>
                    </div>
                    <div className="bg-midnight-900/60 rounded-lg px-4 py-3 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">総合評価</span>
                      <span className="font-bold text-blue-300 text-lg">
                        {(() => {
                          const sentimentMap: Record<string, string> = {
                            positive: 'ポジティブ',
                            neutral: '中立',
                            negative: 'ネガティブ',
                          };
                          return sentimentMap[emotionAnalysis.overallSentiment] || emotionAnalysis.overallSentiment;
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(emotionAnalysis.scores).map(([emotion, score]) => {
                      const emotionMap: Record<string, string> = {
                        joy: '喜び',
                        sadness: '悲しみ',
                        anger: '怒り',
                        anxiety: '不安',
                        calm: '穏やか',
                        excitement: '興奮',
                        fatigue: '疲労',
                      };
                      const emotionLabel = emotionMap[emotion] || emotion;

                      return (
                        <div key={emotion} className="flex items-center gap-3">
                          <span className="text-sm text-slate-300 w-24 font-medium">{emotionLabel}</span>
                          <div className="flex-1 bg-midnight-900/80 rounded-full h-2 overflow-hidden border border-white/5">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-1000"
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-400 w-12 text-right font-mono">
                            {Math.round(score)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {emotionAnalysis.encouragementMessage && (
                    <div className="mt-4 bg-magic-gold/10 border border-magic-gold/30 rounded-xl p-4">
                      <p className="text-sm text-magic-gold">
                        💬 {emotionAnalysis.encouragementMessage}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quest Selection */}
              {activeQuests.length > 0 && (
                <div className="bg-midnight-900/40 p-5 rounded-xl border border-white/5">
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    🎯 関連クエスト（任意）
                  </label>
                  <select
                    value={selectedQuestId}
                    onChange={(e) => setSelectedQuestId(e.target.value)}
                    className="w-full px-4 py-3 bg-midnight-900/80 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white mb-2"
                  >
                    <option value="">クエストと関連付けない</option>
                    {activeQuests.map((quest) => (
                      <option key={quest.id} value={quest.id}>
                        {quest.title} ({quest.progress.current}/{quest.progress.target} {quest.progress.unit})
                      </option>
                    ))}
                  </select>
                  {selectedQuestId && (
                    <p className="text-sm text-magic-gold flex items-center gap-2">
                      <span>💡</span> この日記を保存すると、クエストの進捗が +1 されます
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleSubmit(onSave)}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-green-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSaving ? '💾 保存中...' : '💾 冒険の記録を残す'}
                </button>
                <button
                  onClick={handleSubmit(onConvert)}
                  disabled={isConverting}
                  className="px-6 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  {isConverting ? '🔄 ...' : '🔄 再生成'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-midnight-900/40 rounded-xl p-4 min-h-[400px] flex items-center justify-center border-2 border-dashed border-slate-700/50">
              <div className="text-center text-slate-500">
                <span className="text-4xl mb-4 block opacity-50">✨</span>
                <p>
                  日記を書いて「RPG風に変換」ボタンを<br />
                  押すと、ここに物語が紡がれます
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Equipment Found Modal */}
      {showEquipmentModal && foundEquipment && currentEquipmentSlot && currentCharacter && (
        <EquipmentFoundModal
          equipment={foundEquipment}
          currentEquipment={currentCharacter.equipment[currentEquipmentSlot]}
          onEquip={handleEquipItem}
          onDiscard={handleDiscardEquipment}
          onClose={() => setShowEquipmentModal(false)}
        />
      )}

      {/* Save Result Modal */}
      {showSaveResultModal && saveResults && (
        <SaveResultModal
          isOpen={showSaveResultModal}
          onClose={() => setShowSaveResultModal(false)}
          results={saveResults}
        />
      )}
    </div>
  );
}
