// Virtual scrolling component for efficient rendering of large lists

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMemoryManager, useResizeObserver } from '@/utils/memory-manager';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

interface VirtualizedItem {
  index: number;
  top: number;
  height: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { createManagedEventListener } = useMemoryManager();

  // Calculate item positions
  const itemPositions = useMemo(() => {
    const positions: VirtualizedItem[] = [];
    let currentTop = 0;

    for (let i = 0; i < items.length; i++) {
      const height = typeof itemHeight === 'function' ? itemHeight(i, items[i]) : itemHeight;
      positions.push({
        index: i,
        top: currentTop,
        height
      });
      currentTop += height;
    }

    return positions;
  }, [items, itemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return itemPositions.length > 0 
      ? itemPositions[itemPositions.length - 1].top + itemPositions[itemPositions.length - 1].height
      : 0;
  }, [itemPositions]);

  // Find visible range
  const visibleRange = useMemo(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    let startIndex = 0;
    let endIndex = itemPositions.length - 1;

    // Binary search for start index
    let left = 0;
    let right = itemPositions.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const item = itemPositions[mid];
      if (item.top + item.height <= viewportTop) {
        left = mid + 1;
      } else {
        right = mid - 1;
        startIndex = mid;
      }
    }

    // Binary search for end index
    left = startIndex;
    right = itemPositions.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const item = itemPositions[mid];
      if (item.top < viewportBottom) {
        left = mid + 1;
        endIndex = mid;
      } else {
        right = mid - 1;
      }
    }

    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(itemPositions.length - 1, endIndex + overscan);

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemPositions, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const position = itemPositions[i];
      if (position && items[i]) {
        result.push({
          item: items[i],
          index: i,
          style: {
            position: 'absolute' as const,
            top: position.top,
            left: 0,
            right: 0,
            height: position.height,
          }
        });
      }
    }
    return result;
  }, [visibleRange, itemPositions, items]);

  // Handle scroll
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    return createManagedEventListener(container, 'scroll', handleScroll, { passive: true });
  }, [createManagedEventListener, handleScroll]);

  // Handle container resize
  useResizeObserver(containerRef, useCallback(() => {
    // Recalculate visible items on resize
    setScrollTop(prev => prev);
  }, []));

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems.map(({ item, index, style }) => {
          const key = getItemKey ? getItemKey(item, index) : index;
          return (
            <div key={key} style={style}>
              {renderItem(item, index, style)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoized version for better performance
export const MemoizedVirtualList = React.memo(VirtualList) as typeof VirtualList;

// Hook for virtual list state management
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const itemPositions = useMemo(() => {
    const positions: VirtualizedItem[] = [];
    let currentTop = 0;

    for (let i = 0; i < items.length; i++) {
      const height = typeof itemHeight === 'function' ? itemHeight(i, items[i]) : itemHeight;
      positions.push({
        index: i,
        top: currentTop,
        height
      });
      currentTop += height;
    }

    return positions;
  }, [items, itemHeight]);

  const totalHeight = useMemo(() => {
    return itemPositions.length > 0 
      ? itemPositions[itemPositions.length - 1].top + itemPositions[itemPositions.length - 1].height
      : 0;
  }, [itemPositions]);

  const visibleRange = useMemo(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    let startIndex = 0;
    let endIndex = itemPositions.length - 1;

    // Find visible range using binary search
    for (let i = 0; i < itemPositions.length; i++) {
      const item = itemPositions[i];
      if (item.top + item.height > viewportTop && startIndex === 0) {
        startIndex = i;
      }
      if (item.top < viewportBottom) {
        endIndex = i;
      }
    }

    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(itemPositions.length - 1, endIndex + overscan);

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemPositions, overscan]);

  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (index < 0 || index >= itemPositions.length) return;

    const item = itemPositions[index];
    let targetScrollTop = item.top;

    if (align === 'center') {
      targetScrollTop = item.top - (containerHeight - item.height) / 2;
    } else if (align === 'end') {
      targetScrollTop = item.top - containerHeight + item.height;
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));
    setScrollTop(targetScrollTop);
  }, [itemPositions, containerHeight, totalHeight]);

  return {
    scrollTop,
    setScrollTop,
    itemPositions,
    totalHeight,
    visibleRange,
    scrollToIndex
  };
}

export default MemoizedVirtualList;