import { useState, useEffect } from 'react';
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
      alert('キャラクターが見つかりません。先にキャラクターを作成してください。');
      return;
    }

    if (!formData.title || formData.title.trim() === '') {
      alert('タイトルを入力してください');
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
      alert('クエストを作成しました！');
    } catch (error) {
      console.error('Failed to create quest:', error);
      alert('クエストの作成に失敗しました');
    }
  };

  const handleStartQuest = async (quest: Quest) => {
    if (quest.status !== 'not_started') return;

    try {
      const manager = new QuestManager();
      manager.startQuest(quest);
      await saveQuest(quest);
      alert('クエストを開始しました！');
    } catch (error) {
      console.error('Failed to start quest:', error);
      alert('クエストの開始に失敗しました');
    }
  };

  const handleCompleteQuest = async (quest: Quest) => {
    if (quest.status !== 'in_progress') return;
    if (!currentCharacter) {
      alert('キャラクターが見つかりません');
      return;
    }

    try {
      const questManager = new QuestManager();
      questManager.completeQuest(quest);
      await saveQuest(quest);

      // Add rewards to character
      const characterManager = new CharacterManager();
      characterManager.addExperience(currentCharacter, quest.reward.exp);
      currentCharacter.currency.gold += quest.reward.gold;
      await saveCharacter(currentCharacter);

      alert(`クエスト達成！\n💎 EXP +${quest.reward.exp}\n💰 ゴールド +${quest.reward.gold}`);
    } catch (error) {
      console.error('Failed to complete quest:', error);
      alert('クエストの完了に失敗しました');
    }
  };

  const handleIncrementProgress = async (quest: Quest) => {
    if (quest.status !== 'in_progress') return;
    if (quest.progress.current >= quest.progress.target) {
      alert('すでに目標を達成しています！');
      return;
    }
    if (!currentCharacter) {
      alert('キャラクターが見つかりません');
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
        const characterManager = new CharacterManager();
        characterManager.addExperience(currentCharacter, quest.reward.exp);
        currentCharacter.currency.gold += quest.reward.gold;
        await saveCharacter(currentCharacter);

        alert(`クエスト達成！\n💎 EXP +${quest.reward.exp}\n💰 ゴールド +${quest.reward.gold}`);
      }
    } catch (error) {
      console.error('Failed to increment progress:', error);
      alert('進捗の更新に失敗しました');
    }
  };

  const getDifficultyColor = (difficulty: Quest['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-600';
      case 'normal': return 'bg-blue-600';
      case 'hard': return 'bg-purple-600';
      case 'expert': return 'bg-red-600';
      case 'legendary': return 'bg-amber-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusColor = (status: Quest['status']) => {
    switch (status) {
      case 'not_started': return 'border-gray-500';
      case 'in_progress': return 'border-blue-500';
      case 'completed': return 'border-green-500';
      case 'failed': return 'border-red-500';
      case 'expired': return 'border-gray-400';
      default: return 'border-gray-500';
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
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">クエスト</h2>
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">クエスト</h2>

      {/* Action Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            アクティブ
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            完了済み
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            すべて
          </button>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ➕ 新しいクエスト
        </button>
      </div>

      {/* Create Quest Form */}
      {showCreateForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">新しいクエストを作成</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">タイトル</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例: 週3回運動する"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">説明</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="クエストの詳細を入力..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">カテゴリ</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="one_time">ワンタイム</option>
                  <option value="daily">デイリー</option>
                  <option value="weekly">ウィークリー</option>
                  <option value="monthly">マンスリー</option>
                  <option value="yearly">イヤーリー</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">難易度</label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="easy">EASY</option>
                  <option value="normal">NORMAL</option>
                  <option value="hard">HARD</option>
                  <option value="expert">EXPERT</option>
                  <option value="legendary">LEGENDARY</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">目標数</label>
                <input
                  type="number"
                  name="targetCount"
                  value={formData.targetCount}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">単位</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="回"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">期限</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCreateQuest}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                作成
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quest List */}
      {filteredQuests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">
            {filter === 'active' ? 'アクティブなクエストがありません' : 'クエストがありません'}
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-amber-500 hover:text-amber-400"
          >
            新しいクエストを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredQuests.map((quest) => {
            const manager = new QuestManager();
            const completionPercentage = manager.getCompletionPercentage(quest);

            return (
              <div
                key={quest.id}
                className={`bg-gray-800 rounded-lg p-6 border-l-4 ${getStatusColor(quest.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{quest.title}</h3>
                    <p className="text-gray-400">{quest.description}</p>
                    <div className="mt-2 flex gap-2 items-center">
                      <span className={`px-3 py-1 ${getDifficultyColor(quest.difficulty)} text-white rounded-full text-sm font-bold`}>
                        {quest.difficulty.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">{getStatusText(quest.status)}</span>
                      {quest.deadline && (
                        <span className="text-sm text-gray-400">
                          期限: {new Date(quest.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">進捗</span>
                    <span className="font-bold">
                      {quest.progress.current} / {quest.progress.target} {quest.progress.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-400">💎 EXP +{quest.reward.exp}</span>
                    <span className="text-yellow-400">💰 Gold +{quest.reward.gold}</span>
                  </div>
                  <div className="flex gap-2">
                    {quest.status === 'not_started' && (
                      <button
                        onClick={() => handleStartQuest(quest)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        開始
                      </button>
                    )}
                    {quest.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => handleIncrementProgress(quest)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                          disabled={quest.progress.current >= quest.progress.target}
                        >
                          +1 進捗
                        </button>
                        <button
                          onClick={() => handleCompleteQuest(quest)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          達成
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
  );
}
