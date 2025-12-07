import { useState } from 'react';
import type { Diary } from '@diary-quest/core/types';

interface DiaryDetailModalProps {
  diary: Diary;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (diaryId: string) => void;
}

export default function DiaryDetailModal({
  diary,
  isOpen,
  onClose,
  onToggleFavorite,
}: DiaryDetailModalProps) {
  const [isStoryMetadataExpanded, setIsStoryMetadataExpanded] = useState(false);

  if (!isOpen) return null;

  const emotionMap: Record<string, string> = {
    joy: '喜び',
    sadness: '悲しみ',
    anger: '怒り',
    anxiety: '不安',
    calm: '穏やか',
    excitement: '興奮',
    fatigue: '疲労',
  };

  const sentimentMap: Record<string, string> = {
    positive: 'ポジティブ',
    neutral: '中立',
    negative: 'ネガティブ',
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-midnight-900/95 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-midnight-900/95 backdrop-blur-md border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📖</span>
              <span className="text-magic-cyan font-mono">{diary.date}</span>
            </h2>
            <button
              onClick={() => onToggleFavorite(diary.id)}
              className={`text-2xl transition-transform hover:scale-110 ${diary.isFavorite ? 'text-magic-gold drop-shadow-glow' : 'text-slate-600 hover:text-magic-gold/50'
                }`}
            >
              {diary.isFavorite ? '★' : '☆'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rewards */}
          <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-xl p-5 border border-amber-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-lg font-bold mb-3 text-amber-200 flex items-center gap-2">
              <span className="text-xl">💎</span> 獲得報酬
            </h3>
            <div className="flex gap-8 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-bold">経験値:</span>
                <span className="font-bold text-green-400 font-mono text-lg">+{diary.rewards.exp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-bold">ゴールド:</span>
                <span className="font-bold text-magic-gold font-mono text-lg">+{diary.rewards.gold}</span>
              </div>
              {diary.rewards.items && diary.rewards.items.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 font-bold">アイテム:</span>
                  <span className="font-bold text-purple-400 font-mono text-lg">
                    {diary.rewards.items.length}個
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Original Content */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/5">
            <h3 className="text-lg font-bold mb-3 text-slate-300 flex items-center gap-2">
              <span>📝</span> 元の日記
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {diary.originalContent}
            </p>
          </div>

          {/* Converted Content */}
          <div className="bg-white/5 rounded-xl p-6 border border-magic-gold/20 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
            <h3 className="text-lg font-bold mb-3 text-magic-gold flex items-center gap-2">
              <span className="text-xl drop-shadow-glow">⚔️</span> 冒険記
            </h3>
            <p className="text-slate-200 whitespace-pre-wrap leading-relaxed font-serif text-lg tracking-wide">
              {diary.convertedContent}
            </p>
          </div>

          {/* Emotion Analysis */}
          {diary.emotionAnalysis && (
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold mb-4 text-purple-200 flex items-center gap-2">
                <span className="text-xl">💭</span> 感情分析
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1 uppercase tracking-wide">主要な感情</span>
                  <span className="font-bold text-purple-300 text-lg">
                    {emotionMap[diary.emotionAnalysis.primary] || diary.emotionAnalysis.primary}
                  </span>
                </div>
                <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1 uppercase tracking-wide">総合評価</span>
                  <span className="font-bold text-blue-300 text-lg">
                    {sentimentMap[diary.emotionAnalysis.overallSentiment] ||
                      diary.emotionAnalysis.overallSentiment}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {Object.entries(diary.emotionAnalysis.scores).map(([emotion, score]) => {
                  const emotionLabel = emotionMap[emotion] || emotion;
                  return (
                    <div key={emotion} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-24 font-medium">{emotionLabel}</span>
                      <div className="flex-1 bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500 rounded-full"
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

              {diary.emotionAnalysis.encouragementMessage && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                  <div className="text-2xl">🧚</div>
                  <p className="text-sm text-amber-100 leading-relaxed italic">
                    "{diary.emotionAnalysis.encouragementMessage}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Story Metadata (Collapsible) */}
          {diary.storyMetadata && (
            <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-xl border border-emerald-500/20 overflow-hidden">
              <button
                onClick={() => setIsStoryMetadataExpanded(!isStoryMetadataExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-bold text-emerald-200 flex items-center gap-2">
                  <span className="text-xl">📚</span> ストーリー情報
                </h3>
                <span className={`text-emerald-300 text-xl transition-transform duration-300 ${isStoryMetadataExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isStoryMetadataExpanded && (
                <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="border-t border-white/5 pt-4"></div>
                  {diary.storyMetadata.location && (
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1 font-bold">📍 場所</span>
                      <span className="font-bold text-emerald-300 text-lg">
                        {diary.storyMetadata.location}
                      </span>
                    </div>
                  )}

                  {diary.storyMetadata.companions && diary.storyMetadata.companions.length > 0 && (
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-2 font-bold">👥 同行者</span>
                      <div className="flex flex-wrap gap-2">
                        {diary.storyMetadata.companions.map((companion, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-200"
                          >
                            {companion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {diary.storyMetadata.ongoingEvents && diary.storyMetadata.ongoingEvents.length > 0 && (
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-2 font-bold">⚡ 進行中の出来事</span>
                      <ul className="space-y-2">
                        {diary.storyMetadata.ongoingEvents.map((event, index) => (
                          <li key={index} className="text-sm text-emerald-200 flex items-start gap-2">
                            <span className="text-emerald-500 mt-1">•</span>
                            {event}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diary.storyMetadata.significantItems && diary.storyMetadata.significantItems.length > 0 && (
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <span className="text-xs text-slate-400 block mb-2 font-bold">🎒 重要なアイテム</span>
                      <div className="flex flex-wrap gap-2">
                        {diary.storyMetadata.significantItems.map((item, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-lg text-sm text-teal-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/5">
            <h3 className="text-lg font-bold mb-4 text-slate-300 flex items-center gap-2">
              <span>📊</span> メタデータ
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                <span className="text-xs text-slate-400 block mb-1">文字数</span>
                <span className="font-bold text-white font-mono">{diary.metadata.characterCount}</span>
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                <span className="text-xs text-slate-400 block mb-1">単語数</span>
                <span className="font-bold text-white font-mono">{diary.metadata.wordCount}</span>
              </div>
              {diary.metadata.isStreak && (
                <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20 text-center col-span-2 md:col-span-1">
                  <span className="text-xs text-orange-300 block mb-1">連続記録</span>
                  <span className="font-bold text-orange-400 font-mono">
                    🔥 {diary.metadata.streakCount}日
                  </span>
                </div>
              )}
              <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center col-span-2 md:col-span-1">
                <span className="text-xs text-slate-400 block mb-1">作成日時</span>
                <span className="font-bold text-white text-xs">
                  {new Date(diary.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {diary.tags && diary.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-2">
              {diary.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-300 hover:bg-blue-500/20 transition-colors cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-midnight-900/95 backdrop-blur-md border-t border-white/10 p-4 flex justify-end z-10">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors border border-white/10"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
