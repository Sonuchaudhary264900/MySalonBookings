import React from 'react';

/**
 * Card — premium surface component.
 *
 * Variants:
 *   default  – soft shadow, subtle border (works on gray-50 bg)
 *   elevated – deeper shadow, used for stat panels / hero cards
 *   glass    – glassmorphism, for overlay contexts
 *   flat     – border only, no shadow (tables, dense lists)
 *
 * Props:
 *   hoverable  – adds lift + glow on hover
 *   padding    – 'none' | 'sm' | 'md' (default) | 'lg'
 *   accent     – adds a coloured top-border gradient stripe
 */
const Card = ({
  children,
  header,
  footer,
  onClick,
  hoverable = false,
  variant = 'default',
  padding = 'md',
  accent = false,
  className = '',
}) => {

  const base = `
    relative overflow-hidden rounded-2xl transition-all duration-200
    ${onClick ? 'cursor-pointer' : ''}
  `;

  const variants = {
    default: `
      bg-white dark:bg-gray-900
      border border-gray-100 dark:border-gray-800/80
      shadow-sm shadow-gray-100/80 dark:shadow-none
    `,
    elevated: `
      bg-white dark:bg-gray-900
      border border-gray-100 dark:border-gray-800/80
      shadow-lg shadow-gray-200/60 dark:shadow-black/30
    `,
    glass: `
      bg-white/70 dark:bg-gray-900/70
      backdrop-blur-xl
      border border-white/60 dark:border-gray-700/60
      shadow-xl shadow-gray-200/40 dark:shadow-black/40
    `,
    flat: `
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-800
    `,
  };

  const hoverStyles = hoverable ? `
    hover:-translate-y-1
    hover:shadow-lg hover:shadow-gray-200/70 dark:hover:shadow-black/40
    hover:border-gray-200 dark:hover:border-gray-700
  ` : '';

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-7',
  };

  const bodyPad = {
    none: '',
    sm: 'px-4 py-3',
    md: 'px-5 py-4',
    lg: 'px-7 py-5',
  };

  return (
    <div
      onClick={onClick}
      className={`${base} ${variants[variant]} ${hoverStyles} ${className}`}
    >
      {/* Accent top stripe — gradient indigo→violet */}
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
      )}

      {/* Header */}
      {header && (
        <div className={`${bodyPad[padding]} border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30`}>
          {header}
        </div>
      )}

      {/* Body */}
      <div className={padding === 'none' ? '' : bodyPad[padding]}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={`${bodyPad[padding]} border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
