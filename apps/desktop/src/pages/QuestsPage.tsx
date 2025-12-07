import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuestStore } from '@/store/questStore';
import { useCharacterStore } from '@/store/characterStore';
import { QuestManager } from '@diary-quest/core/quest';
import { CharacterManager } from '@diary-quest/core/character';
import type { Quest } from '@diary-quest/core/types';

export default function QuestsPage() {
  const { quests, isLoading, loadQuestsByCharacter, createQuest, saveQuest } = useQuestStore();
  const { currentCharacter, saveCharacter } = useCharacterStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'one_time' as Quest['category'],
    difficulty: 'normal' as Quest['difficulty'],
    targetCount: 1,
    unit: '回',
    deadline: '',
    rewardExp: 100,
    rewardGold: 50,
  });

  // Load quests when page is opened or character changes
  useEffect(() => {
    if (currentCharacter) {
      loadQuestsByCharacter(currentCharacter.id);
    }
  }, [currentCharacter, loadQuestsByCharacter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Convert number fields to number type
    if (name === 'targetCount' || name === 'rewardExp' || name === 'rewardGold') {
      const numValue = parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateQuest = async () => {
    console.log('Creating quest with formData:', formData);
    console.log('Current character:', currentCharacter);

    if (!currentCharacter) {
      toast.error('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    if (!formData.title || formData.title.trim() === '') {
      toast.warning('タイトルを入力してください');
      return;
    }

    try {
      const manager = new QuestManager();
      const quest = manager.createQuest({
        characterId: currentCharacter.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        targetCount: formData.targetCount,
        unit: formData.unit,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        rewardExp: formData.rewardExp,
        rewardGold: formData.rewardGold,
      });

      await createQuest(quest);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        category: 'one_time',
        difficulty: 'normal',
        targetCount: 1,
        unit: '回',
        deadline: '',
        rewardExp: 100,
        rewardGold: 50,
      });
      toast.success('クエストを作成しました！');
    } catch (error) {
      console.error('Failed to create quest:', error);
      toast.error('クエストの作成に失敗しました');
    }
  };

  const handleStartQuest = async (quest: Quest) => {
    if (quest.status !== 'not_started') return;

    try {
      const manager = new QuestManager();
      manager.startQuest(quest);
      await saveQuest(quest);
      toast.success('クエストを開始しました！');
    } catch (error) {
      console.error('Failed to start quest:', error);
      toast.error('クエストの開始に失敗しました');
    }
  };

  const handleCompleteQuest = async (quest: Quest) => {
    if (quest.status !== 'in_progress') return;
    if (!currentCharacter) {
      toast.error('キャラクターが見つかりません');
      return;
    }

    try {
      const questManager = new QuestManager();
      questManager.completeQuest(quest);
      await saveQuest(quest);

      // Add rewards to character
      // Add rewards to character
      const characterManager = new CharacterManager();
      characterManager.addExperience(currentCharacter, quest.reward.exp);
      currentCharacter.currency.gold += quest.reward.gold;
      await saveCharacter(currentCharacter);

      toast.success('クエスト達成！', {
        description: `💎 EXP +${quest.reward.exp}\n💰 ゴールド +${quest.reward.gold}`,
      });
    } catch (error) {
      console.error('Failed to complete quest:', error);
      toast.error('クエストの完了に失敗しました');
    }
  };

  const handleIncrementProgress = async (quest: Quest) => {
    if (quest.status !== 'in_progress') return;
    if (quest.progress.current >= quest.progress.target) {
      toast.warning('すでに目標を達成しています！');
      return;
    }
    if (!currentCharacter) {
      toast.error('キャラクターが見つかりません');
      return;
    }

    try {
      const questManager = new QuestManager();
      questManager.incrementProgress(quest);
      await saveQuest(quest);

      // Check if quest is now complete
      if (quest.progress.current >= quest.progress.target) {
        questManager.completeQuest(quest);
        await saveQuest(quest);

        // Add rewards to character
        // Add rewards to character
        const characterManager = new CharacterManager();
        characterManager.addExperience(currentCharacter, quest.reward.exp);
        currentCharacter.currency.gold += quest.reward.gold;
        await saveCharacter(currentCharacter);

        toast.success('クエスト達成！', {
          description: `💎 EXP +${quest.reward.exp}\n💰 ゴールド +${quest.reward.gold}`,
        });
      }
    } catch (error) {
      console.error('Failed to increment progress:', error);
      toast.error('進捗の更新に失敗しました');
    }
  };

  const getDifficultyColor = (difficulty: Quest['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'hard': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'expert': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'legendary': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusColor = (status: Quest['status']) => {
    switch (status) {
      case 'not_started': return 'border-white/20';
      case 'in_progress': return 'border-magic-cyan/50';
      case 'completed': return 'border-green-500/50';
      case 'failed': return 'border-red-500/50';
      case 'expired': return 'border-gray-500/50';
      default: return 'border-white/20';
    }
  };

  const getStatusText = (status: Quest['status']) => {
    switch (status) {
      case 'not_started': return '未着手';
      case 'in_progress': return '進行中';
      case 'completed': return '完了';
      case 'failed': return '失敗';
      case 'expired': return '期限切れ';
      default: return status;
    }
  };

  const filteredQuests = quests.filter(quest => {
    if (filter === 'active') return quest.status === 'in_progress' || quest.status === 'not_started';
    if (filter === 'completed') return quest.status === 'completed';
    return true;
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">クエスト</h2>
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
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white drop-shadow-md flex items-center gap-3">
            <span className="text-4xl drop-shadow-glow">📜</span> クエスト
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="group relative overflow-hidden bg-gradient-to-r from-magic-gold to-orange-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-glow-gold hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2">
              <span className="text-xl">➕</span> 新しいクエスト
            </span>
          </button>
        </div>

        {/* Action Bar & Filter */}
        <div className="flex gap-2 mb-8 p-1 bg-midnight-900/40 rounded-xl w-fit border border-white/5">
          <button
            onClick={() => setFilter('active')}
            className={`px-5 py-2 rounded-lg font-bold transition-all ${filter === 'active'
              ? 'bg-magic-cyan text-midnight-900 shadow-lg scale-105'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            進行中
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-5 py-2 rounded-lg font-bold transition-all ${filter === 'completed'
              ? 'bg-green-500 text-midnight-900 shadow-lg scale-105'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            完了済み
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-lg font-bold transition-all ${filter === 'all'
              ? 'bg-amber-500 text-midnight-900 shadow-lg scale-105'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            すべて
          </button>
        </div>

        {/* Create Quest Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 bg-midnight-900/60 rounded-2xl border border-magic-gold/30 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <span className="text-magic-gold">✨</span> 新しいクエストを作成
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">タイトル</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white placeholder-slate-600 transition-all font-bold"
                  placeholder="例: 毎日のランニング、読書..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">説明</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white placeholder-slate-600 transition-all resize-none"
                  placeholder="クエストの詳細や目標を入力..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">カテゴリ</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="one_time">⚡ ワンタイム (1回限り)</option>
                    <option value="daily">📅 デイリー (毎日)</option>
                    <option value="weekly">📆 ウィークリー (毎週)</option>
                    <option value="monthly">🗓️ マンスリー (毎月)</option>
                    <option value="yearly">🎯 イヤーリー (毎年)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">難易度</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="easy">🟢 EASY (簡単)</option>
                    <option value="normal">🔵 NORMAL (普通)</option>
                    <option value="hard">🟣 HARD (難しい)</option>
                    <option value="expert">🔴 EXPERT (激ムズ)</option>
                    <option value="legendary">🟠 LEGENDARY (伝説級)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">目標回数</label>
                  <input
                    type="number"
                    name="targetCount"
                    value={formData.targetCount}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">単位</label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold text-white"
                    placeholder="回、km、ページ..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">期限</label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-6 py-3 bg-transparent hover:bg-white/5 text-slate-400 font-bold rounded-xl transition-colors border border-white/10"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateQuest}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-magic-gold to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20"
                >
                  この内容で作成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quest List */}
        {filteredQuests.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-midnight-900/20 rounded-2xl border-2 border-dashed border-white/5">
            <span className="text-6xl mb-4 block opacity-30">🛡️</span>
            <p className="text-lg mb-2">
              {filter === 'active' ? '進行中のクエストはありません' : 'クエストが見つかりません'}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-magic-cyan hover:text-cyan-300 hover:underline transition-colors font-bold"
            >
              新しいクエストを作成する
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredQuests.map((quest) => {
              const manager = new QuestManager();
              const completionPercentage = manager.getCompletionPercentage(quest);

              return (
                <div
                  key={quest.id}
                  className={`bg-midnight-900/60 backdrop-blur-sm rounded-xl p-6 border-l-4 ${getStatusColor(quest.status)} border-y border-r border-white/5 hover:bg-midnight-800/80 transition-all duration-300 group`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 border ${getDifficultyColor(quest.difficulty)} rounded text-xs font-bold uppercase tracking-wider`}>
                          {quest.difficulty}
                        </span>
                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {getStatusText(quest.status)}
                        </span>
                        {quest.deadline && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span>⏰</span> {new Date(quest.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-magic-cyan transition-colors">{quest.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{quest.description}</p>
                    </div>

                    {/* Rewards Badge */}
                    <div className="flex flex-wrap gap-2 md:flex-col md:items-end min-w-max">
                      <div className="flex items-center gap-1.5 bg-magic-gold/10 px-3 py-1.5 rounded-lg border border-magic-gold/20">
                        <span className="text-lg">💎</span>
                        <span className="text-magic-gold font-bold font-mono">+{quest.reward.exp} EXP</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-lg">💰</span>
                        <span className="text-slate-300 font-bold font-mono">+{quest.reward.gold} G</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400 font-bold">進捗状況</span>
                      <span className="font-bold text-white font-mono">
                        {quest.progress.current} <span className="text-slate-500">/</span> {quest.progress.target} {quest.progress.unit}
                      </span>
                    </div>
                    <div className="w-full bg-midnight-900 rounded-full h-3 border border-white/10">
                      <div
                        className="bg-gradient-to-r from-magic-cyan to-blue-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-4">
                      {quest.status === 'not_started' && (
                        <button
                          onClick={() => handleStartQuest(quest)}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                        >
                          開始する
                        </button>
                      )}
                      {quest.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleIncrementProgress(quest)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={quest.progress.current >= quest.progress.target}
                          >
                            +1 {quest.progress.unit || '進捗'}
                          </button>
                          <button
                            onClick={() => handleCompleteQuest(quest)}
                            className={`px-6 py-2 font-bold rounded-lg transition-all shadow-lg items-center gap-2 flex ${quest.progress.current >= quest.progress.target
                              ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-green-500/20 animate-pulse-glow'
                              : 'bg-white/5 text-slate-500 cursor-not-allowed'
                              }`}
                            disabled={quest.progress.current < quest.progress.target}
                          >
                            <span>🏆</span> 達成報告
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
