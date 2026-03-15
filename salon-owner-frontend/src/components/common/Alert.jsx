import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react';

/**
 * Alert Component
 * 
 * Types: success, error, warning, info
 * Features:
 * - Icons for each type
 * - Dismissible option
 * - Title and description
 */
const Alert = ({
  type = 'info',
  title,
  description,
  dismissible = false,
  onDismiss,
  className = '',
}) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-green-100 text-green-900 border-green-400',
    error: 'bg-red-100 text-red-900 border-red-400',
    warning: 'bg-yellow-100 text-yellow-900 border-yellow-400',
    info: 'bg-blue-100 text-blue-900 border-blue-400',
  };

  return (
    <div className={`border rounded-lg p-4 ${styles[type]} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>

        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          {description && <p className="text-sm opacity-90">{description}</p>}
        </div>

        {dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-70 transition"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;