"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

// Custom virtualized list without external dependencies
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
  overscan = 3,
  onScroll,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const scrollElementRef = React.useRef<HTMLDivElement>(null);
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );
  
  const visibleItems = React.useMemo(() => {
    const visible = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visible.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }
    return visible;
  }, [startIndex, endIndex, items, itemHeight]);

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={cn("relative overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Optimized table virtualization component
interface VirtualizedTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    width?: number | string;
  }[];
  height?: number;
  rowHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
}

export const VirtualizedTable = React.memo(function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  rowHeight = 48,
  className,
  onRowClick,
}: VirtualizedTableProps<T>) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  
  const handleRowClick = React.useCallback(
    (item: T, index: number) => {
      // Use requestAnimationFrame for smooth interaction
      requestAnimationFrame(() => {
        onRowClick?.(item, index);
      });
    },
    [onRowClick]
  );

  const renderRow = React.useCallback(
    (item: T, index: number) => (
      <div
        className={cn(
          "flex items-center border-b transition-colors",
          hoveredIndex === index && "bg-muted/50",
          onRowClick && "cursor-pointer"
        )}
        style={{ height: rowHeight }}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => handleRowClick(item, index)}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="px-4 py-2 truncate"
            style={{ width: col.width || `${100 / columns.length}%` }}
          >
            {col.render ? col.render(item) : item[col.key]}
          </div>
        ))}
      </div>
    ),
    [columns, hoveredIndex, rowHeight, handleRowClick, onRowClick]
  );

  return (
    <div className={cn("border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center border-b bg-muted/30 font-medium">
        {columns.map((col) => (
          <div
            key={col.key}
            className="px-4 py-3"
            style={{ width: col.width || `${100 / columns.length}%` }}
          >
            {col.header}
          </div>
        ))}
      </div>
      
      {/* Virtualized body */}
      <VirtualizedList
        items={data}
        height={height}
        itemHeight={rowHeight}
        renderItem={renderRow}
      />
    </div>
  );
});

// Export a hook for intersection observer based lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

// Lazy load component wrapper
export const LazyLoadWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
}> = React.memo(({ children, className, placeholder }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder || <div className="h-20 animate-pulse bg-muted" />}
    </div>
  );
});