import React from "react";
import { Heart, Search, X, SlidersHorizontal, Sparkles } from "lucide-react";

interface SearchHeaderProps {
  query?: string;
  tags: string[];
  selectedTag: string;
  showFavorites: boolean;
  onQueryChange?: (query: string) => void;
  onTagChange: (tag: string) => void;
  onToggleFavorites: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  query = "",
  tags,
  selectedTag,
  showFavorites,
  onQueryChange,
  onTagChange,
  onToggleFavorites,
}) => {
  return (
    <section id="prompt-filters" className="mb-6 space-y-3" aria-label="Prompt search and filters">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search 
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" 
            aria-hidden="true" 
          />
          <input
            id="prompt-search"
            type="search"
            value={query}
            onChange={event => onQueryChange?.(event.target.value)}
            placeholder="Search prompts, categories, tags, or AI models..."
            aria-label="Search prompts"
            className="w-full h-10 pl-10 pr-10 text-xs sm:text-sm bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange?.("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Favorites toggle */}
        <button
          type="button"
          onClick={onToggleFavorites}
          className={`ml-2 h-10 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-medium border transition-all ${
            showFavorites
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 shadow-sm"
              : "bg-white dark:bg-navy-900 border-slate-200/80 dark:border-navy-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800"
          }`}
          title="Filter Favorites"
        >
          <Heart className={`w-3.5 h-3.5 ${showFavorites ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Favorites</span>
        </button>
      </div>

      {/* Filter Chips: Horizontal Scrollable Pills matching Reference */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-subtle" aria-label="Quick filters">
        {/* 'All' Chip */}
        <button
          type="button"
          onClick={() => {
            onTagChange("");
            if (showFavorites) onToggleFavorites();
          }}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
            !selectedTag && !showFavorites
              ? "bg-[#0066ff] text-white font-semibold shadow-md shadow-blue-500/20"
              : "bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          }`}
        >
          All
        </button>

        {/* Favorite Pill */}
        <button
          type="button"
          onClick={onToggleFavorites}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
            showFavorites
              ? "bg-red-500 text-white font-semibold shadow-md shadow-red-500/20"
              : "bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${showFavorites ? "fill-white text-white" : "text-red-500"}`} />
          <span>Liked</span>
        </button>

        {/* Tags Pills */}
        {tags.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onTagChange(isSelected ? "" : tag)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-[#0066ff] text-white font-semibold shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SearchHeader;
