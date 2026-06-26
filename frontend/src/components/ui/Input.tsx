import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full bg-gray-50 border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:ring-2 transition-all outline-none ${
            error ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-200 focus:border-indigo-500'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
