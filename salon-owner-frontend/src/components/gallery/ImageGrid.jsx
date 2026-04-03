import { useState } from 'react';
import { Eye, Trash2, Star, Tag, Play, AlertTriangle, X } from 'lucide-react';

const TAG_COLORS = {
  Haircut: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
  Beard:   'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
  Facial:  'bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400',
  Spa:     'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  Nails:   'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
  Makeup:  'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
};

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
);

/* ── Single image/video card ── */
const ImageCard = ({ photo, isCover, onView, onDelete }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const url     = photo.url || photo.imageUrl || photo.image || '';
  const tag     = photo.tags?.[0];
  const isVideo = photo.type === 'video';

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    setConfirmOpen(false);
    onDelete(photo);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setConfirmOpen(false);
  };

  return (
    <div
      onClick={() => !confirmOpen && onView(photo)}
      className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer
        bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-black/10
        dark:hover:shadow-black/40 transition-all duration-300"
    >
      {/* Media */}
      {isVideo ? (
        <>
          <video
            ref={el => { if (el) el.muted = true; }}
            src={url}
            playsInline
            preload="metadata"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center
              group-hover:scale-110 transition-transform shadow-lg">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={url}
          alt={photo.caption || 'Gallery photo'}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full
          bg-amber-500 text-white text-[10px] font-bold shadow-md">
          <Star className="w-2.5 h-2.5" /> Cover
        </div>
      )}

      {/* Tag badge */}
      {tag && !confirmOpen && (
        <div className={`absolute top-2 ${isCover ? 'left-16' : 'left-2'}
          px-2 py-0.5 rounded-full text-[10px] font-semibold ${TAG_COLORS[tag] || TAG_COLORS.Haircut}
          opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
          {tag}
        </div>
      )}

      {/* Action buttons */}
      {!confirmOpen && (
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between
          translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100
          transition-all duration-300">

          {photo.caption && (
            <p className="text-white text-xs font-medium truncate flex-1 mr-2 drop-shadow">
              {photo.caption}
            </p>
          )}

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onView(photo); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm
                hover:bg-white/30 text-white transition-colors"
              title="View"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDeleteClick}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/80 backdrop-blur-sm
                hover:bg-red-600/90 text-white transition-colors"
              title={isVideo ? 'Delete video' : 'Delete photo'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation overlay ── */}
      {confirmOpen && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3
            bg-black/75 backdrop-blur-sm p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-white text-xs font-bold text-center leading-tight">
            Delete this {isVideo ? 'video' : 'photo'}?
          </p>
          <p className="text-white/50 text-[10px] text-center">This cannot be undone.</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleCancel}
              className="flex-1 py-1.5 rounded-xl border border-white/20 text-white/80
                text-[11px] font-semibold hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white
                text-[11px] font-semibold transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main ImageGrid ── */
const ImageGrid = ({ photos, loading, coverId, activeTag, onView, onDelete }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const filtered = activeTag
    ? photos.filter(p => p.tags?.includes(activeTag))
    : photos;

  if (filtered.length === 0 && activeTag) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
          <Tag className="w-6 h-6 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No photos tagged "{activeTag}"</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Open a photo to add tags</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {filtered.map(photo => (
        <ImageCard
          key={photo._id || photo.url}
          photo={photo}
          isCover={photo._id === coverId}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default ImageGrid;
