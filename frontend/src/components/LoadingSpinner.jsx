import React from 'react';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

const LoadingSpinner = ({ size = 'md', text = '' }) => (
  <div className="flex flex-col items-center justify-center gap-3">
    <div
      className={`${sizes[size]} rounded-full border-blue-600 border-t-transparent animate-spin`}
    />
    {text && <p className="text-sm text-gray-500">{text}</p>}
  </div>
);

export default LoadingSpinner;
