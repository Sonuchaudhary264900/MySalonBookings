import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Loader2 } from 'lucide-react';

const MAX_CHARS = 500;

const ReplyBox = ({ initial = '', onSave, onCancel, saving }) => {
  const [text, setText]   = useState(initial);
  const textareaRef       = useRef(null);
  const remaining         = MAX_CHARS - text.length;
  const isEmpty           = !text.trim();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!isEmpty && !saving) onSave(text.trim());
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => e.target.value.length <= MAX_CHARS && setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Write a thoughtful reply to this review…"
          className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800
            bg-indigo-50/50 dark:bg-indigo-950/30 text-sm text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500 resize-none
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
            transition-all"
        />
        <span className={`absolute bottom-2 right-3 text-[10px] font-medium ${
          remaining < 50 ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'
        }`}>
          {remaining}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Tip: Ctrl+Enter to save · Esc to cancel
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => !isEmpty && !saving && onSave(text.trim())}
          disabled={isEmpty || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl
            bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold
            hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-500/20
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            : <><Send className="w-3.5 h-3.5" /> Save Reply</>
          }
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
            bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
};

export default ReplyBox;
