import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const btnCls = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-sm shadow-red-200 dark:shadow-red-900/50'
    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/50';

  const iconBg = variant === 'danger'
    ? 'bg-red-100 dark:bg-red-950/50'
    : 'bg-indigo-100 dark:bg-indigo-950/50';

  const iconCls = variant === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : 'text-indigo-600 dark:text-indigo-400';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm animate-[zoom-in_0.15s_ease]">
        <style>{`@keyframes zoom-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <AlertTriangle className={`w-5 h-5 ${iconCls}`} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white pr-6">{title}</h3>
          </div>

          {message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
          )}

          <div className="flex gap-3 justify-end mt-5">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnCls}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
