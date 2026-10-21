import React from 'react';
import { 
  Sparkles, 
  Code2, 
  PenTool, 
  Palette, 
  Briefcase, 
  Megaphone,
  Atom,
  Bot
} from 'lucide-react';

interface CategoryGridProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

interface CategoryTile {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  darkBg: string;
}

const CATEGORIES: CategoryTile[] = [
  {
    id: '',
    label: 'All Prompts',
    icon: Sparkles,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    darkBg: 'dark:bg-blue-950/50 dark:text-blue-400',
  },
  {
    id: 'Coding',
    label: 'Coding & Dev',
    icon: Code2,
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    darkBg: 'dark:bg-indigo-950/50 dark:text-indigo-400',
  },
  {
    id: 'Writing',
    label: 'Writing & Docs',
    icon: PenTool,
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    darkBg: 'dark:bg-violet-950/50 dark:text-violet-400',
  },
  {
    id: 'Design',
    label: 'Art & Design',
    icon: Palette,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    darkBg: 'dark:bg-amber-950/50 dark:text-amber-400',
  },
  {
    id: 'Business',
    label: 'Business & PM',
    icon: Briefcase,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    darkBg: 'dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  {
    id: 'Marketing',
    label: 'Marketing & SEO',
    icon: Megaphone,
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    darkBg: 'dark:bg-rose-950/50 dark:text-rose-400',
  },
  {
    id: 'Research',
    label: 'Research & Sci',
    icon: Atom,
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    darkBg: 'dark:bg-cyan-950/50 dark:text-cyan-400',
  },
  {
    id: 'AI Agents',
    label: 'AI Agents',
    icon: Bot,
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-600',
    darkBg: 'dark:bg-sky-950/50 dark:text-sky-400',
  },
];

const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <section className="mb-6" aria-label="Quick Category Explorer">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Categories
        </span>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory('')}
            className="text-xs font-medium text-[#0066ff] hover:underline dark:text-blue-400"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Horizontally scrollable minimalist pill chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-subtle">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id || 'all'}
              type="button"
              onClick={() => onSelectCategory(isSelected && cat.id !== '' ? '' : cat.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                isSelected
                  ? 'bg-[#0066ff] text-white font-semibold shadow-sm'
                  : 'bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-navy-600 hover:bg-slate-50/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
