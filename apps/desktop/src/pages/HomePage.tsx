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
            <div className="relative overflow-hidden rounded-2xl glass-panel p-8 border-magic-cyan/30">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="text-9xl filter blur-sm">🛡️</span>
                </div>

                {/* Background Ambient Glow - Removed for readability */}
                {/* <div className="absolute -top-20 -right-20 w-96 h-96 bg-magic-cyan/10 rounded-full blur-3xl" /> */}
                {/* <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-magic-purple/20 rounded-full blur-3xl" /> */}

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                        <div className="text-6xl bg-midnight-900/80 rounded-full p-6 border-2 border-magic-gold/50 shadow-glow-gold relative group">
                            <span className="relative z-10">🛡️</span>
                            <div className="absolute inset-0 bg-magic-gold/20 rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-magic-gold/10 text-magic-gold rounded-full text-sm font-bold border border-magic-gold/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                                    Lv.{currentCharacter.level.current}
                                </span>
                                <span className="text-slate-300 font-medium tracking-wide">{currentCharacter.basicInfo.class}</span>
                            </div>
                            <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-md tracking-tight">{currentCharacter.basicInfo.name}</h1>
                            <div className="flex items-center gap-6 text-slate-300">
                                <div className="flex items-center gap-2 bg-midnight-900/40 px-3 py-1.5 rounded-lg border border-white/5">
                                    <span>💰</span>
                                    <span className="font-mono text-magic-gold text-lg">{currentCharacter.currency.gold.toLocaleString()} <span className="text-sm">G</span></span>
                                </div>
                                <div className="flex items-center gap-2 bg-midnight-900/40 px-3 py-1.5 rounded-lg border border-white/5">
                                    <span>💎</span>
                                    <span className="font-mono text-magic-cyan text-lg">{currentCharacter.level.exp} <span className="text-slate-500">/</span> {expData?.nextLevelExp} <span className="text-sm">EXP</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onNavigate('diary')}
                        className="group relative px-10 py-5 bg-gradient-to-r from-magic-orange to-red-500 hover:from-orange-400 hover:to-red-400 text-white rounded-2xl font-bold text-xl shadow-glow-orange transition-all hover:scale-105 active:scale-95 border-t border-white/20"
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <span className="text-2xl filter drop-shadow">✍️</span>
                            <span className="drop-shadow-sm">冒険に出る（日記を書く）</span>
                        </div>
                        {/* Shimmer Effect - Removed by user request */}
                        {/* <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" /> */}
                    </button>
                </div>

                {/* EXP Bar */}
                <div className="mt-10 relative">
                    <div className="flex justify-between text-xs text-slate-400 mb-1 px-1">
                        <span>Current EXP</span>
                        <span>Next Level</span>
                    </div>
                    <div className="h-4 bg-midnight-900/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
                        <div
                            className="absolute top-6 left-0 h-4 rounded-full bg-gradient-to-r from-blue-600 to-magic-cyan shadow-glow-cyan transition-all duration-1000 ease-out"
                            style={{ width: `${expData?.progress}%` }}
                        >
                            <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-b from-white/30 to-transparent" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Quests Widget */}
                <div className="glass-panel p-6 rounded-2xl hover:border-magic-cyan/30 transition-colors group">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <span className="text-2xl drop-shadow-glow">📜</span> 進行中のクエスト
                        </h2>
                        <button
                            onClick={() => onNavigate('quests')}
                            className="text-sm text-magic-cyan hover:text-cyan-300 transition-colors"
                        >
                            すべて見る →
                        </button>
                    </div>

                    <div className="space-y-4">
                        {quests.length > 0 ? (
                            quests.slice(0, 3).map((quest: Quest) => (
                                <div key={quest.id} className="bg-midnight-900/40 p-4 rounded-xl border border-white/5 hover:border-magic-cyan/20 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-slate-100">{quest.title}</h3>
                                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                                            {quest.difficulty}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-midnight-900 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                            style={{ width: `${(quest.progress.current / quest.progress.target) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-slate-500 bg-midnight-900/20 rounded-xl border-2 border-dashed border-slate-700/50">
                                <p className="mb-2">進行中のクエストはありません</p>
                                <button
                                    onClick={() => onNavigate('quests')}
                                    className="text-magic-gold hover:text-amber-300 font-medium"
                                >
                                    クエストを受注する
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Widget */}
                <div className="glass-panel p-6 rounded-2xl hover:border-magic-cyan/30 transition-colors group">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <span className="text-2xl drop-shadow-glow">📖</span> 最近の冒険
                        </h2>
                        <button
                            onClick={() => onNavigate('pastDiaries')}
                            className="text-sm text-magic-cyan hover:text-cyan-300 transition-colors"
                        >
                            履歴を見る →
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentDiaries.length > 0 ? (
                            recentDiaries.map((diary: Diary) => {
                                return (
                                    <div key={diary.id} className="flex items-center gap-4 p-4 bg-midnight-900/40 rounded-xl border border-white/5 hover:bg-midnight-800/60 hover:border-magic-cyan/30 transition-all cursor-pointer group/item" onClick={() => onNavigate('pastDiaries')}>
                                        <div className="text-3xl opacity-80 filter drop-shadow-md group-hover/item:scale-110 transition-transform">
                                            {diary.emotionAnalysis?.overallSentiment === 'positive' ? '☀️' :
                                                diary.emotionAnalysis?.overallSentiment === 'negative' ? '🌧️' : '☁️'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-100 truncate group-hover/item:text-magic-cyan transition-colors">{getDiaryTitle(diary)}</h3>
                                            <p className="text-xs text-slate-400">{new Date(diary.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-magic-gold font-mono font-bold bg-magic-gold/10 px-2 py-1 rounded border border-magic-gold/20">
                                            +{diary.rewards.exp} EXP
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 text-slate-500 bg-midnight-900/20 rounded-xl border-2 border-dashed border-slate-700/50">
                                <p>まだ冒険の記録がありません</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
