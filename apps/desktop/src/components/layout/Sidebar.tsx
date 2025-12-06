import { useCharacterStore } from '@/store/characterStore';
import { Compass } from 'lucide-react';

type Page = 'welcome' | 'home' | 'diary' | 'pastDiaries' | 'character' | 'quests' | 'story' | 'reports' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate?: (page: Page) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { currentCharacter } = useCharacterStore();

  const handleNavigate = (page: Page) => {
    onNavigate?.(page);
  };

  // Helper to get icon based on class/job
  const getClassIcon = () => {
    return <Compass className="w-12 h-12 text-amber-100" />;
  };

  const menuItems: { id: Page; label: string; icon: string }[] = [
    { id: 'home', label: 'ホーム', icon: '🏠' },
    { id: 'diary', label: '日記', icon: '📖' },
    { id: 'pastDiaries', label: '過去の日記', icon: '📚' },
    { id: 'character', label: 'キャラクター', icon: '⚔️' },
    { id: 'quests', label: 'クエスト', icon: '🎯' },
    { id: 'story', label: 'ストーリー', icon: '📜' },
    { id: 'reports', label: 'レポート', icon: '📊' },
    { id: 'settings', label: '設定', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700">
      <div className="p-6">
        <div className="mb-8 text-center">
          <div className="w-28 h-28 mx-auto mb-4 relative group">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-amber-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>

            {/* Emblem Container */}
            <div className="relative w-full h-full rounded-full border-4 border-gray-700 bg-gray-800 shadow-xl overflow-hidden ring-2 ring-amber-600/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              {/* Inner Circle Pattern */}
              <div className="absolute inset-2 rounded-full border border-gray-600/50"></div>

              {/* Class Icon */}
              <div className="transform group-hover:rotate-12 transition-transform duration-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                {getClassIcon()}
              </div>
            </div>

            {/* Level Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-900 text-amber-500 text-xs font-bold px-3 py-0.5 rounded-full border border-amber-600/50 shadow-lg z-10">
              Lv.{currentCharacter?.level.current || 1}
            </div>
          </div>

          <h2 className="font-bold text-lg text-amber-100 tracking-wide">
            {currentCharacter?.basicInfo.name || '冒険者'}
          </h2>
          <p className="text-sm text-gray-400 font-medium">
            {currentCharacter?.basicInfo.title || '駆け出しの旅人'}
          </p>
          <p className="text-xs text-amber-500/80 mt-1 uppercase tracking-wider">
            {currentCharacter?.basicInfo.class || 'Traveler'}
          </p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === item.id
                ? 'bg-amber-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
