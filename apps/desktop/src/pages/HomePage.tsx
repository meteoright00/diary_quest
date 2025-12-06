import { useEffect, useMemo } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useDiaryStore } from '@/store/diaryStore';
import { useQuestStore } from '@/store/questStore';
import type { Diary, Quest } from '@diary-quest/core/types';

interface HomePageProps {
    onNavigate: (page: 'diary' | 'character' | 'quests' | 'pastDiaries') => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
    const { currentCharacter } = useCharacterStore();
    const { diaries, loadDiariesByCharacter } = useDiaryStore();
    const { quests, loadActiveQuests } = useQuestStore();

    useEffect(() => {
        if (currentCharacter) {
            loadDiariesByCharacter(currentCharacter.id);
            loadActiveQuests(currentCharacter.id);
        }
    }, [currentCharacter, loadDiariesByCharacter, loadActiveQuests]);

    const expData = useMemo(() => {
        if (!currentCharacter) return null;
        const { exp, expToNextLevel } = currentCharacter.level;
        const progress = (exp / expToNextLevel) * 100;
        return { nextLevelExp: expToNextLevel, progress };
    }, [currentCharacter]);

    const recentDiaries = useMemo(() => {
        const sorted = [...diaries]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return sorted.slice(0, 3);
    }, [diaries]);

    const getDiaryTitle = (diary: Diary) => {
        return diary.title || '無題の冒険';
    };

    if (!currentCharacter) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-2xl p-8">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="text-9xl">🛡️</span>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="text-6xl bg-slate-800 rounded-full p-4 border-4 border-amber-500/30 shadow-xl">
                            🛡️
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold border border-amber-500/30">
                                    Lv.{currentCharacter.level.current}
                                </span>
                                <span className="text-slate-400">{currentCharacter.basicInfo.class}</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-2">{currentCharacter.basicInfo.name}</h1>
                            <div className="flex items-center gap-4 text-slate-300">
                                <div className="flex items-center gap-2">
                                    <span>💰</span>
                                    <span className="font-mono text-amber-400">{currentCharacter.currency.gold.toLocaleString()} G</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>💎</span>
                                    <span className="font-mono text-blue-400">{currentCharacter.level.exp} / {expData?.nextLevelExp} EXP</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onNavigate('diary')}
                        className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">✍️</span>
                            <span>冒険に出る（日記を書く）</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-amber-500/50 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                {/* EXP Bar */}
                <div className="mt-8 relative h-4 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-1000 ease-out"
                        style={{ width: `${expData?.progress}%` }}
                    >
                        <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-b from-white/20 to-transparent" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Quests Widget */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>📜</span> 進行中のクエスト
                        </h2>
                        <button
                            onClick={() => onNavigate('quests')}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            すべて見る →
                        </button>
                    </div>

                    <div className="space-y-3">
                        {quests.length > 0 ? (
                            quests.slice(0, 3).map((quest: Quest) => (
                                <div key={quest.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-200">{quest.title}</h3>
                                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                                            {quest.difficulty}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${(quest.progress.current / quest.progress.target) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>進行中のクエストはありません</p>
                                <button
                                    onClick={() => onNavigate('quests')}
                                    className="mt-2 text-amber-500 hover:text-amber-400 text-sm"
                                >
                                    クエストを受注する
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Widget */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>📖</span> 最近の冒険
                        </h2>
                        <button
                            onClick={() => onNavigate('pastDiaries')}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            履歴を見る →
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentDiaries.length > 0 ? (
                            recentDiaries.map((diary: Diary) => {
                                return (
                                    <div key={diary.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => onNavigate('pastDiaries')}>
                                        <div className="text-2xl opacity-80">
                                            {diary.emotionAnalysis?.overallSentiment === 'positive' ? '☀️' :
                                                diary.emotionAnalysis?.overallSentiment === 'negative' ? '🌧️' : '☁️'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-200 truncate">{getDiaryTitle(diary)}</h3>
                                            <p className="text-xs text-slate-400">{new Date(diary.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-amber-500 text-sm font-mono">
                                            +{diary.rewards.exp} EXP
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>まだ冒険の記録がありません</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
