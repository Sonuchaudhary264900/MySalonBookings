import React, { useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Salon Photos</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          📸 Upload high-quality photos of your salon (interior, exterior, services)
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Add Photos</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP • Up to 10MB each</p>
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

      {/* Image previews */}
      {photos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </p>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((file, i) => {
              const url = file instanceof File ? URL.createObjectURL(file) : file;
              return (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
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
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
