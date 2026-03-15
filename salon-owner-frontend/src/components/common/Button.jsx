import React from 'react';
import { Loader as LoaderIcon } from 'lucide-react';

/**
 * Button Component
 * 
 * Variants: primary, secondary, danger, outline, ghost
 * Sizes: sm, md, lg
 * States: loading, disabled
 */
const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  className = '',
}) => {
  const baseStyles = 'font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-gray-400 disabled:text-gray-400 disabled:cursor-not-allowed',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400 disabled:cursor-not-allowed',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const width = fullWidth ? 'w-full' : '';
  const opacity = loading ? 'opacity-80' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${opacity} ${className}`}
    >
      {loading && <LoaderIcon className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;