import React from 'react';
import { LayoutGrid, Image, Film, TrendingUp, TrendingDown, Star } from 'lucide-react';

const MAIN_FILTERS = [
  { id: 'all',     label: 'All',            icon: LayoutGrid   },
  { id: 'photos',  label: 'Photos',         icon: Image        },
  { id: 'reels',   label: 'Reels',          icon: Film         },
  { id: 'popular', label: 'Popular',        icon: TrendingUp   },
  { id: 'low',     label: 'Low Engagement', icon: TrendingDown },
  { id: 'cover',   label: 'Cover',          icon: Star         },
];

/**
 * @param {object} props
 * @param {string}   props.activeFilter     - one of MAIN_FILTERS ids
 * @param {function} props.onFilterChange
 * @param {Array}    props.tagFilters       - [{ tag, count }]
 * @param {string}   props.activeTag
 * @param {function} props.onTagChange
 */
export default function FilterBar({ activeFilter, onFilterChange, tagFilters = [], activeTag, onTagChange }) {
  const showTagRow = tagFilters.length > 0 && activeFilter !== 'reels' && activeFilter !== 'cover';

  return (
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8
      bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md
      border-b border-gray-100 dark:border-white/5 py-2.5 space-y-2">

      {/* Main filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {MAIN_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold
              whitespace-nowrap shrink-0 transition-all duration-200
              ${activeFilter === id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.03]'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Tag sub-filter row */}
      {showTagRow && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">Tags:</span>

          <button
            onClick={() => onTagChange(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 shrink-0
              ${!activeTag
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            All
          </button>

          {tagFilters.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => onTagChange(tag === activeTag ? null : tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 shrink-0
                ${activeTag === tag
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
            >
              {tag} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
