/**
 * Virtual List Component
 * Renders large lists efficiently using virtualization
 */

'use client';

import { Box } from '@mui/material';
import { useVirtualList } from '@/hooks/useVirtualList';

export default function VirtualList({ 
  items, 
  itemHeight = 120, 
  containerHeight = 600, 
  renderItem,
  gap = 16,
}) {
  const {
    containerRef,
    visibleItems,
    offsetY,
    totalHeight,
    handleScroll,
    startIndex,
  } = useVirtualList(items, itemHeight + gap, containerHeight);

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
        willChange: 'scroll-position', // Performance hint
      }}
    >
      {/* Spacer for total height */}
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <Box
          sx={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <Box
              key={startIndex + index}
              sx={{
                height: itemHeight,
                marginBottom: `${gap}px`,
              }}
            >
              {renderItem(item, startIndex + index)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

