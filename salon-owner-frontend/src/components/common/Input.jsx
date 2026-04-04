import React from 'react';

/**
 * Input — premium form field component.
 *
 * Fully supports dark mode, error states, icons, helper text.
 * Uses a ring-based focus style consistent with the Button component.
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
  readOnly = false,
  required = false,
  icon,
  rightIcon,
  helperText,
  rows,
  className = '',
}) => {
  const isTextarea = type === 'textarea';

  const inputBase = `
    w-full bg-white dark:bg-gray-900
    text-gray-900 dark:text-gray-100
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    border rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2
    disabled:bg-gray-50 dark:disabled:bg-gray-800/60
    disabled:text-gray-400 dark:disabled:text-gray-500
    disabled:cursor-not-allowed
    read-only:bg-gray-50 dark:read-only:bg-gray-800/40
    read-only:cursor-default
  `;

  const stateStyles = error
    ? 'border-red-400 dark:border-red-500 focus:border-red-400 dark:focus:border-red-500 focus:ring-red-400/20 dark:focus:ring-red-500/20'
    : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400/20 dark:focus:ring-indigo-500/20';

  const paddingStyles = icon
    ? 'pl-10 pr-4'
    : rightIcon
    ? 'pl-4 pr-10'
    : 'px-4';

  const sizeStyles = isTextarea ? 'py-3' : 'py-2.5';

  const sharedProps = {
    name,
    value,
    onChange,
    onBlur,
    placeholder,
    disabled,
    readOnly,
    className: `${inputBase} ${stateStyles} ${paddingStyles} ${sizeStyles} ${className}`,
  };

  return (
    <div className="w-full space-y-1.5">
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Left icon */}
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}

        {/* Field */}
        {isTextarea ? (
          <textarea
            id={name}
            rows={rows || 4}
            {...sharedProps}
          />
        ) : (
          <input
            id={name}
            type={type}
            {...sharedProps}
          />
        )}

        {/* Right icon */}
        {rightIcon && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {rightIcon}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && errorMessage && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
          {errorMessage}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
