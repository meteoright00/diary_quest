import { useEffect, useState } from 'react';
import type { RandomEvent } from '@diary-quest/core/types';

interface SaveResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: {
        expGained: number;
        goldGained: number;
        leveledUp: boolean;
        newLevel: number;
        levelsGained: number;
        questCompleted: boolean;
        questRewards: { exp: number; gold: number };
        randomEvent: RandomEvent | null;
        encouragementMessage: string;
    };
}

export default function SaveResultModal({
    isOpen,
    onClose,
    results,
}: SaveResultModalProps) {
    const [showContent, setShowContent] = useState(false);
    const [expProgress, setExpProgress] = useState(0);

    useEffect(() => {
        if (isOpen) {
            // Small delay for entrance animation
            setTimeout(() => setShowContent(true), 100);
            // Animate EXP bar
            setTimeout(() => setExpProgress(100), 500);
        } else {
            setShowContent(false);
            setExpProgress(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const totalExp = results.expGained + (results.questCompleted ? results.questRewards.exp : 0) + (results.randomEvent?.rewards?.exp || 0);
    const totalGold = results.goldGained + (results.questCompleted ? results.questRewards.gold : 0) + (results.randomEvent?.rewards?.gold || 0);

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className={`bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl transform transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-amber-900/50 to-purple-900/50 p-8 text-center">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/patterns/noise.png')] opacity-10"></div>

                    {results.leveledUp ? (
                        <div className="animate-bounce-slow">
                            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-lg mb-2">
                                LEVEL UP!
                            </h2>
                            <p className="text-2xl text-white font-bold">
                                Lv.{results.newLevel - results.levelsGained} <span className="text-amber-400">→</span> Lv.{results.newLevel}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">
                                日記を保存しました
                            </h2>
                            <p className="text-gray-300">冒険の記録が刻まれました</p>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Rewards Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-sm mb-1">獲得経験値</span>
                            <div className="text-3xl font-bold text-blue-400 flex items-center gap-2 mb-2">
                                <span>💎</span> +{totalExp}
                            </div>
                            {/* EXP Progress Bar */}
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${expProgress}%` }}
                                />
                            </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-sm mb-1">獲得ゴールド</span>
                            <div className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
                                <span>💰</span> +{totalGold}
                            </div>
                        </div>
                    </div>

                    {/* Quest Completion */}
                    {results.questCompleted && (
                        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-4 flex items-center gap-4 animate-pulse-slow">
                            <div className="text-4xl">🎊</div>
                            <div>
                                <h3 className="text-lg font-bold text-green-300">クエスト達成！</h3>
                                <p className="text-green-200/80 text-sm">目標を達成し、追加報酬を獲得しました！</p>
                            </div>
                        </div>
                    )}

                    {/* Random Event */}
                    {results.randomEvent && results.randomEvent.type !== 'equipment_found' && (
                        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/50 rounded-lg p-5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6xl">🎲</span>
                            </div>
                            <h3 className="text-lg font-bold text-purple-300 mb-2 flex items-center gap-2">
                                <span>✨</span> ランダムイベント発生
                            </h3>
                            <h4 className="text-xl font-bold text-white mb-2">{results.randomEvent.title}</h4>
                            <p className="text-gray-300 leading-relaxed text-sm">
                                {results.randomEvent.description}
                            </p>
                        </div>
                    )}

                    {/* Encouragement Message */}
                    {results.encouragementMessage && (
                        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 flex gap-3">
                            <div className="text-2xl">💬</div>
                            <p className="text-amber-200/90 text-sm italic leading-relaxed">
                                "{results.encouragementMessage}"
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-4 rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        冒険を続ける
                    </button>
                </div>
            </div>
        </div>
    );
}
