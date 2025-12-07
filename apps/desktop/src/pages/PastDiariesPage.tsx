import { useState, useEffect } from 'react';
import { useDiaryStore } from '@/store';
import { useCharacterStore } from '@/store/characterStore';
import type { Diary } from '@diary-quest/core/types';
import DiaryDetailModal from '@/components/diary/DiaryDetailModal';

export default function PastDiariesPage() {
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { diaries, updateDiary, isLoading: isDiariesLoading, loadDiariesByCharacter } = useDiaryStore();
  const { currentCharacter } = useCharacterStore();

  // Load diaries when page is opened or character changes
  useEffect(() => {
    if (currentCharacter) {
      loadDiariesByCharacter(currentCharacter.id);
    }
  }, [currentCharacter, loadDiariesByCharacter]);

  const handleDiaryClick = (diary: Diary) => {
    setSelectedDiary(diary);
    setIsDetailOpen(true);
  };

  const handleToggleFavorite = async (diaryId: string) => {
    const diary = diaries.find((d) => d.id === diaryId);
    if (diary) {
      const newFavoriteState = !diary.isFavorite;
      const updatedDiary = { ...diary, isFavorite: newFavoriteState };

      // Update state immediately for UI responsiveness
      updateDiary(diaryId, { isFavorite: newFavoriteState });

      // Save to database
      await useDiaryStore.getState().saveDiary(updatedDiary);

      if (selectedDiary?.id === diaryId) {
        setSelectedDiary({ ...selectedDiary, isFavorite: newFavoriteState });
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-panel rounded-2xl p-8 border-magic-cyan/20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white drop-shadow-md flex items-center gap-3">
            <span className="text-4xl drop-shadow-glow">📚</span> 過去の日記
          </h2>
          <div className="text-sm text-slate-400">
            全 {diaries.length} 件の記録
          </div>
        </div>

        {isDiariesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-magic-cyan border-t-transparent rounded-full animate-spin"></div>
            <p className="text-magic-cyan font-bold animate-pulse">読み込み中...</p>
          </div>
        ) : diaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diaries.map((diary) => (
              <div
                key={diary.id}
                onClick={() => handleDiaryClick(diary)}
                className="bg-midnight-900/60 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-magic-cyan/30 hover:bg-midnight-800/80 hover:shadow-glow-cyan transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-magic-cyan/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-magic-cyan/10 transition-colors" />

                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-bold text-lg text-slate-100 truncate group-hover:text-magic-cyan transition-colors">
                      {diary.title || `冒険の記録`}
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(diary.date).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(diary.id);
                    }}
                    className={`text-xl transition-all hover:scale-125 active:scale-95 ${diary.isFavorite
                      ? 'text-magic-gold drop-shadow-glow'
                      : 'text-slate-600 hover:text-magic-gold/50'
                      }`}
                  >
                    {diary.isFavorite ? '★' : '☆'}
                  </button>
                </div>

                <div className="relative z-10">
                  <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-4 min-h-[4.5em]">
                    {diary.convertedContent || diary.originalContent}
                  </p>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <span className="text-2xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                      {diary.emotionAnalysis?.overallSentiment === 'positive' ? '☀️' :
                        diary.emotionAnalysis?.overallSentiment === 'negative' ? '🌧️' : '☁️'}
                    </span>
                    <div className="flex-1 text-right">
                      <span className="inline-block px-2 py-0.5 bg-magic-gold/10 border border-magic-gold/20 rounded text-xs text-magic-gold font-mono font-bold">
                        +{diary.rewards.exp} EXP
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 bg-midnight-900/20 rounded-2xl border-2 border-dashed border-white/5">
            <span className="text-6xl mb-4 block opacity-30">📜</span>
            <p className="text-lg mb-2">まだ日記がありません</p>
            <p className="text-sm opacity-60">最初の冒険を記録して、物語を始めましょう！</p>
          </div>
        )}
      </div>

      {/* Diary Detail Modal */}
      {selectedDiary && (
        <DiaryDetailModal
          diary={selectedDiary}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}
