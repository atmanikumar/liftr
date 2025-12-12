import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { hapticMedium, isNative } from '@/lib/nativeFeatures';

/**
 * Pull-to-refresh component
 * @param {function} onRefresh - Async function to call when refreshing
 * @param {ReactNode} children - Content to wrap
 * @param {boolean} enabled - Whether pull-to-refresh is enabled
 */
export default function PullToRefresh({ children, onRefresh, enabled = true }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const containerRef = useRef(null);
  const threshold = 80; // Distance to trigger refresh
  const maxPull = 120; // Maximum pull distance

  const handleTouchStart = useCallback((e) => {
    if (!enabled || refreshing) return;
    
    // Only allow pull-to-refresh when at top of page AND not scrolling
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [enabled, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || refreshing || !isPulling) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Only allow pulling down (positive diff) when at top of page
    if (diff > 0 && scrollTop === 0) {
      // Prevent default scroll behavior
      e.preventDefault();
      
      // Apply resistance curve (gets harder to pull as you go further)
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPull);
      setPullDistance(distance);
      
      // Haptic feedback when reaching threshold
      if (distance >= threshold && pullDistance < threshold) {
        hapticMedium();
      }
    } else {
      // Not at top or pulling up - reset
      if (diff < 0 || scrollTop > 0) {
        setIsPulling(false);
        setPullDistance(0);
      }
    }
  }, [enabled, refreshing, isPulling, pullDistance, maxPull, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || refreshing || !isPulling) return;
    
    setIsPulling(false);
    
    // Trigger refresh if pulled past threshold
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold); // Keep indicator visible
      
      try {
        await onRefresh();
        hapticMedium(); // Success feedback
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Snap back if not pulled enough
      setPullDistance(0);
    }
  }, [enabled, refreshing, isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorScale = Math.min(pullDistance / threshold, 1);
  const isActive = pullDistance >= threshold;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        // Don't restrict touch actions - let native scrolling work
      }}
    >
      {/* Pull-to-refresh indicator */}
      <Box
        sx={{
          position: 'fixed',
          top: `calc(70px + ${pullDistance}px)`, // Below navbar (70px) + pull distance
          left: '50%',
          transform: `translateX(-50%) translateY(-100%) scale(${indicatorScale})`,
          opacity: indicatorOpacity,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          py: 1.5,
          px: 3,
          bgcolor: 'rgba(0, 0, 0, 0.9)',
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(196, 255, 13, 0.2)',
          boxShadow: isActive 
            ? '0 4px 20px rgba(196, 255, 13, 0.3)'
            : '0 2px 10px rgba(0, 0, 0, 0.5)',
          transition: 'box-shadow 0.3s ease, opacity 0.2s ease, transform 0.2s ease',
          zIndex: 9999, // Above everything including navbar
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: isActive ? '#10b981' : 'rgba(196, 255, 13, 0.5)',
            borderTopColor: 'transparent',
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: isActive ? '#10b981' : 'rgba(255, 255, 255, 0.7)',
            fontWeight: isActive ? 600 : 400,
            transition: 'color 0.3s ease, font-weight 0.3s ease',
          }}
        >
          {refreshing ? 'Refreshing...' : isActive ? 'Release to refresh' : 'Pull to refresh'}
        </Typography>
      </Box>

      {/* Content */}
      <Box
        sx={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/**
 * Simple refresh indicator (for pages that don't need pull-to-refresh)
 */
export function RefreshIndicator({ refreshing }) {
  if (!refreshing) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 3,
        bgcolor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(196, 255, 13, 0.2)',
        boxShadow: '0 4px 20px rgba(196, 255, 13, 0.3)',
        zIndex: 1000,
      }}
    >
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '2px solid #10b981',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />
      <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
        Refreshing...
      </Typography>
    </Box>
  );
}
