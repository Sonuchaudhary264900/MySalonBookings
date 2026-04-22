// BulkActionBar — floats at bottom when items are selected
// Props: selectedIds, onClear, actions: [{ label, icon: LucideIcon, onClick, variant }]

import { X } from 'lucide-react';

export default function BulkActionBar({ selectedIds = [], onClear, actions = [] }) {
  if (!selectedIds.length) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
      flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl
      animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>

      <div className="w-px h-4 bg-gray-600" />

      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <button
            key={i}
            onClick={() => action.onClick(selectedIds)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition
              ${action.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
          >
            {Icon && <Icon size={13} />}
            {action.label}
          </button>
        );
      })}

      <button onClick={onClear} className="ml-1 text-gray-400 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
