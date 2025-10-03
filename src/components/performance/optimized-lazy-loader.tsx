"use client";

import React, { 
  lazy, 
  Suspense, 
  ComponentType, 
  ReactNode, 
  useState, 
  useEffect, 
  useRef,
  useMemo
} from 'react';
import { EnhancedLoadingSpinner } from '@/components/enhanced-loading-spinner';

// واجهة لإعدادات التحميل التدريجي
interface LazyLoadOptions {
  delay?: number;
  timeout?: number;
  preload?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
}

// Hook مخصص لمراقبة ظهور العنصر في المنطقة المرئية
function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          callback();
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [callback, options]);

  return { targetRef, isIntersecting };
}

// مكون التحميل التدريجي المحسن
interface OptimizedLazyLoaderProps {
  children: ReactNode;
  height?: string | number;
  className?: string;
  options?: LazyLoadOptions;
}

export function OptimizedLazyLoader({
  children,
  height = 'auto',
  className = '',
  options = {},
}: OptimizedLazyLoaderProps) {
  const [shouldLoad, setShouldLoad] = useState(options.preload || false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useMemo(() => {
    return () => {
      if (options.delay) {
        setTimeout(() => {
          setShouldLoad(true);
          options.onLoad?.();
        }, options.delay);
      } else {
        setShouldLoad(true);
        options.onLoad?.();
      }
    };
  }, [options.delay, options.onLoad]);

  const { targetRef, isIntersecting } = useIntersectionObserver(
    handleLoad,
    {
      rootMargin: options.rootMargin,
      threshold: options.threshold,
    }
  );

  useEffect(() => {
    if (options.preload) {
      setShouldLoad(true);
    }
  }, [options.preload]);

  const handleError = (error: Error) => {
    setHasError(true);
    options.onError?.(error);
  };

  if (hasError) {
    return (
      <div 
        ref={targetRef}
        className={`flex items-center justify-center min-h-32 ${className}`}
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <p>حدث خطأ أثناء تحميل المحتوى</p>
          <button 
            onClick={() => {
              setHasError(false);
              setShouldLoad(false);
              handleLoad();
            }}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={targetRef} className={className} style={{ height }}>
      {shouldLoad || isIntersecting ? (
        <Suspense 
          fallback={
            options.fallback || (
              <div className="flex items-center justify-center min-h-32">
                <EnhancedLoadingSpinner />
              </div>
            )
          }
        >
          <ErrorBoundary onError={handleError}>
            {children}
          </ErrorBoundary>
        </Suspense>
      ) : (
        <div className="flex items-center justify-center min-h-32">
          <div className="animate-pulse bg-muted rounded-md w-full h-32" />
        </div>
      )}
    </div>
  );
}

// Error Boundary للتعامل مع أخطاء التحميل
class ErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

// دالة مساعدة لإنشاء مكونات lazy محسنة
export function createOptimizedLazy<P extends {} = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
) {
  const LazyComponent = lazy(importFunc);

  return function OptimizedLazyComponent(props: P & { 
    lazyOptions?: LazyLoadOptions;
    className?: string;
    style?: React.CSSProperties;
  }) {
    const { lazyOptions, className, style, ...componentProps } = props;
    const finalOptions = { ...options, ...lazyOptions };

    return (
      <OptimizedLazyLoader
        className={className}
        options={finalOptions}
      >
        <LazyComponent {...(componentProps as any)} />
      </OptimizedLazyLoader>
    );
  };
}

// مكونات lazy محسنة للصفحات الرئيسية
export const LazyDashboard = createOptimizedLazy<{}>(
  () => import('@/app/dashboard-client-page').then(module => ({ default: module as any })),
  { preload: true, rootMargin: '100px' }
);

export const LazyClinics = createOptimizedLazy(
  () => import('@/app/(app)/clinics/page'),
  { rootMargin: '50px' }
);

export const LazyVisits = createOptimizedLazy(
  () => import('@/app/(app)/visits/page'),
  { rootMargin: '50px' }
);

export const LazyOrders = createOptimizedLazy(
  () => import('@/app/(app)/orders/page'),
  { rootMargin: '50px' }
);

export const LazyAccounting = createOptimizedLazy(
  () => import('@/app/(app)/accounting/page'),
  { rootMargin: '50px' }
);

export const LazyReports = createOptimizedLazy(
  () => import('@/app/(app)/reports/page'),
  { rootMargin: '50px' }
);

// Hook لـ preload المكونات
export function usePreloadComponent(
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  condition: boolean = true
) {
  useEffect(() => {
    if (condition) {
      // بدء التحميل المسبق بعد تأخير قصير
      const timer = setTimeout(() => {
        importFunc().catch(console.error);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [importFunc, condition]);
}

// Hook لـ prefetch البيانات
export function usePrefetchData<T>(
  fetchFunc: () => Promise<T>,
  key: string,
  condition: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    if (!condition) return;

    // فحص الكاش أولاً
    if (cacheRef.current.has(key)) {
      setData(cacheRef.current.get(key)!);
      return;
    }

    setIsLoading(true);
    fetchFunc()
      .then(result => {
        cacheRef.current.set(key, result);
        setData(result);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [fetchFunc, key, condition]);

  return { data, isLoading };
}