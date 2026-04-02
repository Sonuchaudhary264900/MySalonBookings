import React, { useState, useEffect, useCallback } from 'react';
import {
  Images, Upload, Star, Tag, RefreshCw, Loader2, ImagePlus, Film,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ImageGrid  from '../../components/gallery/ImageGrid';
import UploadModal from '../../components/gallery/UploadModal';
import ImageModal  from '../../components/gallery/ImageModal';
import api from '../../services/api';

const ALL_TAGS = ['Haircut', 'Beard', 'Facial', 'Spa', 'Nails', 'Makeup'];

/* ── Stat pill ── */
const StatPill = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${color}`}>
    <Icon className="w-3.5 h-3.5" />
    <span className="text-xs font-semibold">{value}</span>
    <span className="text-xs opacity-70">{label}</span>
  </div>
);

/* ── Tag filter pill ── */
const TagPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
      active
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
    }`}
  >
    {label}
  </button>
);

/* ── Empty state ── */
const EmptyState = ({ onUpload }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <style>{`
      @keyframes gallery-glow {
        0%,100% { opacity:.15; transform:scale(1); }
        50%      { opacity:.3;  transform:scale(1.08); }
      }
    `}</style>

    <div className="relative mb-6">
      <div className="absolute inset-0 w-24 h-24 rounded-full bg-indigo-400/20 blur-2xl"
        style={{ animation:'gallery-glow 3s ease-in-out infinite' }} />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100
        dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shadow-lg">
        <Images className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
      </div>
    </div>

    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No media uploaded yet</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
      Upload photos and videos to attract more customers and showcase your salon's best work
    </p>

    <button
      onClick={onUpload}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl
        bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
        hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25
        hover:shadow-indigo-500/40 hover:scale-[1.02]"
    >
      <ImagePlus className="w-4 h-4" /> Upload Your First Media
    </button>
  </div>
);

