import { useState, useEffect } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useDiaryStore } from '@/store/diaryStore';
import { useQuestStore } from '@/store/questStore';
import { useReportStore } from '@/store/reportStore';
import { ReportGenerator } from '@diary-quest/core/report/generator';
import { getLLMManager, isLLMInitialized } from '@/services/llm';
import { useSettingsStore } from '@/store/settingsStore';
import type { Report } from '@diary-quest/core/types';
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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const { currentCharacter } = useCharacterStore();
  const { diaries, loadDiariesByCharacter } = useDiaryStore();
  const { quests, loadQuestsByCharacter } = useQuestStore();
  const { reports, loadReportsByCharacter, createReport, removeReport } = useReportStore();
  const { llmSettings, worldSettings } = useSettingsStore();

  // Helper to format date as YYYY-MM-DD in local time
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [formData, setFormData] = useState({
    type: 'monthly' as Report['type'],
    startDate: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    endDate: formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
  });

  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);

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
    let endDate = new Date();

    if (type === 'weekly') {
      startDate.setDate(today.getDate() - 6);
      endDate = today;
    } else if (type === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // End of month
    } else if (type === 'yearly') {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31); // End of year
    }

    setFormData((prev) => ({
      ...prev,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    }));
  };

  const handleGenerateReport = async () => {
    if (!currentCharacter || !llmSettings || !worldSettings) {
      toast.error('キャラクターまたは設定が見つかりません');
      return;
    }

    // Check if LLM is initialized
    if (!isLLMInitialized()) {
      toast.error('LLM設定が初期化されていません。設定ページでAPIキーを設定してください。');
      return;
    }

    setIsGenerating(true);

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
        toast.warning('指定期間に日記が見つかりません');
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
      toast.success('レポートを生成しました！');
    } catch (err) {
      console.error('Report generation error:', err);
      toast.error('レポート生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDeleteId) return;

    try {
      await removeReport(reportToDeleteId);
      if (currentReport?.id === reportToDeleteId) {
        setCurrentReport(null);
      }
      setReportToDeleteId(null);
      toast.success('レポートを削除しました');
    } catch (err) {
      console.error('Delete report error:', err);
      toast.error('レポートの削除に失敗しました');
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
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-panel rounded-2xl p-8 border-magic-cyan/20">
        <h2 className="text-3xl font-bold mb-8 text-white drop-shadow-md flex items-center gap-3">
          <span className="text-4xl drop-shadow-glow">📊</span> 成長レポート
        </h2>

        {/* Real-time Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-midnight-900/60 backdrop-blur-sm rounded-xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="text-6xl">📖</span>
            </div>
            <div className="relative z-10">
              <div className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">総日記数</div>
              <div className="text-4xl font-bold text-blue-400 drop-shadow-sm font-mono">{totalDiaries}</div>
            </div>
          </div>
          <div className="bg-midnight-900/60 backdrop-blur-sm rounded-xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="text-6xl">🔥</span>
            </div>
            <div className="relative z-10">
              <div className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">連続記録日数</div>
              <div className="text-4xl font-bold text-green-400 drop-shadow-sm font-mono">{currentStreak}</div>
            </div>
          </div>
          <div className="bg-midnight-900/60 backdrop-blur-sm rounded-xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="text-6xl">🏆</span>
            </div>
            <div className="relative z-10">
              <div className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">達成クエスト</div>
              <div className="text-4xl font-bold text-amber-400 drop-shadow-sm font-mono">{completedQuests}</div>
            </div>
          </div>
        </div>

        {/* Report Generation Form */}
        <div className="bg-midnight-900/40 rounded-2xl p-8 mb-8 border border-white/5">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <span className="text-magic-gold">✨</span> レポート生成
          </h3>

          <div className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-3 pl-1 uppercase tracking-wider">レポート種類</label>
              <div className="flex gap-3 bg-black/20 p-1.5 rounded-xl w-fit border border-white/5">
                {(['weekly', 'monthly', 'yearly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`px-6 py-2.5 rounded-lg font-bold transition-all duration-300 ${formData.type === type
                      ? 'bg-magic-gold text-midnight-900 shadow-lg shadow-amber-900/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {getReportTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 pl-1 uppercase tracking-wider">開始日</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 pl-1 uppercase tracking-wider">終了日</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white transition-all cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || !currentCharacter}
              className="w-full bg-gradient-to-r from-magic-gold to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 disabled:shadow-none flex items-center justify-center gap-2 group"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
                  <span>レポートを生成</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Current Report Display */}
        {currentReport && (
          <div className="bg-midnight-900/80 backdrop-blur-md rounded-2xl p-8 mb-8 border border-magic-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-magic-gold/5 to-transparent rounded-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">{getReportTypeLabel(currentReport.type)}レポート</h3>
                <p className="text-slate-400 font-mono">
                  {currentReport.period.start} 〜 {currentReport.period.end}
                </p>
              </div>
              <button
                onClick={() => setCurrentReport(null)}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* AI Summary */}
            <div className="bg-black/20 rounded-xl p-6 mb-8 border border-white/5 relative z-10">
              <h4 className="text-sm font-bold text-magic-cyan mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="text-lg">📝</span> 総評
              </h4>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                {currentReport.aiSummary}
              </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
              {/* Diary Stats */}
              <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-blue-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">📖</span> 日記統計
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">総日記数</span>
                    <span className="font-bold text-white font-mono text-lg">{currentReport.diaryStats.totalCount}件</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">平均文字数</span>
                    <span className="font-bold text-white font-mono text-lg">{currentReport.diaryStats.averageWordCount}字</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">総文字数</span>
                    <span className="font-bold text-white font-mono text-lg">{currentReport.diaryStats.totalWordsWritten}字</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">最長連続記録</span>
                    <span className="font-bold text-green-400 font-mono text-lg">{currentReport.diaryStats.longestStreak}日</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">記録率</span>
                    <span className="font-bold text-blue-400 font-mono text-lg">{currentReport.diaryStats.writingRate}%</span>
                  </div>
                </div>
              </div>

              {/* Emotion Stats */}
              <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-pink-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">😊</span> 感情統計
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">最も多い感情</span>
                    <span className="font-bold text-white text-lg">{getEmotionLabel(currentReport.emotionStats.mostCommon)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">ポジティブ率</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${currentReport.emotionStats.positiveRatio}%` }} />
                      </div>
                      <span className="font-bold text-green-400 font-mono text-lg">{currentReport.emotionStats.positiveRatio}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">ネガティブ率</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${currentReport.emotionStats.negativeRatio}%` }} />
                      </div>
                      <span className="font-bold text-red-400 font-mono text-lg">{currentReport.emotionStats.negativeRatio}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">ニュートラル率</span>
                    <span className="font-bold text-slate-400 font-mono text-lg">{currentReport.emotionStats.neutralRatio}%</span>
                  </div>
                </div>
              </div>

              {/* Character Growth */}
              <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-purple-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">⚔️</span> キャラクター成長
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">獲得経験値</span>
                    <span className="font-bold text-blue-400 font-mono text-lg">+{currentReport.characterGrowth.expGained} EXP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">レベル上昇</span>
                    <span className="font-bold text-purple-400 font-mono text-lg">+{currentReport.characterGrowth.levelsGained}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">獲得ゴールド</span>
                    <span className="font-bold text-amber-400 font-mono text-lg">+{currentReport.characterGrowth.goldEarned} G</span>
                  </div>
                </div>
              </div>

              {/* Quest Stats */}
              <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-amber-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">🎯</span> クエスト統計
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">完了</span>
                    <span className="font-bold text-green-400 font-mono text-lg">{currentReport.questStats.completed}件</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">進行中</span>
                    <span className="font-bold text-blue-400 font-mono text-lg">{currentReport.questStats.inProgress}件</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">失敗</span>
                    <span className="font-bold text-red-400 font-mono text-lg">{currentReport.questStats.failed}件</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors">
                    <span className="text-slate-400">達成率</span>
                    <span className="font-bold text-amber-400 font-mono text-lg">{currentReport.questStats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              {/* Emotion Trend Chart */}
              <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">📈</span> 感情トレンド
                </h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={(() => {
                      const chart = currentReport.charts.emotionTrend;
                      return chart.labels.map((label, index) => ({
                        date: label,
                        sentiment: chart.datasets[0]?.data[index] || 0
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={12}
                        tick={{ fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tick={{ fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          color: '#f8fafc'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sentiment"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#fff' }}
                        name="感情スコア"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Writing Frequency Chart */}
              <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">📊</span> 記録頻度
                </h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                      const chart = currentReport.charts.writingFrequency;
                      return chart.labels.map((label, index) => ({
                        date: label,
                        count: chart.datasets[0]?.data[index] || 0
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={12}
                        tick={{ fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tick={{ fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          color: '#f8fafc'
                        }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        name="日記数"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Past Reports List */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <span className="text-2xl">⏳</span> 過去のレポート
          </h3>

          {reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-midnight-900/30 rounded-xl border border-dashed border-white/5">
              <p>まだレポートが生成されていません。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-midnight-900/40 border border-white/5 rounded-xl p-5 hover:bg-midnight-800/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-bold text-slate-200 group-hover:text-magic-gold transition-colors">{getReportTypeLabel(report.type)}レポート</span>
                      <span className="text-sm font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {report.period.start} 〜 {report.period.end}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span>🕒 生成: {new Date(report.generatedAt).toLocaleString('ja-JP')}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleViewReport(report)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 hover:text-white text-slate-300 rounded-lg transition-colors text-sm font-bold border border-white/5 hover:border-white/20"
                    >
                      📄 表示
                    </button>
                    <button
                      onClick={() => setReportToDeleteId(report.id)}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg transition-colors text-sm font-bold"
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

      <AlertDialog open={!!reportToDeleteId} onOpenChange={(open) => !open && setReportToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>レポートの削除</AlertDialogTitle>
            <AlertDialogDescription>
              このレポートを削除してもよろしいですか？<br />
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
