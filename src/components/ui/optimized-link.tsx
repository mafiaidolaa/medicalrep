"use client";

import Link from 'next/link';
import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  locale?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
}

export function OptimizedLink({ 
  href, 
  children, 
  className,
  prefetch = true,
  onClick,
  onMouseEnter,
  ...props 
}: OptimizedLinkProps) {
  const router = useRouter();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Clear any existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
    
    // Prefetch after a short delay to avoid unnecessary requests
    prefetchTimeoutRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 100);
    
    onMouseEnter?.(e);
  }, [href, router, onMouseEnter]);
  
  const handleMouseLeave = useCallback(() => {
    // Clear prefetch timeout if user leaves before delay
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
  }, []);
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Clear any pending prefetch
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
    
    onClick?.(e);
  }, [onClick]);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}