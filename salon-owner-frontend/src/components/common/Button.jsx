import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button — premium interactive component.
 *
 * Variants:
 *   primary   – indigo→violet gradient, the main CTA
 *   secondary – muted surface, secondary actions
 *   danger    – red gradient, destructive actions
 *   outline   – indigo border + text, ghost with border
 *   ghost     – no border/bg, subtle hover only
 *   success   – emerald gradient, positive confirmations
 *
 * Sizes: xs | sm | md | lg
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
  icon,
  className = '',
}) => {

  const base = `
    inline-flex items-center justify-center gap-2 font-semibold
    rounded-xl select-none
    transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
    dark:focus-visible:ring-offset-gray-950
    active:scale-[0.97]
    disabled:pointer-events-none disabled:opacity-50
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-indigo-600 to-violet-600
      hover:from-indigo-500 hover:to-violet-500
      text-white shadow-md shadow-indigo-500/25
      hover:shadow-lg hover:shadow-indigo-500/35
    `,
    secondary: `
      bg-gray-100 dark:bg-gray-800
      hover:bg-gray-200 dark:hover:bg-gray-700/80
      text-gray-700 dark:text-gray-200
      border border-gray-200 dark:border-gray-700
      hover:border-gray-300 dark:hover:border-gray-600
      shadow-sm
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-rose-600
      hover:from-red-500 hover:to-rose-500
      text-white shadow-md shadow-red-500/20
      hover:shadow-lg hover:shadow-red-500/30
    `,
    outline: `
      bg-transparent
      border-2 border-indigo-500 dark:border-indigo-400
      text-indigo-600 dark:text-indigo-400
      hover:bg-indigo-50 dark:hover:bg-indigo-950/40
      hover:border-indigo-600 dark:hover:border-indigo-300
    `,
    ghost: `
      bg-transparent
      text-gray-600 dark:text-gray-400
      hover:bg-gray-100 dark:hover:bg-gray-800
      hover:text-gray-900 dark:hover:text-gray-100
    `,
    success: `
      bg-gradient-to-r from-emerald-600 to-teal-600
      hover:from-emerald-500 hover:to-teal-500
      text-white shadow-md shadow-emerald-500/20
      hover:shadow-lg hover:shadow-emerald-500/30
    `,
  };

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${base}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {!loading && icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
