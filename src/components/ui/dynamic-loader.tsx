import React from 'react';
import dynamic from 'next/dynamic';

// مكون تحميل بسيط
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

// مكون تحميل متقدم
export const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded-md ${className}`}>
    <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
  </div>
);

// مساعد لإنشاء Dynamic imports آمنة
export const createSafeDynamicImport = (path: string, fallback = LoadingSkeleton) => {
  return dynamic(
    () => import(path).catch(() => ({ default: fallback })),
    {
      loading: () => <LoadingSpinner />,
      ssr: false,
    }
  );
};

// Helper function for creating dynamic components
export const createDynamicComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: { ssr?: boolean }
) => {
  return dynamic(importFn, {
    loading: () => <LoadingSpinner />,
    ssr: options?.ssr ?? true,
  });
};

export default {
  LoadingSpinner,
  LoadingSkeleton,
  createSafeDynamicImport,
  createDynamicComponent,
};
