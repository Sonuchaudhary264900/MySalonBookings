import React from 'react';
import MediaCard from './MediaCard';
import { getGalleryMediaUrl } from './galleryUtils';

/**
 * Variable card heights cycle through this pattern to create a Pinterest feel.
 * Adjust values to taste — wider range = more dramatic masonry effect.
 */
const HEIGHTS = [300, 380, 260, 340, 420, 280, 360, 310, 240, 390, 330, 270];

/**
 * MasonryGrid
 *
 * mode === 'masonry'  → CSS columns layout with variable card heights (all / photos)
 * mode === 'reels'    → 3-column grid with portrait 9:16 aspect ratio cards
 *
 * @param {object[]}  photos
 * @param {string}    coverId
 * @param {object}    analyticsMap  - { [dedupeKey]: analyticsRow }
 * @param {function}  onView
 * @param {function}  onDelete
 * @param {function}  onSetCover
 * @param {string}    mode          - 'masonry' | 'reels'
 */
export default function MasonryGrid({ photos, coverId, ctaPhotoUrl, analyticsMap = {}, onView, onDelete, onSetCover, onSetCta, mode = 'masonry' }) {

  if (!photos.length) return null;

  /* ── Reels: uniform portrait grid ── */
  if (mode === 'reels') {
    return (
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {photos.map(photo => {
          const url     = getGalleryMediaUrl(photo);
          const cardKey = photo._id || url || Math.random().toString();
          return (
            <div key={cardKey} className="relative aspect-[9/16]">
              <MediaCard
                photo={photo}
                isCover={photo._id === coverId}
                isCtaPhoto={url === ctaPhotoUrl}
                analytics={analyticsMap[url] ?? null}
                onView={onView}
                onDelete={onDelete}
                onSetCover={onSetCover}
                onSetCta={onSetCta}
                fillContainer
              />
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Masonry: CSS columns with variable heights ── */
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
      {photos.map((photo, i) => {
        const url     = getGalleryMediaUrl(photo);
        const cardKey = photo._id || url || i;
        return (
          <div key={cardKey} className="break-inside-avoid mb-3 sm:mb-4">
            <MediaCard
              photo={photo}
              isCover={photo._id === coverId}
              isCtaPhoto={url === ctaPhotoUrl}
              analytics={analyticsMap[url] ?? null}
              onView={onView}
              onDelete={onDelete}
              onSetCover={onSetCover}
              onSetCta={onSetCta}
              height={HEIGHTS[i % HEIGHTS.length]}
            />
          </div>
        );
      })}
    </div>
  );
}
