import React from 'react';
import {
  Gift, Gem, Crown, Star, Zap, Sparkles, Heart, Shield,
  Award, Scissors, Leaf, Flame, Target, TrendingUp, Layers, Users,
} from 'lucide-react';

/* ── Icon registry ────────────────────────────────────────────── */
export const ICON_MAP = {
  gift:     { Icon: Gift,       label: 'Gift'     },
  gem:      { Icon: Gem,        label: 'Gem'      },
  crown:    { Icon: Crown,      label: 'Crown'    },
  star:     { Icon: Star,       label: 'Star'     },
  zap:      { Icon: Zap,        label: 'Zap'      },
  sparkles: { Icon: Sparkles,   label: 'Sparkles' },
  heart:    { Icon: Heart,      label: 'Heart'    },
  shield:   { Icon: Shield,     label: 'Shield'   },
  award:    { Icon: Award,      label: 'Award'    },
  scissors: { Icon: Scissors,   label: 'Scissors' },
  leaf:     { Icon: Leaf,       label: 'Leaf'     },
  flame:    { Icon: Flame,      label: 'Flame'    },
  target:   { Icon: Target,     label: 'Target'   },
  trending: { Icon: TrendingUp, label: 'Growth'   },
  layers:   { Icon: Layers,     label: 'Bundle'   },
  users:    { Icon: Users,      label: 'Members'  },
};

/**
 * Renders a Lucide icon from an icon key (e.g. 'gem', 'crown').
 * Falls back gracefully for legacy emoji strings stored in the DB.
 */
export function PkgIcon({ iconKey, size = 20, className = '', strokeWidth = 1.75 }) {
  const entry = ICON_MAP[iconKey];
  if (entry) {
    const { Icon } = entry;
    return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
  }
  // Legacy emoji stored in DB — render as-is without breaking layout
  if (iconKey && typeof iconKey === 'string') {
    return (
      <span
        aria-hidden="true"
        style={{ fontSize: size * 0.85, lineHeight: 1, display: 'flex', alignItems: 'center' }}
      >
        {iconKey}
      </span>
    );
  }
  return <Gift size={size} className={className} strokeWidth={strokeWidth} />;
}

/**
 * Premium icon picker grid — drop-in replacement for the old emoji grid.
 *
 * Props:
 *   value    — currently selected icon key (e.g. 'gem')
 *   onChange — called with the new icon key
 *   accent   — 'indigo' (packages) | 'violet' (memberships)
 */
export default function IconSelector({ value, onChange, accent = 'indigo' }) {
  const isViolet = accent === 'violet';

  const activeRing = isViolet
    ? 'bg-violet-100 dark:bg-violet-950/70 ring-2 ring-violet-500 shadow-md shadow-violet-500/20'
    : 'bg-indigo-100 dark:bg-indigo-950/70 ring-2 ring-indigo-500 shadow-md shadow-indigo-500/20';

  const activeIcon = isViolet
    ? 'text-violet-600 dark:text-violet-400'
    : 'text-indigo-600 dark:text-indigo-400';

  const hoverBg = isViolet
    ? 'hover:bg-violet-50 dark:hover:bg-violet-950/30'
    : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30';

  return (
    <div className="grid grid-cols-8 gap-2">
      {Object.entries(ICON_MAP).map(([key, { Icon, label }]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => onChange(key)}
            className={`
              h-10 w-full rounded-xl flex items-center justify-center
              transition-all duration-200 active:scale-90
              ${active
                ? `${activeRing} scale-[1.12]`
                : `bg-gray-100 dark:bg-white/[0.06] ${hoverBg} hover:scale-105`
              }
            `}
          >
            <Icon
              size={17}
              strokeWidth={1.75}
              className={active ? activeIcon : 'text-gray-500 dark:text-gray-400'}
            />
          </button>
        );
      })}
    </div>
  );
}
