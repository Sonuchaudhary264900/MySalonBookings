import React, { useState } from 'react';
import { Edit2, Trash2, AlertTriangle, Clock, IndianRupee, Tag, Power } from 'lucide-react';

const ServiceCard = ({ service, onEdit, onDelete, onToggle, loading = false }) => {
  const isActive      = service.isActive !== false;
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);

  const handleToggleClick = () => {
    if (isActive) setShowConfirm(true);
    else onToggle(service._id || service.id, true);
  };

  const confirmDeactivate = () => {
    setShowConfirm(false);
    onToggle(service._id || service.id, false);
  };

  const confirmDelete = () => {
    setShowDelete(false);
    onDelete(service._id || service.id);
  };

  return (
    <>
      <div className={`group relative bg-white dark:bg-gray-900 border rounded-2xl p-4
        hover:shadow-lg dark:hover:shadow-gray-900/80 hover:-translate-y-0.5
        transition-all duration-200 flex flex-col gap-3
        ${isActive
          ? 'border-gray-100 dark:border-gray-800'
          : 'border-gray-100 dark:border-gray-800 opacity-60'
        }`}>

        {/* Active glow accent */}
        {isActive && (
          <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-2xl
            bg-gradient-to-r from-indigo-500/0 via-indigo-500/60 to-violet-500/0
            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {/* Top row: name + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-bold truncate ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {service.name}
              </h3>
              {!isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium shrink-0">
                  Inactive
                </span>
              )}
            </div>
            {service.category && (
              <div className="flex items-center gap-1 mt-0.5">
                <Tag className="w-3 h-3 text-indigo-400 dark:text-indigo-500" />
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">{service.category}</span>
              </div>
            )}
          </div>

          {/* Toggle */}
          {onToggle && (
            <button
              onClick={handleToggleClick}
              disabled={loading}
              title={isActive ? 'Deactivate service' : 'Activate service'}
              className={`relative shrink-0 w-10 h-5 rounded-full transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
                disabled:opacity-40 cursor-pointer
                ${isActive
                  ? 'bg-indigo-500 focus:ring-offset-white dark:focus:ring-offset-gray-900'
                  : 'bg-gray-200 dark:bg-gray-700'
                }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md
                transition-transform duration-300
                ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          )}
        </div>

        {/* Price + Duration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {service.basePrice ?? service.price ?? '—'}
            </span>
          </div>
          {service.duration && (
            <>
              <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{service.duration} min</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onEdit(service)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold
              bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-indigo-50 dark:hover:bg-indigo-950/50
              hover:text-indigo-600 dark:hover:text-indigo-400
              border border-gray-200 dark:border-gray-700
              hover:border-indigo-200 dark:hover:border-indigo-800
              transition-all duration-150 disabled:opacity-40"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold
              bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-red-50 dark:hover:bg-red-950/40
              hover:text-red-600 dark:hover:text-red-400
              border border-gray-200 dark:border-gray-700
              hover:border-red-200 dark:hover:border-red-800
              transition-all duration-150 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Deactivate Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          icon={<Power className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-100 dark:bg-amber-950"
          title="Disable Service?"
          body={<>
            <span className="font-semibold text-gray-800 dark:text-gray-200">"{service.name}"</span>
            {' '}will be hidden from customers and cannot be booked.
          </>}
          confirmLabel="Yes, Disable"
          confirmCls="bg-amber-500 hover:bg-amber-600 text-white"
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmDeactivate}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDelete && (
        <ConfirmModal
          icon={<Trash2 className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-100 dark:bg-red-950"
          title="Delete Service?"
          body={<>
            <span className="font-semibold text-gray-800 dark:text-gray-200">"{service.name}"</span>
            {' '}will be permanently removed. This cannot be undone.
          </>}
          confirmLabel="Delete Forever"
          confirmCls="bg-red-600 hover:bg-red-700 text-white"
          onCancel={() => setShowDelete(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
};

/* ─── Shared confirm modal ───────────────────────────────────── */
const ConfirmModal = ({ icon, iconBg, title, body, confirmLabel, confirmCls, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
      rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{body}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm font-medium text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmCls}`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ServiceCard;
