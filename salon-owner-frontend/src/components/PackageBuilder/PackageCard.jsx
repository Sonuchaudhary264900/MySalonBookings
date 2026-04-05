import React from 'react';
import { Check, Clock, Edit2, Trash2, Flame, Star, Gem, Bell } from 'lucide-react';
import { PkgIcon } from '../MembershipBuilder/IconSelector';

const TAG_META = {
  popular:     { label: 'Popular',     gradient: 'from-orange-400 to-rose-500',  Icon: Flame },
  recommended: { label: 'Recommended', gradient: 'from-blue-500 to-indigo-500',  Icon: Star  },
  best_value:  { label: 'Best Value',  gradient: 'from-emerald-400 to-teal-500', Icon: Gem   },
};

export default function PackageCard({ pkg, onEdit, onDelete, onToggle, onNotify }) {
  const savings    = (pkg.originalPrice && pkg.discountedPrice)
    ? pkg.originalPrice - pkg.discountedPrice : 0;
  const tag = TAG_META[pkg.tag];

  return (
    <div
      className={`group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl overflow-hidden
        transition-all duration-300
        ${pkg.isActive
          ? 'border border-indigo-100/80 dark:border-indigo-900/40 shadow-md shadow-indigo-500/8 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/20'
          : 'border border-gray-200 dark:border-gray-800 opacity-60'
        }`}
    >
      {/* Gradient top strip — thicker on hover */}
      <div
        className={`h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500
          transition-all duration-300 group-hover:h-[4px]
          ${!pkg.isActive && 'opacity-40'}`}
      />

      {/* Badge — absolute top-right */}
      {tag && pkg.isActive && (
        <div className="absolute top-4 right-4 z-10">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${tag.gradient} shadow-sm`}
          >
            <tag.Icon size={10} strokeWidth={2.5} />
            {tag.label}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-5">

        {/* Icon + Name */}
        <div className={`flex items-start gap-3 mb-4 ${tag && pkg.isActive ? 'pr-28' : ''}`}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border border-indigo-100/60 dark:border-indigo-800/20 flex items-center justify-center shrink-0 shadow-sm">
            <PkgIcon iconKey={pkg.icon} size={22} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 dark:text-white text-[15px] leading-tight">
              {pkg.name}
            </h3>
            {pkg.description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                {pkg.description}
              </p>
            )}
          </div>
        </div>

        {/* Price block */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-100/60 dark:border-indigo-800/20">
          <div className="flex items-end gap-2 mb-1 flex-wrap">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none tabular-nums">
              ₹{pkg.discountedPrice?.toLocaleString('en-IN')}
            </span>
            {pkg.originalPrice > 0 && pkg.originalPrice !== pkg.discountedPrice && (
              <span className="text-sm text-gray-400 dark:text-gray-500 line-through mb-0.5">
                ₹{pkg.originalPrice?.toLocaleString('en-IN')}
              </span>
            )}
            {pkg.discountPercent > 0 && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full mb-0.5">
                {pkg.discountPercent}% OFF
              </span>
            )}
          </div>
          {savings > 0 && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              You save ₹{savings.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Services list */}
        {pkg.services?.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
              Included Services
            </p>
            <div className="space-y-1.5">
              {pkg.services.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{s.serviceName}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">₹{s.price}</span>
                </div>
              ))}
              {pkg.services.length > 4 && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 ml-6 font-medium">
                  +{pkg.services.length - 4} more services
                </p>
              )}
            </div>
          </div>
        )}

        {/* Duration */}
        {pkg.totalDuration > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{pkg.totalDuration} min total session</span>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <label className="relative inline-flex items-center cursor-pointer mr-auto">
          <input
            type="checkbox"
            checked={pkg.isActive}
            onChange={() => onToggle(pkg)}
            className="sr-only peer"
          />
          <div
            className={`w-9 h-5 rounded-full transition-all duration-200 shadow-inner
              ${pkg.isActive ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}
              after:content-[''] after:absolute after:top-0.5 after:left-0.5
              after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow
              after:transition-transform
              ${pkg.isActive ? 'after:translate-x-4' : 'after:translate-x-0'}`}
          />
          <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {pkg.isActive ? 'Active' : 'Off'}
          </span>
        </label>
        <button
          onClick={() => onNotify(pkg)}
          title="Notify customers"
          className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-all duration-150"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(pkg)}
          className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-150"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(pkg._id)}
          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-150"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
