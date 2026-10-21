import React from 'react';
import { Compass, LayoutGrid, Heart, Plus, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabSelect: (tab: string) => void;
  onOpenCreate: () => void;
  favoritesCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabSelect,
  onOpenCreate,
  favoritesCount,
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-navy-800 px-4 py-1.5 safe-bottom shadow-sm"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative h-12">
        {/* Discover / Home */}
        <button
          type="button"
          onClick={() => onTabSelect('discover')}
          className={`flex items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'discover'
              ? 'text-[#0057D6]'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          aria-label="Discover"
          title="Discover"
        >
          <Compass className="w-5 h-5" />
        </button>

        {/* Categories */}
        <button
          type="button"
          onClick={() => onTabSelect('categories')}
          className={`flex items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'categories'
              ? 'text-[#0057D6]'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          aria-label="Categories"
          title="Categories"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>

        {/* Center Action Button: Create Prompt */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="w-10 h-10 rounded-full bg-[#0057D6] hover:bg-[#0047B0] text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-transform active:scale-90"
          aria-label="Create prompt"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Favorites */}
        <button
          type="button"
          onClick={() => onTabSelect('favorites')}
          className={`relative flex items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'favorites'
              ? 'text-red-500'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          aria-label="Saved Prompts"
          title="Saved Prompts"
        >
          <Heart className={`w-5 h-5 ${activeTab === 'favorites' ? 'fill-red-500 text-red-500' : ''}`} />
          {favoritesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => onTabSelect('settings')}
          className={`flex items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'settings'
              ? 'text-[#0057D6]'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
