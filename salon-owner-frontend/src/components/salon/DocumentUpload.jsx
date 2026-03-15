import React, { useRef } from 'react';
import { FileText, X, Upload } from 'lucide-react';

const DocumentUpload = ({
  documents = [],
  onDocumentsChange,
  label = 'Upload Documents',
  description = '',
  multiple = false,
  disabled = false,
}) => {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (multiple) {
      onDocumentsChange([...documents, ...files]);
    } else {
      onDocumentsChange(files);
    }
    e.target.value = '';
  };

  const handleRemove = (index) => {
    if (multiple) {
      onDocumentsChange(documents.filter((_, i) => i !== index));
    } else {
      onDocumentsChange([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">{label}</h3>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-1">
          {description || 'PDF, JPG, PNG • Up to 20MB'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          multiple={multiple}
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Preview list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {documents.length} document{documents.length !== 1 ? 's' : ''} selected
          </p>
          {documents.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {file.name || `Document ${i + 1}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="ml-2 text-gray-400 hover:text-red-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
