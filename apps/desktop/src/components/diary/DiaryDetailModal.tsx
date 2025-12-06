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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">📖 {diary.date}</h2>
            <button
              onClick={() => onToggleFavorite(diary.id)}
              className={`text-2xl transition-transform hover:scale-110 ${
                diary.isFavorite ? 'text-yellow-400' : 'text-gray-500'
              }`}
            >
              {diary.isFavorite ? '⭐' : '☆'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rewards */}
          <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 rounded-lg p-4 border border-amber-700/50">
            <h3 className="text-lg font-bold mb-3 text-amber-200">💎 獲得報酬</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">経験値:</span>
                <span className="font-bold text-green-400">+{diary.rewards.exp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">ゴールド:</span>
                <span className="font-bold text-yellow-400">+{diary.rewards.gold}</span>
              </div>
              {diary.rewards.items && diary.rewards.items.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">アイテム:</span>
                  <span className="font-bold text-purple-400">
                    {diary.rewards.items.length}個
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Original Content */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-gray-200">📝 元の日記</h3>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {diary.originalContent}
            </p>
          </div>

          {/* Converted Content */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-amber-200">⚔️ 冒険記</h3>
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              {diary.convertedContent}
            </p>
          </div>

          {/* Emotion Analysis */}
          {diary.emotionAnalysis && (
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-700/50">
              <h3 className="text-lg font-bold mb-3 text-purple-200">💭 感情分析</h3>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-800/50 rounded px-3 py-2">
                  <span className="text-sm text-gray-400">主要な感情: </span>
                  <span className="font-bold text-purple-300">
                    {emotionMap[diary.emotionAnalysis.primary] || diary.emotionAnalysis.primary}
                  </span>
                </div>
                <div className="bg-gray-800/50 rounded px-3 py-2">
                  <span className="text-sm text-gray-400">総合評価: </span>
                  <span className="font-bold text-blue-300">
                    {sentimentMap[diary.emotionAnalysis.overallSentiment] ||
                      diary.emotionAnalysis.overallSentiment}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {Object.entries(diary.emotionAnalysis.scores).map(([emotion, score]) => {
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

              {diary.emotionAnalysis.encouragementMessage && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                  <p className="text-sm text-amber-200">
                    💬 {diary.emotionAnalysis.encouragementMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Story Metadata (Collapsible) */}
          {diary.storyMetadata && (
            <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg border border-emerald-700/50 overflow-hidden">
              <button
                onClick={() => setIsStoryMetadataExpanded(!isStoryMetadataExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
              >
                <h3 className="text-lg font-bold text-emerald-200">📚 ストーリー情報</h3>
                <span className="text-emerald-300 text-xl">
                  {isStoryMetadataExpanded ? '▼' : '▶'}
                </span>
              </button>

              {isStoryMetadataExpanded && (
                <div className="p-4 pt-0 space-y-3">
                  {diary.storyMetadata.location && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <span className="text-sm text-gray-400">📍 場所: </span>
                      <span className="font-bold text-emerald-300">
                        {diary.storyMetadata.location}
                      </span>
                    </div>
                  )}

                  {diary.storyMetadata.companions && diary.storyMetadata.companions.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <span className="text-sm text-gray-400">👥 同行者: </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diary.storyMetadata.companions.map((companion, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-emerald-900/50 border border-emerald-700/50 rounded text-sm text-emerald-200"
                          >
                            {companion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {diary.storyMetadata.ongoingEvents && diary.storyMetadata.ongoingEvents.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <span className="text-sm text-gray-400">⚡ 進行中の出来事: </span>
                      <ul className="mt-2 space-y-1">
                        {diary.storyMetadata.ongoingEvents.map((event, index) => (
                          <li key={index} className="text-sm text-emerald-200 pl-4">
                            • {event}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diary.storyMetadata.significantItems && diary.storyMetadata.significantItems.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <span className="text-sm text-gray-400">🎒 重要なアイテム: </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diary.storyMetadata.significantItems.map((item, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-teal-900/50 border border-teal-700/50 rounded text-sm text-teal-200"
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
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-gray-200">📊 メタデータ</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">文字数: </span>
                <span className="font-bold text-gray-200">{diary.metadata.characterCount}</span>
              </div>
              <div>
                <span className="text-sm text-gray-400">単語数: </span>
                <span className="font-bold text-gray-200">{diary.metadata.wordCount}</span>
              </div>
              {diary.metadata.isStreak && (
                <div>
                  <span className="text-sm text-gray-400">連続記録: </span>
                  <span className="font-bold text-orange-400">
                    🔥 {diary.metadata.streakCount}日
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-400">作成日時: </span>
                <span className="font-bold text-gray-200">
                  {new Date(diary.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {diary.tags && diary.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {diary.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-900/30 border border-blue-700/50 rounded-full text-sm text-blue-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
