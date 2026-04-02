import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, Film, X, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { useGalleryUpload } from '../../context/GalleryUploadContext';

export default function FloatingUploadBar() {
  const { uploads, clearDone } = useGalleryUpload();
  const [collapsed, setCollapsed] = useState(false);

  if (!uploads.length) return null;

  const activeCount  = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const doneCount    = uploads.filter(u => u.status === 'done').length;
  const errorCount   = uploads.filter(u => u.status === 'error').length;
  const allFinished  = activeCount === 0;
  const totalPct     = Math.round(
    uploads.reduce((s, u) => s + (u.status === 'done' ? 100 : (u.progress || 0)), 0) / uploads.length
  );

  return (
    <>
      {/* keyframe for spinner — injected once */}
      <style>{`@keyframes fub-spin{to{transform:rotate(360deg)}}`}</style>

      <div className={`fixed bottom-6 right-6 z-50 rounded-2xl border shadow-2xl overflow-hidden
        bg-gray-900 border-gray-700 transition-all duration-300`}
        style={{ width: collapsed ? 'auto' : 320 }}
      >
        {/* ── Header row ── */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-left
            hover:bg-white/5 transition-colors"
        >
          {!allFinished && (
            <Loader2 className="w-4 h-4 text-indigo-400 shrink-0"
              style={{ animation: 'fub-spin 1s linear infinite' }} />
          )}
          {allFinished && errorCount === 0 && (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {allFinished && errorCount > 0 && (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}

          <span className="flex-1 text-[13px] font-semibold text-gray-100 truncate">
            {!allFinished
              ? `Uploading ${activeCount} file${activeCount !== 1 ? 's' : ''}…`
              : `${doneCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`}
          </span>

          {allFinished && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); clearDone(); }}
              className="w-6 h-6 flex items-center justify-center rounded-lg
                text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}

          {collapsed
            ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
            : <ChevronUp   className="w-4 h-4 text-gray-500 shrink-0" />}
        </button>

        {/* ── Overall progress bar (while uploading) ── */}
        {!collapsed && !allFinished && (
          <div className="mx-4 h-0.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${totalPct}%` }}
            />
          </div>
        )}

        {/* ── File list ── */}
        {!collapsed && (
          <div className="max-h-60 overflow-y-auto py-1">
            {uploads.map(u => (
              <div key={u.id} className="flex items-center gap-2.5 px-4 py-2">

                {/* Thumbnail */}
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-800 shrink-0 relative">
                  {u.preview
                    ? <img src={u.preview} alt="" className="w-full h-full object-cover" />
                    : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="w-4 h-4 text-indigo-400" />
                      </div>
                    )}
                  {u.mediaType === 'video' && u.preview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Film className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Name + progress */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-200 truncate">{u.file.name}</p>

                  {u.status === 'uploading' && (
                    <>
                      <div className="mt-1 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-indigo-400 mt-0.5">{u.progress}%</p>
                    </>
                  )}
                  {u.status === 'pending'  && <p className="text-[10px] text-gray-500 mt-0.5">Waiting…</p>}
                  {u.status === 'done'     && <p className="text-[10px] text-emerald-400 mt-0.5">Done</p>}
                  {u.status === 'error'    && <p className="text-[10px] text-red-400 mt-0.5 truncate">{u.error}</p>}
                </div>

                {/* Status icon */}
                <div className="shrink-0">
                  {u.status === 'uploading' && (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400"
                      style={{ animation: 'fub-spin 1s linear infinite' }} />
                  )}
                  {u.status === 'pending'  && <Upload       className="w-3.5 h-3.5 text-gray-600" />}
                  {u.status === 'done'     && <CheckCircle  className="w-3.5 h-3.5 text-emerald-400" />}
                  {u.status === 'error'    && <AlertCircle  className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
