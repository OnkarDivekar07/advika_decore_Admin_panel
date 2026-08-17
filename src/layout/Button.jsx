// src/layout/Button.jsx
//
// Centralizes button styling so destructive actions (delete, logout) are
// never one accidental class-name away from looking identical to a
// neutral action — each variant is visually distinct, and every variant
// gets the same visible focus ring for keyboard users.
import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-blue-500',
  ghost: 'bg-transparent text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  dangerOutline:
    'bg-white text-red-600 border border-red-300 hover:bg-red-50 focus-visible:ring-red-500',
};

const Button = forwardRef(
  ({ variant = 'primary', className = '', type = 'button', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
);

export default Button;
