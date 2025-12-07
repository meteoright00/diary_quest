import { useState, useEffect } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useDiaryStore } from '@/store/diaryStore';
import { useQuestStore } from '@/store/questStore';
import { useReportStore } from '@/store/reportStore';
import { ReportGenerator } from '@diary-quest/core/report/generator';
import { getLLMManager, isLLMInitialized } from '@/services/llm';
import { useSettingsStore } from '@/store/settingsStore';
import type { Report } from '@diary-quest/core/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const { currentCharacter } = useCharacterStore();
  const { diaries, loadDiariesByCharacter } = useDiaryStore();
  const { quests, loadQuestsByCharacter } = useQuestStore();
  const { reports, loadReportsByCharacter, createReport, removeReport } = useReportStore();
  const { llmSettings, worldSettings } = useSettingsStore();

  const [formData, setFormData] = useState({
    type: 'monthly' as Report['type'],
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when page is opened or character changes
  useEffect(() => {
    if (currentCharacter) {
      loadDiariesByCharacter(currentCharacter.id);
      loadQuestsByCharacter(currentCharacter.id);
      loadReportsByCharacter(currentCharacter.id);
    }
  }, [currentCharacter, loadDiariesByCharacter, loadQuestsByCharacter, loadReportsByCharacter]);

  // Calculate real-time statistics
  const totalDiaries = diaries.length;
  const completedQuests = quests.filter((q) => q.status === 'completed').length;

  // Calculate current streak
  const calculateCurrentStreak = (): number => {
    if (diaries.length === 0) return 0;

    const sortedDiaries = [...diaries].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDiaries.length; i++) {
      const diaryDate = new Date(sortedDiaries[i].date);
      diaryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (diaryDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const currentStreak = calculateCurrentStreak();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: Report['type']) => {
    setFormData((prev) => ({ ...prev, type }));

    // Auto-adjust date range based on type
    const today = new Date();
    let startDate = new Date();

    if (type === 'weekly') {
      startDate.setDate(today.getDate() - 7);
    } else if (type === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'yearly') {
      startDate = new Date(today.getFullYear(), 0, 1);
    }

    setFormData((prev) => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }));
  };

  const handleGenerateReport = async () => {
    if (!currentCharacter || !llmSettings || !worldSettings) {
      setError('キャラクターまたは設定が見つかりません');
      return;
    }

    // Check if LLM is initialized
    if (!isLLMInitialized()) {
      setError('LLM設定が初期化されていません。設定ページでAPIキーを設定してください。');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Filter diaries in period
      const diariesInPeriod = diaries.filter((diary) => {
        const diaryDate = new Date(diary.date);
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        return diaryDate >= start && diaryDate <= end;
      });

      // Filter quests in period (created before end of period)
      const questsInPeriod = quests.filter((quest) => {
        const createdAt = new Date(quest.createdAt);
        const end = new Date(formData.endDate);
        // Set end time to end of day to be inclusive
        end.setHours(23, 59, 59, 999);
        return createdAt <= end;
      });

      if (diariesInPeriod.length === 0) {
        setError('指定期間に日記が見つかりません');
        setIsGenerating(false);
        return;
      }

      // Get LLM Manager
      const llmManager = getLLMManager();

      // Generate report
      const generator = new ReportGenerator(llmManager);
      const report = await generator.generateReport({
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        diaries: diariesInPeriod,
        quests: questsInPeriod,
        character: currentCharacter,
      });

      // Level gains are now calculated in ReportGenerator
      // const totalExpGained = report.characterGrowth.expGained;
      // ...

      // Update quest chart data
      report.charts.questProgress.datasets[0].data = [
        report.questStats.completed,
        report.questStats.inProgress,
        report.questStats.failed,
      ];

      // Save report
      await createReport(report);
      setCurrentReport(report);
    } catch (err) {
      console.error('Report generation error:', err);
      setError('レポート生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { ask } = await import('@tauri-apps/api/dialog');
      const confirmed = await ask('このレポートを削除してもよろしいですか？', {
        title: '確認',
        type: 'warning',
      });

      if (!confirmed) return;

      await removeReport(reportId);
      if (currentReport?.id === reportId) {
        setCurrentReport(null);
      }
    } catch (err) {
      console.error('Delete report error:', err);
      setError('レポートの削除に失敗しました');
    }
  };

  const handleViewReport = (report: Report) => {
    setCurrentReport(report);
  };

  const getEmotionLabel = (emotion: string): string => {
    const labels: Record<string, string> = {
      joy: '喜び',
      sadness: '悲しみ',
      anger: '怒り',
      anxiety: '不安',
      calm: '穏やか',
      excitement: '興奮',
      fatigue: '疲労',
    };
    return labels[emotion] || emotion;
  };

  const getReportTypeLabel = (type: Report['type']): string => {
    const labels: Record<Report['type'], string> = {
      weekly: '週次',
      monthly: '月次',
      yearly: '年次',
    };
    return labels[type];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">成長レポート</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">総日記数</div>
          <div className="text-3xl font-bold text-blue-400">{totalDiaries}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">連続記録日数</div>
          <div className="text-3xl font-bold text-green-400">{currentStreak}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">達成クエスト</div>
          <div className="text-3xl font-bold text-amber-400">{completedQuests}</div>
        </div>
      </div>

      {/* Report Generation Form */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">レポート生成</h3>

        <div className="space-y-4">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">レポート種類</label>
            <div className="flex gap-2">
              {(['weekly', 'monthly', 'yearly'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${formData.type === type
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {getReportTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">開始日</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">終了日</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || !currentCharacter}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {isGenerating ? '📊 生成中...' : '📊 レポートを生成'}
          </button>
        </div>
      </div>

      {/* Current Report Display */}
      {currentReport && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">{getReportTypeLabel(currentReport.type)}レポート</h3>
            <button
              onClick={() => setCurrentReport(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-gray-400 mb-6">
            {currentReport.period.start} 〜 {currentReport.period.end}
          </p>

          {/* AI Summary */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-bold mb-2">📝 総評</h4>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {currentReport.aiSummary}
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Diary Stats */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-bold mb-3">📖 日記統計</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">総日記数</span>
                  <span className="font-bold">{currentReport.diaryStats.totalCount}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">平均文字数</span>
                  <span className="font-bold">{currentReport.diaryStats.averageWordCount}字</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">総文字数</span>
                  <span className="font-bold">{currentReport.diaryStats.totalWordsWritten}字</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">最長連続記録</span>
                  <span className="font-bold">{currentReport.diaryStats.longestStreak}日</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">記録率</span>
                  <span className="font-bold">{currentReport.diaryStats.writingRate}%</span>
                </div>
              </div>
            </div>

            {/* Emotion Stats */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-bold mb-3">😊 感情統計</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">最も多い感情</span>
                  <span className="font-bold">{getEmotionLabel(currentReport.emotionStats.mostCommon)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ポジティブ率</span>
                  <span className="font-bold text-green-400">{currentReport.emotionStats.positiveRatio}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ネガティブ率</span>
                  <span className="font-bold text-red-400">{currentReport.emotionStats.negativeRatio}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ニュートラル率</span>
                  <span className="font-bold text-gray-400">{currentReport.emotionStats.neutralRatio}%</span>
                </div>
              </div>
            </div>

            {/* Character Growth */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-bold mb-3">⚔️ キャラクター成長</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">獲得経験値</span>
                  <span className="font-bold text-blue-400">{currentReport.characterGrowth.expGained} EXP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">レベル上昇</span>
                  <span className="font-bold text-purple-400">+{currentReport.characterGrowth.levelsGained}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">獲得ゴールド</span>
                  <span className="font-bold text-amber-400">{currentReport.characterGrowth.goldEarned} G</span>
                </div>
              </div>
            </div>

            {/* Quest Stats */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-bold mb-3">🎯 クエスト統計</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">完了</span>
                  <span className="font-bold text-green-400">{currentReport.questStats.completed}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">進行中</span>
                  <span className="font-bold text-blue-400">{currentReport.questStats.inProgress}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">失敗</span>
                  <span className="font-bold text-red-400">{currentReport.questStats.failed}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">達成率</span>
                  <span className="font-bold">{currentReport.questStats.completionRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emotion Trend Chart */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-bold mb-4">📈 感情トレンド</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={(() => {
                  const chart = currentReport.charts.emotionTrend;
                  return chart.labels.map((label, index) => ({
                    date: label,
                    sentiment: chart.datasets[0]?.data[index] || 0
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sentiment"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                    name="感情スコア"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Writing Frequency Chart */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-bold mb-4">📊 記録頻度</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={(() => {
                  const chart = currentReport.charts.writingFrequency;
                  return chart.labels.map((label, index) => ({
                    date: label,
                    count: chart.datasets[0]?.data[index] || 0
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3B82F6"
                    name="日記数"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Past Reports List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">過去のレポート</h3>

        {reports.length === 0 ? (
          <p className="text-gray-400">まだレポートが生成されていません。</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{getReportTypeLabel(report.type)}レポート</span>
                    <span className="text-sm text-gray-400">
                      {report.period.start} 〜 {report.period.end}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    生成日: {new Date(report.generatedAt).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                  >
                    📄 表示
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="px-4 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg transition-colors text-sm"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
