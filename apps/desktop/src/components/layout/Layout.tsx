import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

type Page = 'welcome' | 'home' | 'diary' | 'pastDiaries' | 'character' | 'quests' | 'story' | 'reports' | 'settings';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate?: (page: Page) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex flex-col flex-1">
        <Header currentPage={currentPage} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
