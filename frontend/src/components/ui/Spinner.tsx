import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  let sizeClasses = 'w-6 h-6';
  if (size === 'sm') sizeClasses = 'w-4 h-4';
  if (size === 'lg') sizeClasses = 'w-8 h-8';

  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-solid border-indigo-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses} ${className}`}
      role="status"
    >
      <span className="sr-only">Đang tải...</span>
    </div>
  );
};
