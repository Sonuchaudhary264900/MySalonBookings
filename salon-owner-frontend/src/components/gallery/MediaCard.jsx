import React, { useState, useCallback } from 'react';
import { Heart, Eye, Trash2, Star, Play, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { getGalleryMediaUrl, isGalleryVideo, cloudinaryVideoPosterUrl } from './galleryUtils';

/* ── Video thumbnail: Cloudinary JPEG → <video> frame fallback ── */
const VideoThumb = ({ url }) => {
  const [cloudFailed, setCloudFailed]   = useState(false);
  const [videoFailed, setVideoFailed]   = useState(false);
  const thumbUrl = cloudinaryVideoPosterUrl(url);

  const videoRef = useCallback((el) => {
    if (!el) return;
    el.muted = true;
    el.onloadedmetadata = () => { el.currentTime = 0.1; };
  }, []);

  if (!url) return (
    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
      <ImageIcon className="w-8 h-8 text-gray-600" />
    </div>
  );

  if (!cloudFailed && thumbUrl) return (
    <img
      src={thumbUrl}
      alt=""
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setCloudFailed(true)}
    />
  );

  if (!videoFailed) return (
    <video
      ref={videoRef}
      src={url}
      preload="auto"
      playsInline
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setVideoFailed(true)}
    />
  );

  return (
    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
      <AlertTriangle className="w-6 h-6 text-amber-500" />
    </div>
  );
};

/**
 * MediaCard — premium gallery card with hover action layer.
 *
 * @param {object}   photo          - gallery item
 * @param {boolean}  isCover        - render featured ring + badge
 * @param {object}   analytics      - reel analytics row for this item (optional)
 * @param {function} onView         - open preview modal
 * @param {function} onDelete       - delete item
 * @param {function} onSetCover     - set as cover photo
 * @param {number}   height         - card pixel height (masonry mode)
 * @param {boolean}  fillContainer  - use absolute positioning to fill parent (reels mode)
 */
export default function MediaCard({ photo, isCover, analytics, onView, onDelete, onSetCover, height = 300, fillContainer = false }) {
  const [imageFailed,    setImageFailed]    = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const url       = getGalleryMediaUrl(photo);
  const isVideo   = isGalleryVideo(photo);
  const canDelete = !photo?._galleryOrphan;
  const likes     = analytics?.likeCount ?? 0;
  const views     = analytics?.viewCount ?? 0;
  const fmt       = n => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  const rootStyle = fillContainer ? undefined : { height };
  const rootBase  = fillContainer ? 'absolute inset-0' : '';

  const card = (
    <div
      className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20 dark:hover:shadow-black/50
        ${isCover
          ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg shadow-amber-400/20 dark:shadow-amber-500/15'
          : 'shadow-sm dark:shadow-none'
        }
        ${rootBase}`}
      style={rootStyle}
      onClick={() => !confirmDelete && onView(photo)}
    >
      {/* ── Media layer ── */}
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900">
        {isVideo ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
            <VideoThumb url={url} />
          </>
        ) : (
          !imageFailed ? (
            <img
              src={url}
              alt={photo?.caption || ''}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
          )
        )}
      </div>

      {/* Cover inner glow ring */}
      {isCover && (
        <div className="absolute inset-0 ring-inset ring-4 ring-amber-400/25 rounded-2xl pointer-events-none" />
      )}

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* ── Top-left badges ── */}
      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
        {isCover && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md">
            <Star className="w-2.5 h-2.5" /> Featured
          </span>
        )}
        {isVideo && (
          <span className="flex items-center justify-center w-8 h-8 rounded-full
            bg-black/55 backdrop-blur-sm border-2 border-white/60
            group-hover:scale-110 transition-transform duration-200">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </span>
        )}
      </div>

      {/* ── Top-right: engagement stats (shown on hover) ── */}
      {(likes > 0 || views > 0) && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10
          opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
          transition-all duration-200">
          {views > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
              bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold">
              <Eye className="w-2.5 h-2.5" /> {fmt(views)}
            </span>
          )}
          {likes > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
              bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold">
              <Heart className="w-2.5 h-2.5 fill-white" /> {fmt(likes)}
            </span>
          )}
        </div>
      )}

      {/* ── Bottom action bar (shown on hover) ── */}
      {!confirmDelete && (
        <div className="absolute bottom-0 inset-x-0 p-3 z-10
          translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100
          transition-all duration-200 flex items-end justify-between">

          {photo?.caption && (
            <p className="text-white text-[11px] font-medium truncate flex-1 mr-2 drop-shadow-sm leading-tight">
              {photo.caption}
            </p>
          )}

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Delete */}
            {canDelete && (
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                  bg-red-500/75 backdrop-blur-sm hover:bg-red-600/95 text-white transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {/* Set as cover (photos only, not already cover) */}
            {!isCover && !isVideo && onSetCover && (
              <button
                onClick={e => { e.stopPropagation(); onSetCover(photo); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                  bg-amber-500/75 backdrop-blur-sm hover:bg-amber-600/95 text-white transition-colors"
                title="Set as Cover"
              >
                <Star className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirmation overlay ── */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3
            bg-black/80 backdrop-blur-sm p-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-white text-xs font-bold text-center leading-snug">
            Delete this {isVideo ? 'video' : 'photo'}?
          </p>
          <p className="text-white/50 text-[10px] text-center">This cannot be undone.</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              className="flex-1 py-1.5 rounded-xl border border-white/20 text-white/80
                text-[11px] font-semibold hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(false); onDelete(photo); }}
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

  // In fill-container (reels) mode, just return the card
  if (fillContainer) return card;

  // In normal masonry mode, wrap with a "Set as Hero" button below
  return (
    <div className="flex flex-col gap-1.5">
      {card}
      {!isVideo && onSetCover && (
        <button
          onClick={e => { e.stopPropagation(); if (!isCover) onSetCover(photo); }}
          className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5
            ${isCover
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 cursor-default'
              : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 border border-gray-200 dark:border-white/8 hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30'
            }`}
        >
          <Star className={`w-3 h-3 ${isCover ? 'fill-amber-500' : ''}`} />
          {isCover ? 'Hero Photo' : 'Set as Hero'}
        </button>
      )}
    </div>
  );
}
