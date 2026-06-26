import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', isLoading = false, className = '', disabled, ...props }, ref) => {
    let baseClasses = 'inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (variant === 'primary') {
      baseClasses += ' bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-300';
    } else if (variant === 'secondary') {
      baseClasses += ' bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-200 shadow-none';
    } else if (variant === 'danger') {
      baseClasses += ' bg-red-600 hover:bg-red-700 text-white focus:ring-red-300';
    }

    return (
      <button ref={ref} className={`${baseClasses} ${className}`} disabled={disabled || isLoading} {...props}>
        {isLoading && <Spinner size="sm" className="text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
