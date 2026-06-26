import React from 'react';

export type BadgeVariant =
  // ContentType
  | 'BLOG_POST'
  | 'SOCIAL_MEDIA'
  | 'AD_COPY'
  | 'EMAIL'
  // ContentStatus
  | 'DRAFT'
  | 'GENERATING'
  | 'READY'
  | 'PUBLISHED'
  | 'ARCHIVED'
  // JobStatus
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  // CampaignStatus
  | 'ACTIVE'
  | 'PAUSED'
  // Fallback
  | string;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  let colorClasses = 'bg-gray-100 text-gray-800 border-gray-200';

  switch (variant) {
    // ContentType
    case 'BLOG_POST':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'SOCIAL_MEDIA':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'AD_COPY':
      colorClasses = 'bg-pink-50 text-pink-700 border-pink-200';
      break;
    case 'EMAIL':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;

    // ContentStatus, JobStatus & CampaignStatus
    case 'ACTIVE':
    case 'READY':
    case 'PUBLISHED':
      colorClasses = 'bg-green-50 text-green-700 border-green-200';
      break;
    case 'DRAFT':
      colorClasses = 'bg-slate-50 text-slate-700 border-slate-200';
      break;
    case 'PAUSED':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'GENERATING':
    case 'QUEUED':
    case 'PROCESSING':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      break;
    case 'COMPLETED':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'ARCHIVED':
      colorClasses = 'bg-gray-100 text-gray-600 border-gray-200';
      break;
    case 'FAILED':
      colorClasses = 'bg-red-50 text-red-700 border-red-200';
      break;
    default:
      colorClasses = 'bg-gray-50 text-gray-700 border-gray-200';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}>
      {children}
    </span>
  );
};
