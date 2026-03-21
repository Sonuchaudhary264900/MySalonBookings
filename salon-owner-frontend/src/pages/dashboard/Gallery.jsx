import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImagePlus, Trash2, Images, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

export default function Gallery() {
  const [photos, setPhotos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const fileInputRef              = useRef(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await api.get('/owner/gallery');
      const d = res.data.data;
      setPhotos(Array.isArray(d) ? d : (d?.photos || d?.images || []));
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        await api.post('/owner/gallery', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
      fetchPhotos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('Remove this photo from your gallery?')) return;
    setDeleting(photo._id);
    try {
      await api.delete(`/owner/gallery/${photo._id}`);
      toast.success('Photo removed');
      fetchPhotos();
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
            <p className="text-gray-500 text-sm mt-1">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} · Showcase your salon's best work
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Photos</>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 flex flex-col items-center gap-4">
            <Images className="w-14 h-14 text-gray-300" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">No photos yet</p>
              <p className="text-gray-500 text-sm mt-1">Upload photos to showcase your salon</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <ImagePlus className="w-4 h-4" /> Upload Photos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo) => (
              <div key={photo._id || photo.url} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={photo.url || photo.imageUrl || photo.image}
                  alt="Gallery"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(photo)}
                    disabled={deleting === photo._id}
                    className="opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    {deleting === photo._id
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
