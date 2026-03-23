import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';

const PhotoUpload = ({
  photos = [],
  onPhotosChange,
  disabled = false,
}) => {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    onPhotosChange([...photos, ...files]);
    e.target.value = '';
  };

  const handleRemove = (index) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            disabled
              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer'
          }`}
        >
          <Camera className="w-4 h-4" />
          Upload Photos
        </button>
        {photos.length > 0 && (
          <span className="text-sm text-gray-500">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <p className="text-xs text-gray-400">JPG, PNG, WebP • Up to 10MB each</p>

      {/* Image previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((file, i) => {
            const url = file instanceof File ? URL.createObjectURL(file) : file;
            return (
              <div key={i} className="relative group rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '1' }}>
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
