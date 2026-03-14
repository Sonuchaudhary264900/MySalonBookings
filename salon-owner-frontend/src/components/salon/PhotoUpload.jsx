import React from 'react';
import { Camera } from 'lucide-react';
import FileUpload from './FileUpload';
import FilePreview from './FilePreview';

/**
 * PhotoUpload Component
 * 
 * Features:
 * - Multiple photo upload
 * - Drag & drop
 * - Image preview
 * - Remove photos
 */
const PhotoUpload = ({
  photos = [],
  onPhotosChange,
  disabled = false,
}) => {
  const handlePhotosSelect = (newPhotos) => {
    const combined = [...photos, ...newPhotos];
    onPhotosChange(combined);
  };

  const handleRemovePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Salon Photos</h3>
      </div>

      {/* Upload Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          📸 Upload high-quality photos of your salon (interior, exterior, services)
        </p>
      </div>

      {/* Upload Component */}
      <FileUpload
        onFileSelect={handlePhotosSelect}
        acceptedTypes="image/jpeg,image/png,image/webp"
        maxSize={10 * 1024 * 1024} // 10MB
        multiple={true}
        label="Add Photos"
        disabled={disabled}
        description="JPG, PNG, WebP • Up to 10MB each"
      />

      {/* Preview */}
      {photos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </p>
          <FilePreview
            files={photos}
            onRemove={handleRemovePhoto}
            type="image"
          />
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;