/* ── Featured Photos strip ── */
const FeaturedStrip = ({ photos, coverId, onView }) => {
  const featured = photos.filter(p => p.tags?.length > 0 || p._id === coverId).slice(0, 6);
  if (!featured.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Featured Photos</h3>
        <span className="text-xs text-gray-400 ml-auto">{featured.length} selected</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {featured.map(p => (
          <button
            key={p._id}
            onClick={() => onView(p)}
            className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800
              hover:ring-2 hover:ring-indigo-400 transition-all duration-150"
          >
            <img
              src={p.url || p.imageUrl || p.image}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ─── Main Gallery page ──────────────────────────────────────── */
export default function Gallery() {
  const [photos,       setPhotos]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [coverId,      setCoverId]      = useState(null);
  const [activeTag,    setActiveTag]    = useState(null);
  const [showUpload,   setShowUpload]   = useState(false);
  const [lightbox,     setLightbox]     = useState(null); // { index }
  const [deletingId,   setDeletingId]   = useState(null);

  /* ── Fetch photos ── */
  const fetchPhotos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/owner/gallery');
      const d   = res.data?.data;
      const arr = Array.isArray(d) ? d : (d?.photos || d?.images || []);
      setPhotos(arr);
      // pick cover from the array if flagged
      const cover = arr.find(p => p.isCover);
      if (cover) setCoverId(cover._id);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  /* ── Upload done ── */
  const handleUploaded = (count) => {
    toast.success(`${count} file${count !== 1 ? 's' : ''} uploaded!`);
    fetchPhotos(true);
    setShowUpload(false);
  };

  /* ── Open lightbox ── */
  const handleView = (photo) => {
    const visiblePhotos = activeTag ? photos.filter(p => p.tags?.includes(activeTag)) : photos;
    const index = visiblePhotos.findIndex(p => p._id === photo._id);
    setLightbox({ index: index >= 0 ? index : 0 });
  };

  /* ── Delete from grid (quick) ── */
  const handleDeleteFromGrid = async (photo) => {
    if (deletingId) return;
    setDeletingId(photo._id);
    try {
      await api.delete(`/owner/gallery/${photo._id}`);
      setPhotos(prev => prev.filter(p => p._id !== photo._id));
      if (photo._id === coverId) setCoverId(null);
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Lightbox: photo deleted ── */
  const handleLightboxDelete = (id) => {
    setPhotos(prev => prev.filter(p => p._id !== id));
    if (id === coverId) setCoverId(null);
    toast.success('Photo removed');
    if (photos.length <= 1) setLightbox(null);
  };

  /* ── Lightbox: photo updated (caption/tags) ── */
  const handleLightboxUpdate = (updated) => {
    setPhotos(prev => prev.map(p => p._id === updated._id ? updated : p));
  };

  /* ── Cover set ── */
  const handleCoverSet = (id) => {
    setCoverId(id);
    setPhotos(prev => prev.map(p => ({ ...p, isCover: p._id === id })));
    toast.success('Cover photo updated!');
  };

  const imagePhotos = photos.filter(p => p.type !== 'video');
  const videoPhotos = photos.filter(p => p.type === 'video');

  const visiblePhotos = activeTag
    ? imagePhotos.filter(p => p.tags?.includes(activeTag))
    : photos;

  const tagCount = (tag) => imagePhotos.filter(p => p.tags?.includes(tag)).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Images className="w-5 h-5 text-white" />
                </div>
                Gallery
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Showcase your salon's best work
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fetchPhotos()}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                  hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20"
              >
                <Upload className="w-4 h-4" /> Upload Media
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          {photos.length > 0 && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <StatPill
                icon={Images}
                label="photos"
                value={imagePhotos.length}
                color="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
              />
              {videoPhotos.length > 0 && (
                <StatPill
                  icon={Film}
                  label="videos"
                  value={videoPhotos.length}
                  color="border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
                />
              )}
              {coverId && (
                <StatPill
                  icon={Star}
                  label="cover set"
                  value="✓"
                  color="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                />
              )}
              {ALL_TAGS.map(t => {
                const cnt = tagCount(t);
                return cnt > 0 ? (
                  <StatPill
                    key={t}
                    icon={Tag}
                    label={t}
                    value={cnt}
                    color="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900"
                  />
                ) : null;
              })}
            </div>
          )}

          {/* ── Featured photos strip ── */}
          {imagePhotos.length > 0 && !loading && (
            <FeaturedStrip photos={imagePhotos} coverId={coverId} onView={handleView} />
          )}

          {/* ── Tag filters ── */}
          {photos.length > 0 && !loading && (
            <div className="flex items-center gap-2 flex-wrap">
              <TagPill label="All" active={!activeTag} onClick={() => setActiveTag(null)} />
              {ALL_TAGS.filter(t => tagCount(t) > 0).map(t => (
                <TagPill
                  key={t}
                  label={`${t} (${tagCount(t)})`}
                  active={activeTag === t}
                  onClick={() => setActiveTag(prev => prev === t ? null : t)}
                />
              ))}
            </div>
          )}

          {/* ── Main content ── */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-white dark:bg-gray-900
                  border border-gray-100 dark:border-gray-800 animate-pulse" />
              ))}
            </div>

          ) : photos.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <EmptyState onUpload={() => setShowUpload(true)} />
            </div>

          ) : (
            <ImageGrid
              photos={visiblePhotos}
              loading={false}
              coverId={coverId}
              activeTag={activeTag}
              onView={handleView}
              onDelete={handleDeleteFromGrid}
            />
          )}

        </div>
      </div>

      {/* ── Upload modal ── */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={handleUploaded}
      />

      {/* ── Lightbox ── */}
      {lightbox !== null && (
        <ImageModal
          photos={activeTag ? photos.filter(p => p.tags?.includes(activeTag)) : photos}
          initialIndex={lightbox.index}
          coverId={coverId}
          onClose={() => setLightbox(null)}
          onDeleted={handleLightboxDelete}
          onUpdated={handleLightboxUpdate}
          onCoverSet={handleCoverSet}
        />
      )}
    </DashboardLayout>
  );
}
