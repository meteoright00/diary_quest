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
      <header className="bg-transparent border-b border-white/5 px-8 py-5 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-magic-gold to-magic-orange drop-shadow-sm tracking-tight">Diary Quest</h1>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center mt-1 text-slate-400 hover:text-magic-cyan transition-colors"
              title="このページについて"
            >
              <HelpCircle size={20} />
            </button>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <div className="flex items-center gap-2 bg-midnight-900/30 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-slate-400">Level</span>
              <span className="text-magic-cyan font-bold text-base">
                {currentCharacter?.level.current || 1}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-midnight-900/30 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-slate-400">EXP</span>
              <span className="text-blue-300 font-mono">
                {currentCharacter?.level.exp || 0} <span className="text-slate-600">/</span> {currentCharacter?.level.expToNextLevel || 100}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-midnight-900/30 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-slate-400">Gold</span>
              <span className="text-magic-gold font-mono">
                {currentCharacter?.currency.gold || 0} G
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
