// UndoToast — shows a dismissible toast with an Undo button for 5 seconds
// Usage:
//   import { showUndoToast } from './UndoToast';
//   const undo = showUndoToast('Booking cancelled', () => restoreBooking(id));

import toast from 'react-hot-toast';
import { Undo2 } from 'lucide-react';

export const showUndoToast = (message, onUndo, timeoutMs = 5000) => {
  let undoTriggered = false;

  const toastId = toast.custom(
    (t) => (
      <div className={`flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg
        transition-all ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="text-sm">{message}</span>
        <button
          onClick={() => {
            undoTriggered = true;
            toast.dismiss(toastId);
            onUndo?.();
          }}
          className="flex items-center gap-1 ml-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex-shrink-0"
        >
          <Undo2 size={13} /> Undo
        </button>
      </div>
    ),
    { duration: timeoutMs, position: 'bottom-center' }
  );

  return {
    dismiss: () => toast.dismiss(toastId),
    wasUndone: () => undoTriggered,
  };
};
