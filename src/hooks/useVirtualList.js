/**
 * Virtual List Hook
 * Provides virtual scrolling for large lists to improve performance
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const useVirtualList = (items, itemHeight, containerHeight = 600) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 2
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    containerRef,
    visibleItems,
    offsetY,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  };
};

