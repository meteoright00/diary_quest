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
    <aside className="w-64 bg-midnight-900/50 backdrop-blur-md border-r border-white/5 relative z-50">
      <div className="p-6">
        <div className="mb-10 text-center">
          <div className="w-28 h-28 mx-auto mb-6 relative group">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-magic-gold rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse-glow"></div>

            {/* Emblem Container */}
            <div className="relative w-full h-full rounded-full border-2 border-magic-gold/30 bg-midnight-800 shadow-2xl overflow-hidden ring-2 ring-magic-gold/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              {/* Inner Circle Pattern */}
              <div className="absolute inset-2 rounded-full border border-white/10"></div>

              {/* Class Icon */}
              <div className="transform group-hover:rotate-12 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                {getClassIcon()}
              </div>
            </div>

            {/* Level Badge */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-midnight-900 text-magic-gold text-xs font-bold px-4 py-1 rounded-full border border-magic-gold/50 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10">
              Lv.{currentCharacter?.level.current || 1}
            </div>
          </div>

          <h2 className="font-bold text-xl text-white tracking-wide drop-shadow-md">
            {currentCharacter?.basicInfo.name || '冒険者'}
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            {currentCharacter?.basicInfo.title || '駆け出しの旅人'}
          </p>
          <p className="text-xs text-magic-cyan mt-2 uppercase tracking-widest font-semibold">
            {currentCharacter?.basicInfo.class || 'Traveler'}
          </p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden group ${currentPage === item.id
                ? 'text-white bg-gradient-to-r from-magic-cyan/20 to-transparent border-l-4 border-magic-cyan shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className={`text-xl transition-transform duration-300 ${currentPage === item.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'group-hover:scale-110'}`}>{item.icon}</span>
              <span className="font-medium tracking-wide">{item.label}</span>

              {/* Hover Glow */}
              {currentPage !== item.id && (
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
