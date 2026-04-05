import React, { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight,
  Heart, Eye, MessageCircle, Star, Edit2, Trash2,
  Tag, Play, AlertTriangle,
} from 'lucide-react';
import { getGalleryMediaUrl, isGalleryVideo } from './galleryUtils';

/* ── Stat tile inside the right panel ── */
const StatTile = ({ icon: Icon, value, label, color }) => (
  <div className={`flex flex-col items-center p-2.5 rounded-xl ${color}`}>
    <Icon className="w-4 h-4 mb-1 opacity-70" />
    <span className="text-sm font-bold leading-none mb-0.5">{value}</span>
    <span className="text-[10px] opacity-60">{label}</span>
  </div>
);

/**
 * PreviewModal — glassmorphism full-preview modal.
 *
 * Left panel  : large image or video player
 * Right panel : analytics, tags, quick actions
 *
 * @param {object[]}  photos        - list of items to navigate between
 * @param {number}    initialIndex  - which item to open first
 * @param {string}    coverId       - current cover photo id
 * @param {object}    analyticsMap  - { [url]: analyticsRow }
 * @param {function}  onClose
 * @param {function}  onDelete      - (photo) => void
 * @param {function}  onSetCover    - (photo) => void  [async ok]
 * @param {function}  onEdit        - (photo, index, list) => void — opens ImageModal
 */
export default function PreviewModal({ photos, initialIndex = 0, coverId, analyticsMap = {}, onClose, onDelete, onSetCover, onEdit }) {
  const [index, setIndex] = useState(initialIndex);

  const photo     = photos[index] ?? null;
  const url       = photo ? getGalleryMediaUrl(photo) : '';
  const isVideo   = photo ? isGalleryVideo(photo) : false;
  const isCover   = photo?._id === coverId;
  const canDelete = !photo?._galleryOrphan;
  const analytics = analyticsMap[url] ?? null;

  const fmt = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)),               []);
  const next = useCallback(() => setIndex(i => Math.min(photos.length - 1, i + 1)), [photos.length]);

  /* Keyboard nav */
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape')      { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowLeft')   { e.preventDefault(); prev(); }
      if (e.key === 'ArrowRight')  { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!photo) return null;

  const hasTags       = (photo.tags?.length ?? 0) > 0;
  const hasCategories = (photo.reelCategories?.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />

      {/* ── Modal shell ── */}
      <div
        className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row
          bg-white/10 dark:bg-white/5 backdrop-blur-2xl
          border border-white/20 dark:border-white/10
          rounded-3xl overflow-hidden shadow-2xl
          max-h-[92vh]"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full
            bg-black/40 backdrop-blur-sm border border-white/20 text-white
            hover:bg-black/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ────────────── LEFT: Media ────────────── */}
        <div className="relative flex-1 bg-black min-h-56 flex items-center justify-center overflow-hidden">

          {isVideo ? (
            <video
              src={url}
              controls
              className="w-full h-full object-contain"
              style={{ maxHeight: '92vh' }}
            />
          ) : url ? (
            <img
              src={url}
              alt={photo.caption || ''}
              className="w-full h-full object-contain"
              style={{ maxHeight: '92vh' }}
              onError={() => {}}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <AlertTriangle className="w-10 h-10" />
              <span className="text-sm">Media unavailable</span>
            </div>
          )}

          {/* Video play hint overlay (non-controls state on poster) */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Prev */}
          {index > 0 && (
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white
                hover:bg-black/70 transition-colors z-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Next */}
          {index < photos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white
                hover:bg-black/70 transition-colors z-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full
              bg-black/50 backdrop-blur-sm text-white text-xs font-semibold z-20">
              {index + 1} / {photos.length}
            </div>
          )}
        </div>

        {/* ────────────── RIGHT: Info panel ────────────── */}
        <div className="w-full md:w-72 lg:w-80 flex flex-col
          bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
          border-t md:border-t-0 md:border-l border-white/20 dark:border-white/5
          overflow-y-auto">

          <div className="p-5 space-y-5 flex-1">

            {/* Cover badge */}
            {isCover && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/30">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Featured Cover Photo</span>
              </div>
            )}

            {/* Caption */}
            {photo.caption && (
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                {photo.caption}
              </p>
            )}

            {/* Gallery tags */}
            {hasTags && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {photo.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full
                        bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-700/30
                        text-indigo-600 dark:text-indigo-400 text-xs font-semibold"
                    >
                      <Tag className="w-2.5 h-2.5" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reel categories */}
            {hasCategories && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {photo.reelCategories.map(cat => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-full
                        bg-violet-50 dark:bg-violet-950/50 border border-violet-200/60 dark:border-violet-700/30
                        text-violet-600 dark:text-violet-400 text-xs font-semibold"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics */}
            {analytics && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Analytics</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile
                    icon={Eye}
                    value={fmt(analytics.viewCount || 0)}
                    label="Views"
                    color="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200"
                  />
                  <StatTile
                    icon={Heart}
                    value={fmt(analytics.likeCount || 0)}
                    label="Likes"
                    color="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                  />
                  <StatTile
                    icon={MessageCircle}
                    value={fmt(analytics.commentCount || 0)}
                    label="Comments"
                    color="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                  />
                </div>
              </div>
            )}

            {/* Placeholder when no data */}
            {!hasTags && !hasCategories && !analytics && !photo.caption && !isCover && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center pt-2">
                Click "Edit Details" to add a caption, tags, or reel settings.
              </p>
            )}
          </div>

          {/* ── Actions footer ── */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800/60 space-y-2">
            {/* Edit Details */}
            <button
              onClick={() => onEdit(photo, index, photos)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                transition-colors shadow-sm shadow-indigo-500/20"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Details
            </button>

            {/* Set as cover (photos only) */}
            {!isCover && !isVideo && (
              <button
                onClick={() => onSetCover(photo)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50
                  border border-amber-200/60 dark:border-amber-700/30
                  text-amber-700 dark:text-amber-400 text-sm font-semibold transition-colors"
              >
                <Star className="w-3.5 h-3.5" /> Set as Cover
              </button>
            )}

            {/* Delete */}
            {canDelete && (
              <button
                onClick={() => { onDelete(photo); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50
                  border border-red-200/60 dark:border-red-700/30
                  text-red-600 dark:text-red-400 text-sm font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
