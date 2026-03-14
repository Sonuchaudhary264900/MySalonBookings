import React from 'react';
import { FileText } from 'lucide-react';
import FileUpload from './FileUpload';
import FilePreview from './FilePreview';

/**
 * DocumentUpload Component
 * 
 * Features:
 * - Single/multiple document upload
 * - PDF, JPG, PNG support
 * - File preview
 * - Remove option
 */
const DocumentUpload = ({
  documents = [],
  onDocumentsChange,
  label = 'Upload Documents',
  description = '',
  multiple = false,
  disabled = false,
}) => {
  const handleDocumentsSelect = (newDocs) => {
    if (multiple) {
      const combined = [...documents, ...newDocs];
      onDocumentsChange(combined);
    } else {
      onDocumentsChange(newDocs);
    }
  };

  const handleRemoveDocument = (index) => {
    if (multiple) {
      const updated = documents.filter((_, i) => i !== index);
      onDocumentsChange(updated);
    } else {
      onDocumentsChange([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">{label}</h3>
      </div>

      {/* Upload Component */}
      <FileUpload
        onFileSelect={handleDocumentsSelect}
        acceptedTypes="application/pdf,image/jpeg,image/png"
        maxSize={20 * 1024 * 1024} // 20MB
        multiple={multiple}
        label={label}
        disabled={disabled}
        description={description || 'PDF, JPG, PNG • Up to 20MB'}
      />

      {/* Preview */}
      {documents.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            {documents.length} document{documents.length !== 1 ? 's' : ''} selected
          </p>
          <FilePreview
            files={documents}
            onRemove={handleRemoveDocument}
            type="document"
          />
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;