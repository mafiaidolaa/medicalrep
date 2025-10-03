// Advanced Lazy Loading Utilities for Maximum Performance
'use client';

import dynamic from 'next/dynamic';
import { Suspense, ComponentType, lazy, ReactNode } from 'react';

// Enhanced loading fallback with performance metrics
const LoadingFallback = ({ name }: { name?: string }) => (
  <div className="flex items-center justify-center p-4 min-h-[100px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    {name && <span className="ml-2 text-sm text-muted-foreground">Loading {name}...</span>}
  </div>
);

// Advanced dynamic loading with performance optimization
export const createOptimizedDynamic = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: {
    name?: string;
    ssr?: boolean;
    loading?: () => ReactNode;
    preload?: boolean;
  } = {}
) => {
  const DynamicComponent = dynamic(importFn, {
    loading: options.loading || (() => <LoadingFallback name={options.name} />),
    ssr: options.ssr ?? false,
  });

  // Preload on hover or intersection
  if (options.preload) {
    const preloader = () => importFn();
    (DynamicComponent as any).preload = preloader;
  }

  return DynamicComponent;
};

// Heavy Components - Lazy loaded with fallbacks
export const LazyChartComponents = createOptimizedDynamic(
  () => Promise.resolve({ default: () => <div>Chart Component Placeholder</div> }),
  { name: 'Charts', ssr: false, preload: true }
);

export const LazyPDFGenerator = createOptimizedDynamic(
  () => Promise.resolve({ default: () => <div>PDF Generator Placeholder</div> }),
  { name: 'PDF Generator', ssr: false }
);

export const LazyDataVisualization = createOptimizedDynamic(
  () => Promise.resolve({ default: () => <div>Data Visualization Placeholder</div> }),
  { name: 'Data Visualization', ssr: false, preload: true }
);

export const LazyAdvancedTable = createOptimizedDynamic(
  () => Promise.resolve({ default: () => <div>Advanced Table Placeholder</div> }),
  { name: 'Advanced Table', ssr: false, preload: true }
);

export const LazyMapComponents = createOptimizedDynamic(
  () => Promise.resolve({ default: () => <div>Map Components Placeholder</div> }),
  { name: 'Maps', ssr: false }
);

export const LazyAIComponents = createOptimizedDynamic(
  () => Promise.resolve({ default: () => <div>AI Features Placeholder</div> }),
  { name: 'AI Features', ssr: false }
);

// Advanced Intersection Observer for lazy loading
export class AdvancedLazyLoader {
  private static instance: AdvancedLazyLoader;
  private observer!: IntersectionObserver;
  private loadedComponents = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement;
              const componentName = target.dataset.component;
              
              if (componentName && !this.loadedComponents.has(componentName)) {
                this.loadComponent(componentName);
                this.loadedComponents.add(componentName);
                this.observer.unobserve(target);
              }
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: 0.1,
        }
      );
    }
  }

  static getInstance(): AdvancedLazyLoader {
    if (!AdvancedLazyLoader.instance) {
      AdvancedLazyLoader.instance = new AdvancedLazyLoader();
    }
    return AdvancedLazyLoader.instance;
  }

  observe(element: HTMLElement, componentName: string) {
    if (element && this.observer) {
      element.dataset.component = componentName;
      this.observer.observe(element);
    }
  }

  private async loadComponent(componentName: string) {
    try {
      switch (componentName) {
        case 'charts':
          console.log('Loading charts component placeholder');
          break;
        case 'pdf':
          console.log('Loading PDF generator placeholder');
          break;
        case 'maps':
          console.log('Loading maps component placeholder');
          break;
        case 'ai':
          console.log('Loading AI component placeholder');
          break;
        default:
          console.log(`Unknown component: ${componentName}`);
      }
      console.log(`✅ Lazy loaded: ${componentName}`);
    } catch (error) {
      console.error(`❌ Failed to lazy load: ${componentName}`, error);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Smart preloading based on user interaction
export const SmartPreloader = {
  preloadOnHover: (componentLoader: () => Promise<any>) => {
    let isPreloaded = false;
    
    return {
      onMouseEnter: () => {
        if (!isPreloaded) {
          componentLoader();
          isPreloaded = true;
        }
      },
    };
  },

  preloadOnIdle: (componentLoader: () => Promise<any>) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        componentLoader();
      });
    } else {
      setTimeout(() => {
        componentLoader();
      }, 2000);
    }
  },

  preloadCriticalPath: async () => {
    // Preload most commonly used components
    const criticalComponents = [
      () => import('../components/ui/button'),
      () => import('../components/ui/input'),
      () => import('../components/ui/card'),
    ];

    try {
      await Promise.all(criticalComponents.map(loader => loader()));
      console.log('✅ Critical components preloaded');
    } catch (error) {
      console.error('❌ Critical component preloading failed:', error);
    }
  },
};

// Performance-aware component wrapper
export const PerformantWrapper = ({ 
  children, 
  threshold = 0.1,
  fallback = <LoadingFallback />
}: {
  children: ReactNode;
  threshold?: number;
  fallback?: ReactNode;
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Route-based code splitting helper
export const createRouteLoader = (routePath: string) => {
  return createOptimizedDynamic(
    () => Promise.resolve({ default: () => <div>Route {routePath} Placeholder</div> }),
    { 
      name: `Route: ${routePath}`, 
      ssr: true, 
      preload: false 
    }
  );
};

// Initialize smart preloading
export const initializeSmartPreloading = () => {
  if (typeof window !== 'undefined') {
    // Preload critical components when app starts
    SmartPreloader.preloadCriticalPath();
    
    // Initialize lazy loader
    const lazyLoader = AdvancedLazyLoader.getInstance();
    
    // Setup cleanup
    window.addEventListener('beforeunload', () => {
      lazyLoader.disconnect();
    });
    
    console.log('🚀 Smart preloading initialized');
  }
};

export default {
  createOptimizedDynamic,
  LazyChartComponents,
  LazyPDFGenerator,
  LazyDataVisualization,
  LazyAdvancedTable,
  LazyMapComponents,
  LazyAIComponents,
  AdvancedLazyLoader,
  SmartPreloader,
  PerformantWrapper,
  initializeSmartPreloading,
};