import { useState } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { HelpCircle } from 'lucide-react';
import { helpContent } from '@/lib/helpContent';
import HelpModal from '@/components/help/HelpModal';

interface HeaderProps {
  currentPage?: string;
}

export default function Header({ currentPage }: HeaderProps) {
  const { currentCharacter } = useCharacterStore();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Default to home if no page or unknown page
  const currentHelp = currentPage && helpContent[currentPage]
    ? helpContent[currentPage]
    : helpContent['home'];

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-amber-400">Diary Quest</h1>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center mt-1 text-gray-400 hover:text-amber-400 transition-colors"
              title="このページについて"
            >
              <HelpCircle size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Level</span>
              <span className="font-bold text-green-400">
                {currentCharacter?.level.current || 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">EXP</span>
              <span className="font-bold text-blue-400">
                {currentCharacter?.level.exp || 0} / {currentCharacter?.level.expToNextLevel || 100}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Gold</span>
              <span className="font-bold text-yellow-400">
                {currentCharacter?.currency.gold || 0}
              </span>
            </div>
          </div>
        </div>
      </header>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        content={currentHelp}
      />
    </>
  );
}
