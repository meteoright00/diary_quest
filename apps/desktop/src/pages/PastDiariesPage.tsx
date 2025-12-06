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
      console.log('currentCharacter load')
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
    <div className="p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">📚 過去の日記</h2>

        {isDiariesLoading ? (
          <p className="text-gray-400">読み込み中...</p>
        ) : diaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {diaries.map((diary) => (
              <div
                key={diary.id}
                onClick={() => handleDiaryClick(diary)}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-200 truncate pr-8">
                    {diary.title || `冒険の記録 (${diary.date})`}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(diary.id);
                    }}
                    className={`text-lg transition-transform hover:scale-110 ${diary.isFavorite ? 'text-yellow-400' : 'text-gray-500'
                      }`}
                  >
                    {diary.isFavorite ? '⭐' : '☆'}
                  </button>
                </div>
                <p className="text-sm text-gray-400 line-clamp-3">
                  {diary.convertedContent || diary.originalContent}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">まだ日記がありません。最初の冒険を記録しましょう！</p>
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
