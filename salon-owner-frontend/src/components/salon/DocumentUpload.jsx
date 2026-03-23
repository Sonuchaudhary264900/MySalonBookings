import React, { useRef } from 'react';
import { FileText, X } from 'lucide-react';

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
    const files = Array.from(e.target.files).filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`"${f.name}" exceeds the 5MB limit and was not added.`);
        return false;
      }
      return true;
    });
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
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'
          }`}
        >
          <FileText className="w-4 h-4" />
          {label}
        </button>
        {documents.length > 0 && (
          <span className="text-sm text-gray-500">
            {documents.length} file{documents.length !== 1 ? 's' : ''} selected
          </span>
        )}
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

      <p className="text-xs text-gray-400">{description || 'PDF, JPG, PNG • Up to 20MB'}</p>

      {/* Preview list */}
      {documents.length > 0 && (
        <div className="space-y-2">
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
