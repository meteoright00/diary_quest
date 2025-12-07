import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
  const { llmSettings, worldSettings, getLLMProviderConfig } = useSettingsStore();
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
        alert(`✨ ${foundEquipment.name}を装備しました！`);
      } else {
        alert('装備できませんでした。レベル不足かもしれません。');
      }
    } catch (error) {
      console.error('Failed to equip item:', error);
      alert('装備に失敗しました。');
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
    alert('装備を捨てました。');
  };

  const onSave = async (data: DiaryFormData) => {
    if (!convertedContent) {
      alert('まず日記をRPG風に変換してください。');
      return;
    }

    if (!currentCharacter) {
      alert('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    if (!emotionAnalysis) {
      alert('感情分析が完了していません。もう一度変換してください。');
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
      alert('日記の保存中にエラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">今日の冒険日記</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input Form */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">📝 日記を書く</h3>

          <form onSubmit={handleSubmit(onConvert)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                日付
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                タイトル
              </label>
              <input
                type="text"
                {...register('title')}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="今日の出来事を一言で..."
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                本文
              </label>
              <textarea
                {...register('originalContent')}
                rows={10}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="今日あったことを書いてみましょう..."
              />
              {errors.originalContent && (
                <p className="text-red-500 text-sm mt-1">{errors.originalContent.message}</p>
              )}
            </div>

            {conversionError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-300 text-sm">{conversionError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isConverting}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {isConverting ? '🪄 変換中...' : '🪄 RPG風に変換'}
            </button>
          </form>
        </div>

        {/* Converted Result */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">⚔️ 冒険記</h3>

          {convertedContent ? (
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {convertedContent}
                </p>
              </div>

              {/* Emotion Analysis */}
              {emotionAnalysis && (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-700/50">
                  <h4 className="text-lg font-bold mb-3 text-purple-200">💭 感情分析</h4>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800/50 rounded px-3 py-2">
                      <span className="text-sm text-gray-400">主要な感情: </span>
                      <span className="font-bold text-purple-300">
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
                    <div className="bg-gray-800/50 rounded px-3 py-2">
                      <span className="text-sm text-gray-400">総合評価: </span>
                      <span className="font-bold text-blue-300">
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

                  <div className="space-y-2">
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
                        <div key={emotion} className="flex items-center gap-2">
                          <span className="text-sm text-gray-300 w-24">{emotionLabel}</span>
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500"
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 w-12 text-right">
                            {Math.round(score)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {emotionAnalysis.encouragementMessage && (
                    <div className="mt-3 bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                      <p className="text-sm text-amber-200">
                        💬 {emotionAnalysis.encouragementMessage}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quest Selection */}
              {activeQuests.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    🎯 関連クエスト（任意）
                  </label>
                  <select
                    value={selectedQuestId}
                    onChange={(e) => setSelectedQuestId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">クエストと関連付けない</option>
                    {activeQuests.map((quest) => (
                      <option key={quest.id} value={quest.id}>
                        {quest.title} ({quest.progress.current}/{quest.progress.target} {quest.progress.unit})
                      </option>
                    ))}
                  </select>
                  {selectedQuestId && (
                    <p className="text-sm text-amber-400 mt-1">
                      💡 この日記を保存すると、クエストの進捗が +1 されます
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleSubmit(onSave)}
                  disabled={isSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {isSaving ? '💾 保存中...' : '💾 保存'}
                </button>
                <button
                  onClick={handleSubmit(onConvert)}
                  disabled={isConverting}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-300 font-bold rounded-lg transition-colors"
                >
                  {isConverting ? '🔄 変換中...' : '🔄 再生成'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <p className="text-gray-400 text-center">
                日記を書いて「RPG風に変換」ボタンを<br />
                押すと、ここに変換結果が表示されます
              </p>
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
