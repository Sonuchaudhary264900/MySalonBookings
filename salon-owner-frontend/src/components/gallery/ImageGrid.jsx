import { useState, useRef, useCallback } from 'react';
import { Eye, Trash2, Star, Tag, Play, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import {
  cloudinaryVideoPosterUrl,
  getGalleryMediaUrl,
  isGalleryVideo,
} from './galleryUtils';

const TAG_COLORS = {
  Haircut: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
  Beard:   'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
  Facial:  'bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400',
  Spa:     'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  Nails:   'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
  Makeup:  'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
};

/* ── Video thumbnail: tries Cloudinary JPEG first, falls back to actual <video> frame ── */
const VideoThumb = ({ url }) => {
  const [cloudFailed, setCloudFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const thumbUrl = cloudinaryVideoPosterUrl(url);

  // Video element ref — seek to first frame after metadata loads
  // muted must be set via DOM ref, not JSX (browsers ignore JSX muted attribute)
  const videoRef = useCallback((el) => {
    if (!el) return;
    el.muted = true;
    el.onloadedmetadata = () => {
      el.currentTime = 0.1;
    };
  }, []);

  if (!url) {
    return (
      <div className="absolute inset-0 w-full h-full bg-gray-700 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-gray-500" />
      </div>
    );
  }

  if (!cloudFailed && thumbUrl) {
    return (
      <img
        src={thumbUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={() => setCloudFailed(true)}
      />
    );
  }

  // Fallback: real <video> element renders its own first frame.
  // preload="auto" is required — "metadata" downloads no video data so no frame
  // is ever painted. "auto" lets the browser download enough to render the frame.
  if (!videoFailed) {
    return (
      <video
        ref={videoRef}
        src={url}
        preload="auto"
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={() => setVideoFailed(true)}
      />
    );
  }

  // All failed — placeholder
  return (
    <div className="absolute inset-0 w-full h-full bg-gray-700 flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
        <p className="text-[10px] text-gray-400">Failed to load</p>
      </div>
    </div>
  );
};

/* ── Single image/video card ── */
const ImageCard = ({ photo, isCover, onView, onDelete, layout = 'square' }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const url     = getGalleryMediaUrl(photo);
  const tag     = photo?.tags?.[0];
  const isVideo = isGalleryVideo(photo);
  const aspectClass = layout === 'reels' ? 'aspect-[9/16]' : 'aspect-square';

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

  // No URL and not a video — show error tile
  if (!url && !isVideo) {
    return (
      <div className={`group relative ${aspectClass} rounded-2xl overflow-hidden cursor-pointer
        bg-gray-800 shadow-sm flex items-center justify-center`}
      >
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-[10px] text-gray-400">No image URL</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => !confirmOpen && onView(photo)}
      className={`group relative ${aspectClass} rounded-2xl overflow-hidden cursor-pointer
        bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-black/10
        dark:hover:shadow-black/40 transition-all duration-300`}
    >
      {/* ── Media ── */}
      {isVideo ? (
        <>
          {/* Dark gradient always behind thumbnail */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
          <VideoThumb url={url} />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors">
            <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center
              border-2 border-white/70 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <>
          {!imageFailed ? (
            <img
              src={url}
              alt={photo?.caption || 'Gallery photo'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400">Failed to load image</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hover gradient overlay */}
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
          {photo?.caption && (
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

      {/* Delete confirmation overlay */}
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
const ImageGrid = ({ photos, loading, coverId, activeTag, onView, onDelete, layout = 'square' }) => {
  if (loading) {
    const skelAspect = layout === 'reels' ? 'aspect-[9/16]' : 'aspect-square';
    return (
      <div className={`grid gap-3 sm:gap-4 ${layout === 'reels' ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`${skelAspect} rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse`} />
        ))}
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

  const gridCls =
    layout === 'reels'
      ? 'grid grid-cols-3 gap-1.5 sm:gap-2'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4';

  return (
    <div className={gridCls}>
      {filtered.map(photo => (
        <ImageCard
          key={photo?._id || getGalleryMediaUrl(photo) || 'item'}
          photo={photo}
          isCover={photo?._id === coverId}
          onView={onView}
          onDelete={onDelete}
          layout={layout}
        />
      ))}
    </div>
  );
};

export default ImageGrid;
