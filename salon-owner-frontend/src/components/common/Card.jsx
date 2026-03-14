import React from 'react';

/**
 * Card Component
 * 
 * Features:
 * - Header, body, footer sections
 * - Custom styling
 * - Hover effects
 * - Click handling
 */
const Card = ({
  children,
  header,
  footer,
  onClick,
  hoverable = false,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white
        rounded-lg
        border
        border-gray-200
        shadow-sm
        overflow-hidden
        transition
        ${hoverable ? 'cursor-pointer hover:shadow-md hover:border-gray-300' : ''}
        ${className}
      `}
    >
      {/* Header */}
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {header}
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-4">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;