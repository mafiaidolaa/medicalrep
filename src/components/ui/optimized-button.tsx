"use client";

import * as React from "react";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface OptimizedButtonProps extends ButtonProps {
  debounceMs?: number;
  preventDoubleClick?: boolean;
  loading?: boolean;
  loadingText?: string;
}

// Debounce hook for performance
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const callbackRef = React.useRef(callback);

  React.useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

// Throttle hook for rate limiting
function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = React.useRef<number>(0);
  const callbackRef = React.useRef(callback);

  React.useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        lastRunRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [delay]
  );
}

// Memoized button component with performance optimizations
export const OptimizedButton = React.memo(
  React.forwardRef<HTMLButtonElement, OptimizedButtonProps>(
    (
      {
        className,
        children,
        onClick,
        disabled,
        debounceMs = 0,
        preventDoubleClick = true,
        loading = false,
        loadingText = "Processing...",
        ...props
      },
      ref
    ) => {
      const [isProcessing, setIsProcessing] = React.useState(false);
      const processingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

      // Use throttle for immediate feedback with rate limiting
      const throttledClick = useThrottle(
        React.useCallback(
          async (event: React.MouseEvent<HTMLButtonElement>) => {
            if (isProcessing || disabled || loading) return;

            // Set processing state for double-click prevention
            if (preventDoubleClick) {
              setIsProcessing(true);
              
              // Clear any existing timeout
              if (processingTimeoutRef.current) {
                clearTimeout(processingTimeoutRef.current);
              }

              // Reset processing state after a short delay
              processingTimeoutRef.current = setTimeout(() => {
                setIsProcessing(false);
              }, 300);
            }

            // Use requestAnimationFrame for smooth UI updates
            requestAnimationFrame(() => {
              if (onClick) {
                onClick(event);
              }
            });
          },
          [onClick, isProcessing, disabled, loading, preventDoubleClick]
        ),
        debounceMs || 100 // Default 100ms throttle
      );

      // Cleanup timeout on unmount
      React.useEffect(() => {
        return () => {
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
          }
        };
      }, []);

      // Optimize re-renders with memoized props
      const isDisabled = disabled || loading || isProcessing;
      const displayChildren = loading ? loadingText : children;

      return (
        <Button
          ref={ref}
          className={cn(
            className,
            isProcessing && "opacity-70 cursor-wait",
            loading && "cursor-wait"
          )}
          disabled={isDisabled}
          onClick={throttledClick}
          {...props}
        >
          {loading && (
            <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
          )}
          {displayChildren}
        </Button>
      );
    }
  )
);

OptimizedButton.displayName = "OptimizedButton";

// Export a higher-order component for easy migration
export function withOptimizedButton<P extends ButtonProps>(
  Component: React.ComponentType<P>
): React.FC<P & OptimizedButtonProps> {
  const Wrapped: React.FC<P & OptimizedButtonProps> = (props) => {
    return <OptimizedButton {...props} />;
  };
  Wrapped.displayName = `withOptimizedButton(${Component.displayName || Component.name || 'Component'})`;
  return React.memo(Wrapped);
}
