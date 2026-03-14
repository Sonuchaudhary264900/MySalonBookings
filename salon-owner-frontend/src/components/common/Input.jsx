import React from 'react';

/**
 * Input Component
 * 
 * Features:
 * - Label support
 * - Error messages
 * - Icon support (left and right)
 * - Validation states
 * - Helper text
 * - Multiple input types
 */
const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error = false,
  errorMessage,
  disabled = false,
  required = false,
  icon,
  rightIcon,
  helperText,
  className = '',
}) => {
  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {/* Input Wrapper */}
      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div className="absolute left-3 top-3 text-gray-500 pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full
            ${icon ? 'pl-10' : 'pl-3'} 
            ${rightIcon ? 'pr-10' : 'pr-3'} 
            py-2
            rounded-lg
            border-2
            transition
            focus:outline-none
            disabled:bg-gray-100
            disabled:cursor-not-allowed
            ${error 
              ? 'border-red-500 focus:border-red-600 focus:ring-red-200' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }
            ${className}
          `}
        />

        {/* Right Icon */}
        {rightIcon && (
          <div className="absolute right-3 top-3 text-gray-500 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;