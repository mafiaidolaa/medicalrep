"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SmartNavigationProviderProps {
  children: React.ReactNode;
}

// Hook for intelligent page prefetching
export function useSmartPrefetch() {
  const router = useRouter();
  const pathname = usePathname();
  const prefetchedPages = useRef(new Set<string>());
  const prefetchTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  const prefetchPage = (href: string, delay = 200) => {
    // Don't prefetch current page or already prefetched pages
    if (href === pathname || prefetchedPages.current.has(href)) {
      return;
    }

    // Clear any existing timeout for this page
    const existingTimeout = prefetchTimeouts.current.get(href);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new timeout for prefetching
    const timeout = setTimeout(() => {
      try {
        router.prefetch(href);
        prefetchedPages.current.add(href);
        prefetchTimeouts.current.delete(href);
      } catch (error) {
        console.debug('Prefetch failed for:', href, error);
      }
    }, delay);

    prefetchTimeouts.current.set(href, timeout);
  };

  const cancelPrefetch = (href: string) => {
    const timeout = prefetchTimeouts.current.get(href);
    if (timeout) {
      clearTimeout(timeout);
      prefetchTimeouts.current.delete(href);
    }
  };

  const preloadCriticalPages = () => {
    const criticalPages = [
      '/settings',
      '/',
      '/clinics',
      '/visits',
      '/users'
    ];

    criticalPages.forEach((page, index) => {
      if (page !== pathname) {
        // Stagger prefetching to avoid overwhelming the network
        setTimeout(() => prefetchPage(page, 0), index * 100);
      }
    });
  };

  useEffect(() => {
    // Preload critical pages after a short delay
    const timer = setTimeout(preloadCriticalPages, 1000);
    
    return () => {
      clearTimeout(timer);
      // Clear all pending prefetch timeouts
      prefetchTimeouts.current.forEach(timeout => clearTimeout(timeout));
      prefetchTimeouts.current.clear();
    };
  }, [pathname]);

  return {
    prefetchPage,
    cancelPrefetch
  };
}

// Enhanced navigation provider with performance optimizations
export function SmartNavigationProvider({ children }: SmartNavigationProviderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { prefetchPage } = useSmartPrefetch();

  useEffect(() => {
    // Detect when the page becomes visible/hidden to pause prefetching
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    // Add global hover listener for intelligent prefetching
    if (!isVisible) return;

    const handleLinkHover = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const href = new URL(link.href).pathname;
        prefetchPage(href);
      }
    };

    document.addEventListener('mouseover', handleLinkHover);
    document.addEventListener('focusin', handleLinkHover);

    return () => {
      document.removeEventListener('mouseover', handleLinkHover);
      document.removeEventListener('focusin', handleLinkHover);
    };
  }, [isVisible, prefetchPage]);

  return <>{children}</>;
}