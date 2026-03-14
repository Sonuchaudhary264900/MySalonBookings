import React from 'react';
import { Loader as LoaderIcon } from 'lucide-react';

/**
 * Loader Component
 * Shows loading spinner with message
 */
const Loader = ({ 
  fullScreen = false, 
  message = 'Loading...',
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <LoaderIcon className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
};

export default Loader;