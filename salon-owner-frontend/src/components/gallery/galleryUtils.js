/**
 * Shared gallery helpers — keep owner grid / lightbox / stats aligned with customer SalonDetails.
 */

/** Any remote URL that could be a gallery image/video (not only Cloudinary). */
function isLikelyRemoteUrlString(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 12) return false;
  if (t.startsWith('//')) return true;
  return /^https?:\/\//i.test(t);
}

export function normalizeClientMediaUrl(u) {
  if (u == null || typeof u !== 'string') return '';
  let s = u.trim();
  if (!s) return '';
  if (s.startsWith('//')) s = `https:${s}`;
  return s;
}

/** Dedupe gallery rows vs reel analytics (host + path, ignores query). */
export function galleryItemDedupeKey(u) {
  const s = normalizeClientMediaUrl(u);
  if (!s) return '';
  try {
    const x = new URL(s);
    return `${x.hostname.toLowerCase()}${x.pathname.replace(/\/+/g, '/')}`;
  } catch {
    return s;
  }
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
  return list
    .filter((item) => item != null)
    .map((item, i) => {
      if (typeof item === 'string' && isLikelyRemoteUrlString(item)) {
        const u = normalizeClientMediaUrl(item);
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
    return isLikelyRemoteUrlString(item) ? normalizeClientMediaUrl(item) : '';
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
    item.src ||
    item.link ||
    item.photoUrl ||
    item.path ||
    item.publicUrl ||
    '';
  if (direct) return String(direct);
  for (const v of Object.values(item)) {
    if (isLikelyRemoteUrlString(v)) return normalizeClientMediaUrl(v);
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
  const u = normalizeClientMediaUrl(getGalleryMediaUrl(item));
  return Boolean(u && /^https?:\/\//i.test(u));
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
