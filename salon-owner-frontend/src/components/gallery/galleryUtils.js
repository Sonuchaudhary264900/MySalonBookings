/**
 * Shared gallery helpers — keep owner grid / lightbox / stats aligned with customer SalonDetails.
 */

function looksLikeMediaUrl(s) {
  if (typeof s !== 'string' || !/^https?:\/\//i.test(s)) return false;
  return (
    /\.(jpe?g|png|webp|gif|mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(s) ||
    s.includes('cloudinary.com') ||
    s.includes('res.cloudinary.com')
  );
}

/** Normalise GET /owner/gallery payload (array or { photos, videos }, string URLs). */
export function normalizeOwnerGalleryPayload(data) {
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    list = [
      ...(Array.isArray(data.photos) ? data.photos : []),
      ...(Array.isArray(data.videos) ? data.videos : []),
      ...(Array.isArray(data.images) ? data.images : []),
    ];
  }
  return list.map((item, i) => {
    if (typeof item === 'string' && /^https?:\/\//i.test(item)) {
      const u = item.trim();
      const vid = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) || u.includes('/video/upload/');
      return {
        _id: `_raw_${i}`,
        url: u,
        type: vid ? 'video' : 'image',
        caption: '',
        tags: [],
        isCover: false,
      };
    }
    return item;
  });
}

export function getGalleryMediaUrl(item) {
  if (typeof item === 'string') {
    return /^https?:\/\//i.test(item) ? item : '';
  }
  if (!item || typeof item !== 'object') return '';
  const direct =
    item.url ||
    item.videoUrl ||
    item.imageUrl ||
    item.image ||
    item.thumbnail ||
    item.secure_url ||
    item.secureUrl ||
    item.href ||
    '';
  if (direct) return direct;
  for (const v of Object.values(item)) {
    if (looksLikeMediaUrl(v)) return v;
  }
  return '';
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|avi|mkv)(\?.*)?$/i;

/** True if this item should render as video (playback + reel tooling). */
export function isGalleryVideo(item) {
  if (!item) return false;
  if (item.type === 'video' || item.mediaType === 'video') return true;
  const u = getGalleryMediaUrl(item);
  if (!u) return false;
  if (VIDEO_EXT.test(u)) return true;
  if (u.includes('/video/upload/')) return true;
  return false;
}

export function hasRenderableGalleryMedia(item) {
  return Boolean(getGalleryMediaUrl(item));
}

/**
 * Cloudinary: derive a JPEG poster from a video URL (same idea as salon-user SalonDetails).
 * Naive ".mp4" → ".jpg" alone often 404s; transformations are required.
 */
export function cloudinaryVideoPosterUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return '';
  if (!videoUrl.includes('/video/upload/')) {
    return videoUrl.replace(VIDEO_EXT, '.jpg');
  }
  const withTransform = videoUrl.replace(
    '/video/upload/',
    '/video/upload/w_400,h_400,c_fill,q_auto,f_jpg,vc_none/'
  );
  return withTransform.replace(VIDEO_EXT, '.jpg');
}
